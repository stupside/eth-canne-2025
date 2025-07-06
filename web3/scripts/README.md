# Web3 Scripts

This directory contains scripts for interacting with the FundingPool smart contract.

## Scripts

### set-backend.ts

Sets backend addresses for the FundingPool contract. Backend addresses are authorized to:
- Create loans for borrowers (`requestFundingForBorrower`)
- Handle loan repayments (`repayAmountForLoan`)

#### Prerequisites

1. Set up environment variables:
   ```bash
   export SEPOLIA_RPC_URL="your_sepolia_rpc_url"
   export SEPOLIA_PRIVATE_KEY="your_deployer_private_key"
   ```

2. Ensure you have the deployer account with sufficient ETH for gas fees

#### Usage

```bash
# Using npm script
npm run set-backend

# Or directly with hardhat
npx hardhat run scripts/set-backend.ts --network sepolia
```

#### Configuration

The script is configured with:
- **Contract Address**: `0xd3AE69694000680a60776B71752c671A80B962a6` (FundingPool on Sepolia)
- **Backend Address**: `0xa9f0fe3f372c1bdfeb6abcbd30f599002c5e0744`

To change the backend address, edit the `BACKEND_ADDRESS` constant in the script.

#### Security Notes

- Only the deployer can call `setBackends`
- The script will replace all existing backend addresses with the new array
- Make sure to include all necessary backend addresses in a single call 