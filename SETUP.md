# PayStream Local Setup Guide

Welcome to the local development setup for PayStream. This guide covers how to deploy the Stacks smart contracts to the testnet, configure your environment variables, and run all services securely.

---

## 1. Prerequisites

Before you start, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/)
- [Clarinet](https://docs.hiro.so/clarinet/getting-started) (Required for contract deployment)
- A Stacks Wallet (e.g., [Leather](https://leather.io/) or [Xverse](https://www.xverse.app/)) configured to the **Testnet**.

---

## 2. Environment Variables Checkout

PayStream uses a unified `.env.local` file at the root of the project to feed the core packages and workspaces. 

Start by copying the example file:
```bash
cp .env.example .env.local
```

### Required Configuration in `.env.local`

Open `.env.local` and define the following core parameters:

1. **`AGENT_PRIVATE_KEY` & `AGENT_STX_ADDRESS`**
   - This sets up the autonomous AgentWallet. You must provide a valid **testnet private key** (in hex format) and its matching STX address.
   - *Never use a mainnet key.* Ensure the account has testnet STX from the [Hiro Faucet](https://explorer.hiro.so/sandbox/faucet?chain=testnet).

2. **`MERCHANT_ADDRESS`**
   - The STX address that will receive protocol fees and direct STX payments for the demo API.

3. **`DEPLOYER_MNEMONIC`**
   - To deploy the smart contracts, you must add a 24-word secret phrase of a testnet wallet to the bottom of your `.env.local`:
   ```env
   DEPLOYER_MNEMONIC="word1 word2 word3 ... word24"
   ```
   - This account **must have testnet STX** to pay for the deployment fees.

---

## 3. Deploying Smart Contracts (Testnet)

PayStream requires the `paystream-vault`, `paystream-escrow`, and `paystream-registry` contracts to be deployed on-chain so the Facilitator can broadcast settlements.

Run the automated deployment script:
```bash
pnpm run deploy:contracts
```
*(This triggers `scripts/deploy-contracts.sh`)*

**What happens?**
1. Clarinet reads `DEPLOYER_MNEMONIC`.
2. It deploys all three contracts successively to the Stacks Testnet.
3. **Automated linking:** Once successful, the script automatically parses the new contract addresses and appends `VAULT_CONTRACT`, `ESCROW_CONTRACT`, and `REGISTRY_CONTRACT` directly into your `.env.local` file. 

You do not need to manually configure the contract addresses; the script handles it!

---

## 4. Testnet Token Addresses (sBTC & USDCx)

The payload builder needs to know the correct addresses for supported tokens. In `packages/core/src/constants.ts`, the standard testnet addresses for Sip-010 tokens are hardcoded for convenience:

- **sBTC:** `SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token`
- **USDCx (Mock USDC):** `SP3Y2ZSH8P7D50B0VBTSX11S7XSG24M1VB9YFQA4K.token-usdcx`

If you deploy your own mock tokens, update these corresponding values in `.env.local`:
```env
SBTC_CONTRACT_ADDRESS=...
USDC_CONTRACT_ADDRESS=...
```

---

## 5. Building & Running the Ecosystem

Because PayStream relies on internal pnpm workspaces (like `@devvmichael/paystream-core`), you must build the packages first before launching the development servers.

```bash
# 1. Install all dependencies
pnpm install

# 2. Build the core, server, and client SDK packages
pnpm run build:packages

# 3. Launch the full ecosystem
pnpm run dev:all
```

**What `dev:all` starts:**
- `localhost:3000` — The Landing Page & AI Showcase
- `localhost:3001` — The User Dashboard
- `localhost:3402` — The Demo Express Server (API)
- `localhost:3403` — The PayStream Facilitator (Webhooks & Settlement)

---

## 6. Verification

To prove everything works locally:
1. Ensure your `demo-server` is running.
2. Go to `http://localhost:3000/showcase`.
3. Input a funded testnet private key and request data. 
4. Check your terminal running the `facilitator`; you should see it receive the payload, verify the signatures against your `.env.local` configuration, and dispatch the smart contract call to the Stacks testnet.
