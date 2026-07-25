// Privacy-Preserving Midnight Donation DApp Common Types
import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { CampaignState, DonationPrivateState, Contract, Witnesses } from '../../contract/src/index';

export const donationPrivateStateKey = 'donationPrivateState';
export type PrivateStateId = typeof donationPrivateStateKey;

export type PrivateStates = {
  readonly donationPrivateState: DonationPrivateState;
};

export type DonationContract = Contract<DonationPrivateState, Witnesses<DonationPrivateState>>;
export type DonationCircuitKeys = Exclude<keyof DonationContract['impureCircuits'], number | symbol>;
export type DonationProviders = MidnightProviders<DonationCircuitKeys, PrivateStateId, DonationPrivateState>;
export type DeployedDonationContract = FoundContract<DonationContract>;

export type DonationDerivedState = {
  readonly state: CampaignState;
  readonly campaignTitle: string;
  readonly campaignGoal: bigint;
  readonly totalDonated: bigint;
  readonly donationCount: bigint;
  readonly lastDonationCommitment: string;
};
