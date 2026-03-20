/**
 * @devvmichael/paystream-client — Stacks transaction signer
 *
 * Builds and signs real Stacks transactions for x402 payments.
 * Supports STX transfers, and SIP-010 contract calls for sBTC/USDCx.
 *
 * Production implementation using @stacks/transactions.
 */
import {
  makeSTXTokenTransfer,
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  standardPrincipalCV,
  uintCV,
  type StacksTransaction,
} from "@stacks/transactions";
import { StacksMainnet, StacksTestnet } from "@stacks/network";
import { STACKS_API_URLS, TOKEN_CONTRACTS } from "@devvmichael/paystream-core";
import type { PaymentPayload, TokenSymbol } from "@devvmichael/paystream-core";
import { webcrypto as crypto } from "node:crypto";

export interface SignerConfig {
  privateKey: string;
  network: "mainnet" | "testnet";
}

/**
 * Build and sign a Stacks transaction for an x402 payment.
 *
 * For STX: creates a STXTokenTransfer
 * For SIP-010 tokens (sBTC, USDCx): creates a contract-call to `transfer`
 */
export async function buildPaymentTransaction(
  token: TokenSymbol,
  amount: string,
  recipient: string,
  config: SignerConfig,
): Promise<{ serializedTx: string; txId: string }> {
  const network =
    config.network === "testnet" ? new StacksTestnet() : new StacksMainnet();

  let tx: StacksTransaction;

  try {
    if (token === "STX") {
      // Native STX transfer
      tx = await makeSTXTokenTransfer({
        recipient,
        amount: BigInt(amount),
        senderKey: config.privateKey,
        network,
        anchorMode: AnchorMode.Any,
        memo: "x402-payment",
      });
    } else {
      // SIP-010 token transfer (sBTC or USDCx)
      const contract = TOKEN_CONTRACTS[token];
      if (!contract) {
        throw new Error(`No contract found for token: ${token}`);
      }

      const { getAddressFromPrivateKey, TransactionVersion } = await import("@stacks/transactions");
      const version = config.network === "testnet" ? TransactionVersion.Testnet : TransactionVersion.Mainnet;
      const senderAddress = getAddressFromPrivateKey(config.privateKey, version);

      tx = await makeContractCall({
        contractAddress: contract.address,
        contractName: contract.name,
        functionName: "transfer",
        functionArgs: [
          uintCV(BigInt(amount)),
          standardPrincipalCV(senderAddress),
          standardPrincipalCV(recipient),
          // memo (none)
        ],
        senderKey: config.privateKey,
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
      });
    }
  } catch (err: any) {
    throw new Error(`Failed to build Stacks transaction: ${err.message}`);
  }

  // Serialize to hex for the payment header
  const serializedTx = Buffer.from(tx.serialize()).toString("hex");

  // The txId is the hash of the serialized transaction
  const txId = `0x${Buffer.from(
    await crypto.subtle.digest("SHA-256", Buffer.from(serializedTx, "hex")),
  )
    .toString("hex")
    .slice(0, 64)}`;

  return { serializedTx, txId };
}

/**
 * Broadcast a pre-signed transaction to the Stacks network.
 * Used by the facilitator after verification.
 */
export async function broadcastPayment(
  serializedTx: string,
  network: "mainnet" | "testnet",
): Promise<{ txId: string }> {
  const stacksNetwork =
    network === "testnet" ? new StacksTestnet() : new StacksMainnet();

  const { deserializeTransaction } = await import("@stacks/transactions");
  const tx = deserializeTransaction(Buffer.from(serializedTx, "hex"));

  const result = await broadcastTransaction(tx, stacksNetwork);

  if ("error" in result) {
    throw new Error(`Broadcast failed: ${result.error} — ${result.reason}`);
  }

  return { txId: result.txid };
}
