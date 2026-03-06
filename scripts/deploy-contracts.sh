#!/usr/bin/env bash
# PayStream — Deploy Contracts to Stacks Testnet
#
# Prerequisites:
#   1. Install Clarinet: https://docs.hiro.so/clarinet/getting-started
#   2. Set DEPLOYER_MNEMONIC in .env.local (24-word mnemonic for testnet wallet)
#   3. Fund deployer wallet via faucet: https://explorer.hiro.so/sandbox/faucet?chain=testnet
#
# Usage:
#   bash scripts/deploy-contracts.sh

set -euo pipefail

CONTRACTS_DIR="$(cd "$(dirname "$0")/../contracts" && pwd)"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_FILE="$CONTRACTS_DIR/deployed-addresses.testnet.json"

# Load env
if [ -f "$ROOT_DIR/.env.local" ]; then
  source "$ROOT_DIR/.env.local"
fi

if [ -z "${DEPLOYER_MNEMONIC:-}" ]; then
  echo "❌ DEPLOYER_MNEMONIC is not set in .env.local"
  echo "   Get testnet STX: https://explorer.hiro.so/sandbox/faucet?chain=testnet"
  exit 1
fi

echo "⚡ PayStream Contract Deployment"
echo "   Network: testnet"
echo "   Contracts: paystream-vault, paystream-escrow, paystream-registry"
echo ""

# Inject mnemonic into Testnet.toml temporarily
TESTNET_TOML="$CONTRACTS_DIR/settings/Testnet.toml"
sed -i.bak "s|^mnemonic = \"\"$|mnemonic = \"$DEPLOYER_MNEMONIC\"|" "$TESTNET_TOML"

cd "$CONTRACTS_DIR"

# Check contracts
echo "→ Running clarinet check..."
clarinet check

# Generate testnet deployment plan
echo "→ Generating testnet deployment plan..."
clarinet deployments generate --testnet --low-cost

# Apply deployment
echo "→ Deploying contracts to testnet..."
DEPLOY_OUTPUT=$(clarinet deployments apply --testnet 2>&1)
echo "$DEPLOY_OUTPUT"

# Restore Testnet.toml (remove mnemonic from file)
mv "$TESTNET_TOML.bak" "$TESTNET_TOML"

# Parse deployed contract addresses from output
DEPLOYER_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -E "ST[A-Z0-9]+" | head -1 | grep -oE "ST[A-Z0-9]+" | head -1 || echo "")

if [ -z "$DEPLOYER_ADDRESS" ]; then
  echo "⚠️  Could not auto-detect deployer address from output."
  echo "   Check the Clarinet output above and manually update .env.local:"
  echo "   VAULT_CONTRACT=ST<deployer>.paystream-vault"
  echo "   ESCROW_CONTRACT=ST<deployer>.paystream-escrow"
  echo "   REGISTRY_CONTRACT=ST<deployer>.paystream-registry"
else
  VAULT="${DEPLOYER_ADDRESS}.paystream-vault"
  ESCROW="${DEPLOYER_ADDRESS}.paystream-escrow"
  REGISTRY="${DEPLOYER_ADDRESS}.paystream-registry"

  echo ""
  echo "✅ Contracts deployed!"
  echo "   Vault:    $VAULT"
  echo "   Escrow:   $ESCROW"
  echo "   Registry: $REGISTRY"

  # Write deployed-addresses.json
  cat > "$OUTPUT_FILE" << EOF
{
  "network": "testnet",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployer": "$DEPLOYER_ADDRESS",
  "vault": "$VAULT",
  "escrow": "$ESCROW",
  "registry": "$REGISTRY",
  "explorer": {
    "vault": "https://explorer.hiro.so/txid/$DEPLOYER_ADDRESS.paystream-vault?chain=testnet",
    "escrow": "https://explorer.hiro.so/txid/$DEPLOYER_ADDRESS.paystream-escrow?chain=testnet",
    "registry": "https://explorer.hiro.so/txid/$DEPLOYER_ADDRESS.paystream-registry?chain=testnet"
  }
}
EOF
  echo "→ Written to $OUTPUT_FILE"

  # Update .env.local
  ENV_LOCAL="$ROOT_DIR/.env.local"
  if [ -f "$ENV_LOCAL" ]; then
    # Remove old contract lines
    grep -v "VAULT_CONTRACT\|ESCROW_CONTRACT\|REGISTRY_CONTRACT" "$ENV_LOCAL" > "$ENV_LOCAL.tmp"
    echo "" >> "$ENV_LOCAL.tmp"
    echo "# ─── Deployed Contracts (testnet) ───────────────────────────────────────────" >> "$ENV_LOCAL.tmp"
    echo "VAULT_CONTRACT=$VAULT" >> "$ENV_LOCAL.tmp"
    echo "ESCROW_CONTRACT=$ESCROW" >> "$ENV_LOCAL.tmp"
    echo "REGISTRY_CONTRACT=$REGISTRY" >> "$ENV_LOCAL.tmp"
    mv "$ENV_LOCAL.tmp" "$ENV_LOCAL"
    echo "→ Updated .env.local with contract addresses"
  fi

  echo ""
  echo "🔍 View on Hiro Explorer:"
  echo "   https://explorer.hiro.so/address/$DEPLOYER_ADDRESS?chain=testnet"
fi
