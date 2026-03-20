
/**
 * Nonce Replay Verification Script
 * 
 * This script attempts to reuse a payment signature to verify that the
 * api-server correctly detects and rejects replay attacks using the
 * Supabase used_nonces table.
 */
import { Buffer } from "node:buffer";
import { AgentWallet } from "@devvmichael/paystream-client";
import { X402_HEADERS } from "@devvmichael/paystream-core";

const API_URL = "http://localhost:3402/api/ai/generate";
const PRIVATE_KEY = "df74439446d1d730a4ee3ea376979603f262141AD7BBDE36D40346E6593F4239"; 

async function runTest() {
  console.log("🚀 Starting Nonce Replay Test...");
  
  const wallet = new AgentWallet({
    key: PRIVATE_KEY,
    network: "testnet",
    budget: { perTx: BigInt("1000000"), perDay: BigInt("10000000") }
  });

  try {
     const addr = await wallet.getAddress();
     console.log("   [Diagnostic] Derived Testnet Address:", addr);
  } catch (e: any) {
     console.error("   [Diagnostic] Failed to derive address:", e.message);
  }

  // 1. First request - should fail with 402, then wallet signs and retries.
  console.log("\n1. Initializing first request...");
  let capturedHeader: string | null = null;
  
  try {
    const originalFetch = globalThis.fetch;
    let callCount = 0;
    
    const mockFetch = async (url: any, init: any) => {
      // Only intercept our mock API calls
      if (!url.toString().includes("localhost:3402")) {
        return originalFetch(url, init);
      }

      callCount++;
      console.log(`   [MockFetch] Intercepted Call ${callCount}: ${url}`);
      if (callCount === 1) {
        const requirements = {
          version: "1.0.0",
          maxAmountRequired: "1000",
          tokens: [{ symbol: "STX", name: "Stacks", decimals: 6, amount: "1000" }],
          payTo: "ST218V3C9X310RR5WHKATAVHKJYKMNYCD95TXBMFV",
          nonce: Date.now().toString(),
          facilitator: "http://localhost:3402/facilitator",
          resource: "/api/ai/generate",
          description: "AI Generation"
        };
        const encodedReq = Buffer.from(JSON.stringify(requirements)).toString("base64");
        
        return new Response(JSON.stringify({ 
          error: "Payment Required" 
        }), { 
          status: 402,
          headers: { 
            "content-type": "application/json",
            [X402_HEADERS.REQUIREMENTS]: encodedReq
          }
        });
      }
      
      const headersObject = (init.headers instanceof Headers) ? Object.fromEntries(init.headers.entries()) : init.headers;
      const h = headersObject?.[X402_HEADERS.PAYMENT] || headersObject?.[X402_HEADERS.PAYMENT.toLowerCase()];
      
      if (h) {
        console.log("   [MockFetch] Payment signature captured!");
        capturedHeader = h as string;
      }
      return new Response(JSON.stringify({ error: "Insufficient Funds" }), { status: 403 });
    };

    globalThis.fetch = mockFetch as any;

    await wallet.fetch(API_URL).catch((err) => {
      console.error("   [AgentWallet Error]:", err.message);
    });
    globalThis.fetch = originalFetch;
  } catch (e: any) {
    console.error("   [Test Error]:", e.message);
  }

  if (!capturedHeader) {
    console.error("❌ Failed to capture payment header.");
    return;
  }

  console.log("✅ Captured Payment Header:", (capturedHeader as string).slice(0, 30) + "...");

  // 2. Now attempt to hit the real server with the SAME header twice
  console.log("\n2. Attempting replay on real server...");
  const headers: Record<string, string> = {};
  headers[X402_HEADERS.PAYMENT] = capturedHeader as string;
  
  const res1 = await fetch(API_URL, { headers });
  console.log(`Request 1 Status: ${res1.status}`);
  
  const res2 = await fetch(API_URL, { headers });
  console.log(`Request 2 Status: ${res2.status}`);
  
  if (res2.status === 402) {
    const body: any = await res2.json();
    if (body.error?.includes("replay")) {
      console.log("✅ SUCCESS: Server rejected the replayed nonce!");
    } else {
      console.log("❓ Server returned 402 but message didn't mention replay:", body);
    }
  } else {
    console.log("❌ FAILURE: Server did not reject the replay with 402.");
  }
}

runTest().catch(console.error);
