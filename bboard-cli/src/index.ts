// Privacy-Preserving Midnight Donation CLI Entry Point
import { createInterface, type Interface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { WebSocket } from 'ws';
import {
  DonationAPI,
  type DonationDerivedState,
  donationPrivateStateKey,
  type DonationProviders,
  type DeployedDonationContract,
  type PrivateStateId,
} from '../../api/src/index';
import { type WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { ledger, type Ledger, CampaignState } from '../../contract/src/managed/donation/contract/index.js';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { type Logger } from 'pino';
import { type Config, StandaloneConfig } from './config.js';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { TestEnvironment } from '@midnight-ntwrk/testkit-js';
import { MidnightWalletProvider } from './midnight-wallet-provider';
import { randomBytes } from '../../api/src/utils';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { syncWallet, waitForUnshieldedFunds } from './wallet-utils';
import { generateDust } from './generate-dust';
import { DonationPrivateState } from '../../contract/src/witnesses.js';

// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

export const getDonationLedgerState = async (
  providers: DonationProviders,
  contractAddress: ContractAddress,
): Promise<Ledger | null> => {
  assertIsContractAddress(contractAddress);
  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  return contractState != null ? ledger(contractState.data) : null;
};

const DEPLOY_OR_JOIN_QUESTION = `
You can do one of the following:
  1. Deploy a new donation campaign contract
  2. Join an existing donation campaign contract
  3. Exit
Which would you like to do? `;

const deployOrJoin = async (providers: DonationProviders, rli: Interface, logger: Logger): Promise<DonationAPI | null> => {
  let api: DonationAPI | null = null;

  while (true) {
    const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
    switch (choice) {
      case '1': {
        const title = (await rli.question('Enter campaign title (default: Midnight Community Privacy Fund): ')) || 'Midnight Community Privacy Fund';
        const goalStr = await rli.question('Enter campaign funding goal (default: 1000000): ');
        const goal = goalStr ? BigInt(goalStr) : BigInt(1000000);
        api = await DonationAPI.deploy(providers, title, goal, logger);
        logger.info(`Deployed donation contract at address: ${api.deployedContractAddress}`);
        return api;
      }
      case '2':
        api = await DonationAPI.join(providers, await rli.question('What is the contract address (in hex)? '), logger);
        logger.info(`Joined donation contract at address: ${api.deployedContractAddress}`);
        return api;
      case '3':
        logger.info('Exiting...');
        return null;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

const displayLedgerState = async (
  providers: DonationProviders,
  deployedDonationContract: DeployedDonationContract,
  logger: Logger,
): Promise<void> => {
  const contractAddress = deployedDonationContract.deployTxData.public.contractAddress;
  const ledgerState = await getDonationLedgerState(providers, contractAddress);
  if (ledgerState === null) {
    logger.info(`There is no donation contract deployed at ${contractAddress}`);
  } else {
    const campaignStatus = ledgerState.state === CampaignState.COMPLETED ? 'COMPLETED' : 'ACTIVE';
    logger.info(`Campaign Title: '${ledgerState.campaignTitle}'`);
    logger.info(`Campaign Status: ${campaignStatus}`);
    logger.info(`Funding Goal: ${ledgerState.campaignGoal}`);
    logger.info(`Total Donated: ${ledgerState.totalDonated}`);
    logger.info(`Donation Count: ${ledgerState.donationCount}`);
    logger.info(`Last Commitment: '${toHex(ledgerState.lastDonationCommitment)}'`);
  }
};

const displayPrivateState = async (providers: DonationProviders, logger: Logger): Promise<void> => {
  const privateState = await providers.privateStateProvider.get(donationPrivateStateKey);
  if (privateState === null) {
    logger.info(`There is no existing donor private state`);
  } else {
    logger.info(`Donor Secret Key: ${toHex(privateState.secretKey)}`);
  }
};

const displayDerivedState = (ledgerState: DonationDerivedState | undefined, logger: Logger) => {
  if (ledgerState === undefined) {
    logger.info(`No donation campaign state currently available`);
  } else {
    const campaignStatus = ledgerState.state === CampaignState.COMPLETED ? 'COMPLETED' : 'ACTIVE';
    logger.info(`Campaign Title: '${ledgerState.campaignTitle}'`);
    logger.info(`Campaign Status: ${campaignStatus}`);
    logger.info(`Funding Goal: ${ledgerState.campaignGoal}`);
    logger.info(`Total Donated: ${ledgerState.totalDonated}`);
    logger.info(`Donation Count: ${ledgerState.donationCount}`);
    logger.info(`Last Commitment: '${ledgerState.lastDonationCommitment}'`);
  }
};

const MAIN_LOOP_QUESTION = `
You can do one of the following:
  1. Make a private donation
  2. Display the current ledger state (public on-chain data)
  3. Display the current donor private state (known only to this client)
  4. Display the current derived campaign state
  5. Exit
Which would you like to do? `;

const mainLoop = async (providers: DonationProviders, rli: Interface, logger: Logger): Promise<void> => {
  const donationApi = await deployOrJoin(providers, rli, logger);
  if (donationApi === null) {
    return;
  }
  let currentState: DonationDerivedState | undefined;
  const stateObserver = {
    next: (state: DonationDerivedState) => (currentState = state),
  };
  const subscription = donationApi.state$.subscribe(stateObserver);
  try {
    while (true) {
      const choice = await rli.question(MAIN_LOOP_QUESTION);
      try {
        switch (choice) {
          case '1': {
            const amountStr = await rli.question(`How much would you like to donate? `);
            const amount = BigInt(amountStr || '10');
            const note = await rli.question(`Optional private note/memo: `);
            const noteCommitment = randomBytes(32);
            await donationApi.donate(amount, noteCommitment);
            logger.info(`Successfully processed anonymous donation of ${amount} with private note memo!`);
            break;
          }
          case '2':
            await displayLedgerState(providers, donationApi.deployedContract, logger);
            break;
          case '3':
            await displayPrivateState(providers, logger);
            break;
          case '4':
            displayDerivedState(currentState, logger);
            break;
          case '5':
            logger.info('Exiting...');
            return;
          default:
            logger.error(`Invalid choice: ${choice}`);
        }
      } catch (e) {
        logError(logger, e);
        logger.info('Returning to main menu...');
      }
    }
  } finally {
    subscription.unsubscribe();
  }
};

const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

const WALLET_LOOP_QUESTION = `
You can do one of the following:
  1. Build a fresh wallet
  2. Build wallet from a seed
  3. Exit
Which would you like to do? `;

const buildWallet = async (config: Config, rli: Interface, logger: Logger): Promise<string | undefined> => {
  if (config instanceof StandaloneConfig) {
    return GENESIS_MINT_WALLET_SEED;
  }
  while (true) {
    const choice = await rli.question(WALLET_LOOP_QUESTION);
    switch (choice) {
      case '1':
        return toHex(randomBytes(32));
      case '2':
        return await rli.question('Enter your wallet seed: ');
      case '3':
        logger.info('Exiting...');
        return undefined;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

export const run = async (config: Config, testEnv: TestEnvironment, logger: Logger): Promise<void> => {
  const rli = createInterface({ input, output, terminal: true });
  const providersToBeStopped: MidnightWalletProvider[] = [];
  try {
    const envConfiguration = await testEnv.start();
    logger.info(`Environment started with configuration: ${JSON.stringify(envConfiguration)}`);
    const seed = await buildWallet(config, rli, logger);
    if (seed === undefined) {
      return;
    }
    const walletProvider = await MidnightWalletProvider.build(logger, envConfiguration, seed);
    providersToBeStopped.push(walletProvider);
    const walletFacade: WalletFacade = walletProvider.wallet;

    await walletProvider.start();

    const unshieldedState = await waitForUnshieldedFunds(logger, walletFacade, envConfiguration, unshieldedToken());
    const nightBalance = unshieldedState.balances[unshieldedToken().raw];
    if (nightBalance === undefined) {
      logger.info('No funds received, exiting...');
      return;
    }
    logger.info(`Your NIGHT wallet balance is: ${nightBalance}`);

    if (config.generateDust) {
      const dustGeneration = await generateDust(logger, seed, unshieldedState, walletFacade);
      if (dustGeneration) {
        logger.info(`Submitted dust generation registration transaction: ${dustGeneration}`);
        await syncWallet(logger, walletFacade);
      }
    }

    const zkConfigProvider = new NodeZkConfigProvider<'donate'>(config.zkConfigPath);
    const providers: DonationProviders = {
      privateStateProvider: levelPrivateStateProvider<PrivateStateId, DonationPrivateState>({
        privateStateStoreName: config.privateStateStoreName,
        signingKeyStoreName: `${config.privateStateStoreName}-signing-keys`,
        privateStoragePasswordProvider: () => {
          return 'Donation-Test-2026!';
        },
        accountId: seed,
      }),
      publicDataProvider: indexerPublicDataProvider(envConfiguration.indexer, envConfiguration.indexerWS),
      zkConfigProvider: zkConfigProvider,
      proofProvider: httpClientProofProvider(envConfiguration.proofServer, zkConfigProvider),
      walletProvider: walletProvider,
      midnightProvider: walletProvider,
    };
    await mainLoop(providers, rli, logger);
  } catch (e) {
    logError(logger, e);
    logger.info('Exiting...');
  } finally {
    try {
      rli.close();
      rli.removeAllListeners();
    } catch (e) {
      logError(logger, e);
    } finally {
      try {
        for (const wallet of providersToBeStopped) {
          logger.info('Stopping wallet...');
          await wallet.stop();
        }
        if (testEnv) {
          logger.info('Stopping test environment...');
          await testEnv.shutdown();
        }
      } catch (e) {
        logError(logger, e);
      }
    }
  }
};

function logError(logger: Logger, e: unknown) {
  if (e instanceof Error) {
    logger.error(`Found error '${e.message}'`);
    logger.debug(`${e.stack}`);
  } else {
    logger.error(`Found error (unknown type)`);
  }
}
