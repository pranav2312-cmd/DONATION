// Privacy-Preserving Midnight Donation Contract Witnesses
import { Ledger } from "./managed/donation/contract/index.js";
import { WitnessContext } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";

export type DonationPrivateState = {
  readonly secretKey: Uint8Array;
};

export const createDonationPrivateState = (secretKey: Uint8Array) => ({
  secretKey,
});

export const witnesses = {
  localDonorSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, DonationPrivateState>): [
    DonationPrivateState,
    Uint8Array,
  ] => [privateState, privateState.secretKey],
};
