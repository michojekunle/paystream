/**
 * @paystream/core — Bitflow DEX Integration
 *
 * Handles cross-token swaps: pay in sBTC, merchant receives USDCx.
 * Calls the real Bitflow Finance API for live quotes.
 * Uses Bitflow SDK contract calls to execute swaps on-chain.
 *
 * Bitflow docs: https://docs.bitflow.finance
 */
import { BITFLOW, TOKEN_METADATA } from "./constants";
import type { SwapQuote, SwapResult, TokenSymbol } from "./types";

/**
 * Get a live swap quote from the Bitflow DEX API.
 *
 * @example
 * const quote = await getBitflowQuote('sBTC', 'USDCx', '100000');
 */
export async function getBitflowQuote(
  fromToken: TokenSymbol,
  toToken: TokenSymbol,
  fromAmount: string,
): Promise<SwapQuote> {
  // Validate pair is supported before hitting the API
  const pairSupported = BITFLOW.PAIRS.some(
    (p) => p.from === fromToken && p.to === toToken,
  );
  if (!pairSupported) {
    throw new Error(
      `Swap pair ${fromToken}→${toToken} not supported by Bitflow`,
    );
  }

  // Real Bitflow API call
  const url = `${BITFLOW.API_HOST}/v1/quote?from=${fromToken}&to=${toToken}&amount=${fromAmount}`;

  let data: {
    outputAmount?: string;
    output_amount?: string;
    rate?: string;
    exchange_rate?: string;
    slippage?: number;
    route?: string[];
    price_impact?: string;
  };

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000), // 8s timeout
    });

    if (!res.ok) {
      throw new Error(`Bitflow API error ${res.status}: ${await res.text()}`);
    }
    data = (await res.json()) as typeof data;
  } catch (err) {
    // If Bitflow API is unreachable, surface a clear error rather than silently returning mock
    throw new Error(
      `Bitflow quote failed for ${fromToken}→${toToken}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const toAmount = data.outputAmount ?? data.output_amount ?? "0";
  const exchangeRate = data.rate ?? data.exchange_rate ?? "0";
  const slippage = data.slippage ?? BITFLOW.DEFAULT_SLIPPAGE;
  const route = data.route ?? [fromToken, toToken];

  return {
    fromToken,
    toToken,
    fromAmount,
    toAmount,
    exchangeRate,
    slippage,
    route,
    estimatedGas: "1000", // ~0.001 STX for contract call
    provider: "bitflow",
  };
}

/**
 * Execute a swap on the Bitflow DEX by calling the Bitflow router contract.
 *
 * This builds and broadcasts a Stacks contract-call transaction to the
 * Bitflow swap router using the provided sender's private key.
 *
 * @example
 * const result = await executeBitflowSwap(quote, senderAddress, privateKey, 'testnet');
 */
export async function executeBitflowSwap(
  quote: SwapQuote,
  senderAddress: string,
  privateKey?: string,
  network: "mainnet" | "testnet" = "testnet",
): Promise<SwapResult> {
  if (!privateKey) {
    throw new Error(
      "executeBitflowSwap requires a privateKey for signing the swap transaction",
    );
  }

  try {
    // Dynamically import @stacks/transactions to keep core tree-shakeable
    const {
      makeContractCall,
      broadcastTransaction,
      AnchorMode,
      PostConditionMode,
      uintCV,
      standardPrincipalCV,
    } = await import("@stacks/transactions");
    const { StacksTestnet, StacksMainnet } = await import("@stacks/network");

    const stacksNetwork =
      network === "testnet" ? new StacksTestnet() : new StacksMainnet();

    // Bitflow router contract (testnet / mainnet)
    const BITFLOW_ROUTER = {
      testnet: {
        address: "STTWD9SPRQVD3P733V89SV0P8RZRZNQADG034F0A",
        name: "bitflow-core",
      },
      mainnet: {
        address: "SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1",
        name: "bitflow-core",
      },
    };

    const router = BITFLOW_ROUTER[network];

    const tx = await makeContractCall({
      contractAddress: router.address,
      contractName: router.name,
      functionName: "swap-helper",
      functionArgs: [
        standardPrincipalCV(senderAddress),
        uintCV(BigInt(quote.fromAmount)),
        uintCV(
          BigInt(
            Math.floor(Number(quote.toAmount) * (1 - BITFLOW.DEFAULT_SLIPPAGE)),
          ),
        ),
      ],
      senderKey: privateKey,
      network: stacksNetwork,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
    });

    const result = await broadcastTransaction(tx, stacksNetwork);

    if ("error" in result) {
      throw new Error(
        `Bitflow swap broadcast failed: ${result.error} — ${result.reason}`,
      );
    }

    return {
      success: true,
      txId: result.txid,
      fromAmount: quote.fromAmount,
      toAmount: quote.toAmount,
      actualRate: quote.exchangeRate,
    };
  } catch (err) {
    return {
      success: false,
      fromAmount: quote.fromAmount,
      toAmount: "0",
      actualRate: "0",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Check if a token pair can be swapped via Bitflow.
 */
export function isBitflowPairSupported(
  fromToken: TokenSymbol,
  toToken: TokenSymbol,
): boolean {
  return BITFLOW.PAIRS.some((p) => p.from === fromToken && p.to === toToken);
}
