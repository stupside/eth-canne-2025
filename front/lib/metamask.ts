import { useAccount, useWriteContract, useReadContract, usePublicClient } from "wagmi";
// import { getWalletClient } from "wagmi/actions";
import {
    createPublicClient,
    http,
    // encodePacked,
    erc20Abi,
    maxUint256,
    type Hex,
} from "viem";
import { FUNDING_POOL_ADDRESS, USDC_ADDRESS } from "./constants";
import { parseUSDC, formatUSDC } from "./utils";
// import {
//     toMetaMaskSmartAccount,
//     Implementation,
// } from "@metamask/delegation-toolkit";
// import { createPimlicoClient } from "permissionless/clients/pimlico";
// import { createSmartAccountClient } from "permissionless";
// import { config } from "./wagmi";

// Constants
// const CIRCLE_PAYMASTER_ADDRESS = "0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966" as Hex;
// const BUNDLER_RPC_URL = `https://public.pimlico.io/v2/${CHAIN_ID}/rpc`;

// const LENDING_CONTRACT_ABI = [
//     {
//         name: "lend",
//         type: "function",
//         stateMutability: "nonpayable",
//         inputs: [{ name: "amount", type: "uint256" }],
//         outputs: [],
//     },
// ];

// const eip2612Abi = [
//     ...erc20Abi,
//     {
//         name: "nonces",
//         inputs: [{ internalType: "address", name: "owner", type: "address" }],
//         outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
//         stateMutability: "view",
//         type: "function",
//     },
//     {
//         name: "version",
//         inputs: [],
//         outputs: [{ internalType: "string", name: "", type: "string" }],
//         stateMutability: "view",
//         type: "function",
//     },
// ];

// async function signPermitWithMetaMask({
//     client,
//     signer,
//     signerAddress,
//     token,
//     spender,
//     amount,
// }: {
//     client: ReturnType<typeof createPublicClient>;
//     signer: any;
//     signerAddress: Hex;
//     token: Hex;
//     spender: Hex;
//     amount: bigint;
// }): Promise<Hex> {

//     if (!client.chain) {
//         throw new Error("Client chain is not set. Please connect to a wallet on Sepolia.");
//     }

//     const [name, version, nonce] = await Promise.all([
//         client.readContract({ address: token, abi: eip2612Abi, functionName: "name" }),
//         client.readContract({ address: token, abi: eip2612Abi, functionName: "version" }),
//         client.readContract({
//             address: token,
//             abi: eip2612Abi,
//             functionName: "nonces",
//             args: [signerAddress],
//         }),
//     ]);

//     const domain = {
//         name,
//         version,
//         chainId: client.chain.id,
//         verifyingContract: token,
//     };

//     const types = {
//         Permit: [
//             { name: "owner", type: "address" },
//             { name: "spender", type: "address" },
//             { name: "value", type: "uint256" },
//             { name: "nonce", type: "uint256" },
//             { name: "deadline", type: "uint256" },
//         ],
//     };

//     const message = {
//         owner: signerAddress,
//         spender,
//         value: amount,
//         nonce,
//         deadline: maxUint256,
//     };

//     const signature = await signer.signTypedData({
//         domain,
//         types,
//         primaryType: "Permit",
//         message,
//         account: signerAddress,
//     });

//     return signature as Hex;
// }

