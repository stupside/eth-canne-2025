import { network } from "hardhat";
import { encodeFunctionData } from "viem";

/**
 * Script to set backend addresses for the FundingPool contract
 * 
 * This script calls the setBackends function on the FundingPool contract
 * to authorize backend addresses that can create loans and handle repayments.
 * 
 * Usage:
 * 1. Set your environment variables:
 *    - SEPOLIA_RPC_URL: Your Sepolia RPC endpoint
 *    - SEPOLIA_PRIVATE_KEY: Your deployer private key
 * 
 * 2. Run the script:
 *    npm run set-backend
 *    or
 *    npx hardhat run scripts/set-backend.ts --network sepolia
 */

// FundingPool contract address on Sepolia
const FUNDING_POOL_ADDRESS = "0x3caAB2e20f54871F048B359D52a3E145d65e9561";

// Backend address to set
const BACKEND_ADDRESS = "0xa9f0fe3f372c1bdfeb6abcbd30f599002c5e0744";

async function main() {
  console.log("Setting backend address for FundingPool contract...");
  console.log("Contract address:", FUNDING_POOL_ADDRESS);
  console.log("Backend address:", BACKEND_ADDRESS);

  // Validate addresses
  if (!FUNDING_POOL_ADDRESS.startsWith("0x") || FUNDING_POOL_ADDRESS.length !== 42) {
    throw new Error("Invalid contract address format");
  }
  
  if (!BACKEND_ADDRESS.startsWith("0x") || BACKEND_ADDRESS.length !== 42) {
    throw new Error("Invalid backend address format");
  }

  const { viem } = await network.connect({
    network: "sepolia",
    chainType: "l1",
  });

  const publicClient = await viem.getPublicClient();
  const [senderClient] = await viem.getWalletClients();

  console.log("Using account:", senderClient.account.address);

  // FundingPool contract ABI - only the setBackends function
  const abi = [
    {
      inputs: [
        {
          internalType: "address[]",
          name: "newBackends",
          type: "address[]",
        },
      ],
      name: "setBackends",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ];

  try {
    console.log("Sending setBackends transaction...");
    
    const tx = await senderClient.sendTransaction({
      to: FUNDING_POOL_ADDRESS as `0x${string}`,
      data: encodeFunctionData({
        abi,
        functionName: "setBackends",
        args: [[BACKEND_ADDRESS as `0x${string}`]],
      }),
    });

    console.log("Transaction hash:", tx);

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
    
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    console.log("Backend address set successfully!");
    
  } catch (error) {
    console.error("Error setting backend address:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 