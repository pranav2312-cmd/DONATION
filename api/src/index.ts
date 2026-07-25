// Privacy-Preserving Midnight Donation API
import * as Donation from '../../contract/src/managed/donation/contract/index.js';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type Logger } from 'pino';
import {
  type DonationDerivedState,
  type DonationContract,
  type DonationProviders,
  type DeployedDonationContract,
  donationPrivateStateKey,
} from './common-types.js';
import { CompiledDonationContractContract } from '../../contract/src/index';
import * as utils from './utils/index.js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { combineLatest, map, tap, from, type Observable } from 'rxjs';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { DonationPrivateState, createDonationPrivateState } from '../../contract/src/witnesses.js';

export interface DeployedDonationAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<DonationDerivedState>;

  donate: (amount: bigint, noteCommitment: Uint8Array) => Promise<void>;
}

export class DonationAPI implements DeployedDonationAPI {
  private constructor(
    public readonly deployedContract: DeployedDonationContract,
    providers: DonationProviders,
    private readonly logger?: Logger,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(this.deployedContractAddress);
    this.state$ = combineLatest(
      [
        providers.publicDataProvider.contractStateObservable(this.deployedContractAddress, { type: 'latest' }).pipe(
          map((contractState) => Donation.ledger(contractState.data)),
          tap((ledgerState) =>
            logger?.trace({
              ledgerStateChanged: {
                ledgerState: {
                  ...ledgerState,
                  state: ledgerState.state === Donation.CampaignState.COMPLETED ? 'completed' : 'active',
                  totalDonated: ledgerState.totalDonated.toString(),
                  donationCount: ledgerState.donationCount.toString(),
                  campaignGoal: ledgerState.campaignGoal.toString(),
                  lastDonationCommitment: toHex(ledgerState.lastDonationCommitment),
                },
              },
            }),
          ),
        ),
        from(providers.privateStateProvider.get(donationPrivateStateKey) as Promise<DonationPrivateState>),
      ],
      (ledgerState, _privateState) => {
        return {
          state: ledgerState.state,
          campaignTitle: ledgerState.campaignTitle,
          campaignGoal: ledgerState.campaignGoal,
          totalDonated: ledgerState.totalDonated,
          donationCount: ledgerState.donationCount,
          lastDonationCommitment: toHex(ledgerState.lastDonationCommitment),
        };
      },
    );
  }

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<DonationDerivedState>;

  async donate(amount: bigint, noteCommitment: Uint8Array): Promise<void> {
    this.logger?.info(`donating: amount=${amount}`);
    const txData = await this.deployedContract.callTx.donate(amount, noteCommitment);
    this.logger?.trace({
      transactionAdded: {
        circuit: 'donate',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  static async deploy(
    providers: DonationProviders,
    title: string = 'Midnight Community Privacy Fund',
    goal: bigint = BigInt(1000000),
    logger?: Logger,
  ): Promise<DonationAPI> {
    logger?.info('deployContract');
    const deployedDonationContract = await deployContract(providers, {
      compiledContract: CompiledDonationContractContract,
      privateStateId: donationPrivateStateKey,
      initialPrivateState: createDonationPrivateState(utils.randomBytes(32)),
      args: [title, goal],
    });

    return new DonationAPI(deployedDonationContract, providers, logger);
  }

  static async join(
    providers: DonationProviders,
    contractAddress: ContractAddress,
    logger?: Logger,
  ): Promise<DonationAPI> {
    logger?.info({ joinContract: { contractAddress } });
    const deployedDonationContract = await findDeployedContract<DonationContract>(providers, {
      contractAddress,
      compiledContract: CompiledDonationContractContract,
      privateStateId: donationPrivateStateKey,
      initialPrivateState: await DonationAPI.getPrivateState(providers, contractAddress),
    });

    return new DonationAPI(deployedDonationContract, providers, logger);
  }

  private static async getPrivateState(
    providers: DonationProviders,
    contractAddress: ContractAddress,
  ): Promise<DonationPrivateState> {
    providers.privateStateProvider.setContractAddress(contractAddress);
    const existingPrivateState = await providers.privateStateProvider.get(donationPrivateStateKey);
    return existingPrivateState ?? createDonationPrivateState(utils.randomBytes(32));
  }
}

export * as utils from './utils/index.js';
export * from './common-types.js';
