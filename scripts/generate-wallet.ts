import { generateNewAccount, generateWallet, getStxAddress } from "@stacks/wallet-sdk";

/**
 * Generates a Stacks wallet from a 24-word seed phrase and extracts keys.
 * 
 * @param seedPhrase - The 24-word mnemonic phrase.
 * @returns Object containing the address, STX private key, and data private key.
 */
async function getPrivateKeyFromSeed(seedPhrase: string) {
  let wallet = await generateWallet({
    secretKey: seedPhrase,
    password: "secure-password", // Used for internal wallet encryption
  });

  if (!wallet.accounts || wallet.accounts.length === 0) {
    throw new Error("No accounts found in generated wallet. Check your seed phrase.");
  }

  wallet = generateNewAccount(wallet);
  wallet = generateNewAccount(wallet);

  const account = wallet.accounts[1];
  
  // Use getStxAddress from wallet-sdk to derive addresses
  const mainnetAddress = getStxAddress(account, "mainnet");
  const testnetAddress = getStxAddress(account, "testnet");

  return {
    address: mainnetAddress,
    testnetAddress: testnetAddress,
    privateKey: account.stxPrivateKey,
    dataPrivateKey: account.dataPrivateKey,
  };
}

/**
 * Fetches the STX balance for a given address on the Stacks Testnet.
 * 
 * @param address - The Testnet address (ST...).
 * @returns The STX balance in micro-STX (as a string).
 */
async function fetchTestnetBalance(address: string): Promise<string> {
  const url = `https://api.testnet.hiro.so/extended/v1/address/${address}/balances`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Stacks API error: ${response.statusText}`);
    }
    const data = (await response.json()) as any;
    return data.stx.balance;
  } catch (err: any) {
    console.error(`⚠️ Could not fetch balance for ${address}:`, err.message);
    return "0";
  }
}

// Main Execution
(async () => {
  // Replace this with your actual 24-word seed phrase
  // WARNING: Never share your seed phrase or commit it to version control!
  const seedPhrase = process.argv[2];

  if (!seedPhrase) {
    console.error("❌ Error: No seed phrase provided.");
    console.log("\nUsage: npx tsx scripts/generate-wallet.ts \"your twenty four word seed phrase here\"");
    process.exit(1);
  }

  console.log("⏳ Generating wallet and fetching balance...");

  try {
    const result = await getPrivateKeyFromSeed(seedPhrase);
    const balanceMicroStx = await fetchTestnetBalance(result.testnetAddress);
    const balanceStx = (BigInt(balanceMicroStx) / 1_000_000n).toString();

    console.log("\n✅ Wallet Generated Successfully");
    console.log("────────────────────────────────────────────────");
    console.log("Mainnet Address:    ", result.address);
    console.log("Testnet Address:    ", result.testnetAddress);
    console.log("STX Private Key:    ", result.privateKey);
    console.log("Data Private Key:   ", result.dataPrivateKey);
    console.log("────────────────────────────────────────────────");
    console.log(`Testnet STX Balance: ${balanceStx} STX (${balanceMicroStx} micro-STX)`);
    console.log("────────────────────────────────────────────────");
  } catch (err: any) {
    console.error("❌ Fatal Error:", err.message);
    process.exit(1);
  }
})();