export function useSendLendWithUSDCGasDelegated() {
    // 1. Get the signer from wagmi
    const account = useAccount();
    const publicClient = usePublicClient()
    const { writeContractAsync } = useWriteContract();

    return async (floatValue: number, message?: string) => {

        if (isNaN(floatValue) || floatValue <= 0) {
            throw new Error("Amount must be greater than 0");
        }

        const amount = parseUSDC(floatValue); // Convert to USDC with 6 decimals

        const { chain, address } = account;
        if (!chain?.id || !address) {
            throw new Error("Please connect to a wallet on Sepolia.");
        }

        // Validate amount
        if (amount <= BigInt(0)) {
            throw new Error("Amount must be greater than 0");
        }

        try {
            // Check USDC balance
            const balance = await publicClient?.readContract({
                address: USDC_ADDRESS,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [address],
            });

            if ((balance ?? BigInt(0)) < amount) {
                throw new Error(`Insufficient USDC balance. You have ${formatUSDC(balance ?? BigInt(0))} USDC, but trying to deposit ${formatUSDC(amount)} USDC`);
            }

            // Check current allowance
            const currentAllowance = await publicClient?.readContract({
                address: USDC_ADDRESS,
                abi: erc20Abi,
                functionName: "allowance",
                args: [address, FUNDING_POOL_ADDRESS],
            });

            // Always approve a larger amount to avoid allowance issues
            const approvalAmount = amount * BigInt(10); // Approve 10x the amount needed
            if ((currentAllowance ?? BigInt(0)) < amount) {
                const approveTxHash = await writeContractAsync({
                    address: USDC_ADDRESS,
                    abi: erc20Abi,
                    functionName: "approve",
                    args: [FUNDING_POOL_ADDRESS, approvalAmount],
                    chainId: chain.id,
                });

                if (!approveTxHash) {
                    throw new Error("Failed to approve USDC transfer");
                }

                // Wait for the approval transaction to be confirmed
                console.log("Waiting for approval transaction to be confirmed...");
                let attempts = 0;
                const maxAttempts = 20; // Wait up to 20 seconds

                while (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

                    const newAllowance = await publicClient?.readContract({
                        address: USDC_ADDRESS,
                        abi: erc20Abi,
                        functionName: "allowance",
                        args: [address, FUNDING_POOL_ADDRESS],
                    });

                    if ((newAllowance ?? BigInt(0)) >= amount) {
                        console.log("Approval confirmed!");
                        break;
                    }

                    attempts++;
                }

                if (attempts >= maxAttempts) {
                    throw new Error("Approval transaction timed out - please try again");
                }
            }

            // First, try to simulate the transaction to catch revert reasons
            try {
                await publicClient?.simulateContract({
                    address: FUNDING_POOL_ADDRESS,
                    abi: [
                        {
                            inputs: [
                                {
                                    internalType: "uint256",
                                    name: "amount",
                                    type: "uint256"
                                }
                            ],
                            name: "depositPrincipal",
                            outputs: [],
                            stateMutability: "nonpayable",
                            type: "function"
                        },
                    ],
                    functionName: "depositPrincipal",
                    args: [amount],
                    account: address,
                });
            } catch (simError: any) {
                throw new Error(`Transaction would fail: ${simError.message}`);
            }

            const lendTxHash = await writeContractAsync({
                address: FUNDING_POOL_ADDRESS,
                abi: [
                    {
                        inputs: [
                            {
                                internalType: "uint256",
                                name: "amount",
                                type: "uint256"
                            }
                        ],
                        name: "depositPrincipal",
                        outputs: [],
                        stateMutability: "nonpayable",
                        type: "function"
                    },
                ],
                functionName: "depositPrincipal",
                args: [amount],
                chainId: chain.id,
            });

            if (!lendTxHash) {
                throw new Error("Failed to lend USDC");
            }

            alert(`Transaction sent! Hash: ${lendTxHash}`);
            return lendTxHash;

        } catch (error) {
            console.error("Transaction error:", error);

            // Try to extract the revert reason
            if (error instanceof Error) {
                const errorMessage = error.message;

                // Check for common revert patterns
                if (errorMessage.includes("execution reverted")) {
                    console.log("Contract reverted. Possible reasons:");
                    console.log("- Insufficient USDC balance");
                    console.log("- Insufficient allowance");
                    console.log("- Contract restrictions");
                    console.log("- Invalid amount");

                    // Try to get more specific error info
                    if (errorMessage.includes("SafeERC20: low-level call failed")) {
                        console.log("Error: SafeERC20 transfer failed - likely insufficient balance or allowance");
                    } else if (errorMessage.includes("ZeroAmount")) {
                        console.log("Error: Amount must be greater than 0");
                    } else if (errorMessage.includes("InsufficientFunds")) {
                        console.log("Error: Insufficient funds");
                    } else {
                        console.log("Raw error message:", errorMessage);
                    }
                } else if (errorMessage.includes("insufficient funds")) {
                    console.log("Error: Insufficient ETH for gas fees");
                } else if (errorMessage.includes("user rejected")) {
                    console.log("Error: Transaction was rejected by user");
                } else {
                    console.log("Error:", errorMessage);
                }
            }

            throw error;
        }

        // if (message) alert(message);

        // if (!account.chain?.id || !account.address) {
        //     throw new Error("Please connect to a wallet on Sepolia.");
        // }

        // // 2. Get the wallet client
        // const walletClient = await getWalletClient(config);
        // if (!walletClient) {
        //     throw new Error("Failed to get wallet client");
        // }

        // // 3. Create account abstraction
        // const publicClient = createPublicClient({ chain: account.chain, transport: http() });

        // const smartAccount = await toMetaMaskSmartAccount({
        //     client: publicClient,
        //     implementation: Implementation.Hybrid,
        //     deployParams: [account.address, [], [], []],
        //     deploySalt: "0x",
        //     signatory: {
        //         account: walletClient.account,
        //     }
        // });

        // const bundlerClient = createSmartAccountClient({
        //     chain: publicClient.chain,
        //     account: smartAccount,
        //     paymaster: createPimlicoClient({
        //         transport: http(BUNDLER_RPC_URL),
        //         entryPoint: {
        //             address: "0x0576a174D229E3cFA37253523E645A78A0C91B57", // entryPoint 0.8
        //             version: "0.8",
        //         },

        //     }),
        //     bundlerTransport: http(BUNDLER_RPC_URL),
        // });

        // try {
        //     const permitSig = await signPermitWithMetaMask({
        //         client: publicClient,
        //         signer: walletClient,
        //         signerAddress: account.address,
        //         token: USDC_ADDRESS,
        //         spender: CIRCLE_PAYMASTER_ADDRESS,
        //         amount,
        //     });

        //     const paymasterData = encodePacked(
        //         ["uint8", "address", "uint256", "bytes"],
        //         [0, USDC_ADDRESS, amount, permitSig]
        //     );

        //     const hash = await bundlerClient.sendUserOperation({
        //         account: smartAccount,
        //         calls: [
        //             {
        //                 to: LENDING_CONTRACT_ADDRESS,
        //                 abi: LENDING_CONTRACT_ABI,
        //                 functionName: "lend",
        //                 args: [amount],
        //             },
        //         ]
        //     });

        //     return hash;
        // } catch (err) {
        //     console.error("User operation failed:", err);
        //     throw err;
        // }
    };
}
