# Midnight Privacy-Preserving Donation DApp (Rise In Level 1)

A production-ready full-stack privacy-preserving donation and crowdfunding application built on the **Midnight Network** using the **Compact smart contract language**, ZK circuit proofs, React, Vite, and Midnight JS API.

---

## Contract Address

| Network | Contract Address |
|---------|------------------|
| Preprod | `<YOUR_DEPLOYED_CONTRACT_ADDRESS>` |

Environment variable configuration:

```env
CONTRACT_ADDRESS=<YOUR_DEPLOYED_CONTRACT_ADDRESS>
VITE_CONTRACT_ADDRESS=<YOUR_DEPLOYED_CONTRACT_ADDRESS>
```

---

## Features

- 🛡️ **Zero-Knowledge Donor Anonymity**: Donors generate zero-knowledge proofs locally to contribute without exposing their wallet address, identity, or private keys on-chain.
- 🎯 **Public Campaign Metrics**: Aggregates total raised funds, funding target goals, and donation count publicly on the Midnight ledger.
- 🔒 **Encrypted Private Notes**: Enables donors to attach private note memos verified off-chain through ZK commitments.
- ⚡ **Full-Stack Web Interface**: Modern, responsive dark-mode UI with realtime campaign progress bars, ZK status indicators, and Lace wallet integration.
- 💻 **Interactive CLI**: Dedicated Command Line Interface (`bboard-cli`) for deploying, querying, and interacting with donation campaigns from the terminal.

---

## What This Project Does

This project enables individuals and organizations to create transparent crowdfunding campaigns where supporters can donate freely without compromising their financial privacy. On traditional blockchains, every donation publicly links the donor's address to the campaign. With Midnight and Compact zero-knowledge circuits, the campaign total increases and progress updates publicly, but individual donor identities remain completely hidden and un-linkable.

---

## Privacy Model

### Public Data (Ledger State)
- `totalDonated`: Aggregate total of all funds donated to the campaign.
- `campaignGoal`: Target funding goal specified at deployment.
- `donationCount`: Total counter of donations received.
- `campaignTitle`: Public title of the donation campaign.
- `state`: Status of the campaign (`ACTIVE` or `COMPLETED`).
- `lastDonationCommitment`: Cryptographic commitment hash of the latest donation record.

### Private Data (Witnesses)
- `localDonorSecretKey`: Private key / identity secret of the donor, accessed strictly inside local ZK witness circuits (`localDonorSecretKey()`).
- `donorNoteSecret`: Private memo secret salt generated locally during donation.

### Privacy Guarantees
- No donor wallet address or identity public key is recorded on the public ledger.
- Only a non-linkable ZK commitment hash derived via `disclose()` is published to state.
- Observers can verify that valid donations occurred and that the total raised is accurate without knowing who donated or how much each individual contributed.

---

## Tech Stack

- **Smart Contract**: Compact (`donation.compact`, Language Version 0.23)
- **Blockchain Platform**: Midnight Network (Preprod Testnet)
- **Frontend**: React 19, Vite 8, Material UI (MUI v6), RxJS, TypeScript
- **Client & Integration**: `@midnight-ntwrk/midnight-js-contracts`, `@midnight-ntwrk/dapp-connector-api`, `@midnight-ntwrk/wallet-sdk`
- **Proof Server**: `midnightnetwork/proof-server` (Docker)
- **CLI Driver**: Node.js, `pino`, LevelDB Private State Provider

---

## Folder Structure

```
.
├── api/                  # Shared API layer & contract wrappers
│   ├── src/
│   │   ├── common-types.ts
│   │   ├── index.ts
│   │   └── utils/
│   └── package.json
├── bboard-cli/           # CLI driver for interacting with contracts
│   ├── src/
│   │   ├── config.ts
│   │   ├── index.ts
│   │   └── launcher/
│   └── package.json
├── bboard-ui/            # Web Frontend (React + Vite + MUI)
│   ├── src/
│   │   ├── components/   # UI Cards, Layouts, Progress bars
│   │   ├── config/       # Contract address configuration
│   │   ├── contexts/     # Browser deployed contract manager
│   │   └── App.tsx
│   └── package.json
├── contract/             # Compact contract source & generated ZK assets
│   ├── src/
│   │   ├── donation.compact # Compact smart contract source
│   │   ├── index.ts
│   │   └── witnesses.ts
│   └── package.json
├── package.json          # Monorepo root configuration
└── README.md
```

