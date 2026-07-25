// Privacy-Preserving Midnight Donation Contract Index
import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";

export * from "./managed/donation/contract/index.js";
export * from "./witnesses";

import * as CompiledDonationContract from "./managed/donation/contract/index.js";
import * as Witnesses from "./witnesses";

export const CompiledDonationContractContract = CompiledContract.make<
  CompiledDonationContract.Contract<Witnesses.DonationPrivateState>
>("Donation", CompiledDonationContract.Contract<Witnesses.DonationPrivateState>).pipe(
  CompiledContract.withWitnesses(Witnesses.witnesses),
  CompiledContract.withCompiledFileAssets("./managed/donation"),
);