---

## Prerequisites

Before building or running the project locally, ensure you have installed:

- **Node.js**: v22 or higher (`node -v`)
- **Docker**: Installed and running (`docker info`)
- **Compact Compiler**: `compact` CLI installed globally
  ```bash
  npm install -g @midnight-ntwrk/compact-compiler
  ```
- **Proof Server**:
  ```bash
  docker pull midnightnetwork/proof-server
  docker run -d -p 6300:6300 midnightnetwork/proof-server
  ```

---

## Installation

Install all monorepo dependencies:

```bash
# 1. Install root dependencies
npm install

# 2. Install package-specific dependencies
cd api && npm install && cd ..
cd contract && npm install && cd ..
cd bboard-cli && npm install && cd ..
cd bboard-ui && npm install && cd ..
```

---

## Compile

To compile the Compact contract (`contract/src/donation.compact`):

```bash
npm run compact
```

This invokes `compact compile src/donation.compact ./src/managed/donation` and generates TypeScript bindings and ZK proving keys under `contract/src/managed/donation/`.

---

## Build

To build all workspaces (`contract`, `api`, `bboard-cli`, and `bboard-ui`):

```bash
npm run build
```

---

## Manual Deployment

**Deployment is intentionally skipped in this repository.**

To deploy the Compact smart contract to the Midnight Preprod network manually, execute:

```bash
NODE_OPTIONS="--max-old-space-size=12288" npm run deploy -- --network preprod
```

Or deploy via the CLI interactive prompt:

```bash
cd bboard-cli
npm run preprod-remote
```

---

## After Deployment

Once the deployment script completes:

1. Copy the deployed contract address (64-character hex string).
2. Replace every occurrence of `<YOUR_DEPLOYED_CONTRACT_ADDRESS>` across the project:
   - `README.md`
   - `bboard-ui/src/config/contract.ts`
   - `bboard-ui/.env.preprod`
   - `bboard-ui/.env.preview`

No additional code modifications or re-compilation are required!

---

## Environment Variables

| Variable | Description | Default / Example |
|----------|-------------|-------------------|
| `CONTRACT_ADDRESS` | Deployed Midnight Compact contract address | `<YOUR_DEPLOYED_CONTRACT_ADDRESS>` |
| `VITE_CONTRACT_ADDRESS` | Contract address consumed by Vite web frontend | `<YOUR_DEPLOYED_CONTRACT_ADDRESS>` |
| `VITE_NETWORK_ID` | Midnight network identifier | `preprod` |
| `VITE_LOGGING_LEVEL` | Application logging level | `trace` |

---

## Screenshots

*(Placeholders - Add your application UI screenshots here after deploying and running locally)*

- **Campaign Dashboard & ZK Donation Form**: `![Dashboard Screenshot](./screenshots/dashboard.png)`
- **Lace Wallet ZK Proof Transaction**: `![Transaction Screenshot](./screenshots/transaction.png)`

---

## Initial Idea

*(Placeholder - Detailed description of the initial donation campaign idea and use-case for Rise In submission)*

---

## Troubleshooting

### 1. Proof Server Error
- **Symptom**: `Failed to fetch proof server at http://localhost:6300`
- **Fix**: Ensure Docker container is running:
  ```bash
  docker ps
  docker run -d -p 6300:6300 midnightnetwork/proof-server
  ```

### 2. Node.js Version Incompatibility
- **Symptom**: `Unsupported engine` or module resolution errors.
- **Fix**: Upgrade Node.js to v22+ (`nvm use 24`).

### 3. Compact Compiler Missing
- **Symptom**: `compact: command not found`
- **Fix**: Reinstall the compiler globally:
  ```bash
  npm install -g @midnight-ntwrk/compact-compiler
  ```
