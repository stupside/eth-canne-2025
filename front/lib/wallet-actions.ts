"use client"

import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi"
import { FUNDING_POOL_ADDRESS } from "./constants"
import { useMemo } from "react"
import { parseUSDC, formatUSDC } from "./utils"

export function usePoolActions() {
  const { isConnected, address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()

  // Custom error ABI for proper error decoding
  const customErrors = [
    {
      type: "error",
      name: "ZeroAmount",
      inputs: []
    },
    {
      type: "error",
      name: "InsufficientFunds",
      inputs: []
    },
    {
      type: "error",
      name: "NothingToWithdraw",
      inputs: []
    },
    {
      type: "error",
      name: "AlreadyHasActiveLoan",
      inputs: []
    },
    {
      type: "error",
      name: "InsufficientPoolFunds",
      inputs: []
    },
    {
      type: "error",
      name: "ExpectedAmountLessThanAmount",
      inputs: []
    },
    {
      type: "error",
      name: "LoanAlreadyRepaid",
      inputs: []
    },
    {
      type: "error",
      name: "InvalidInstallmentAmount",
      inputs: []
    }
  ]

  const withdrawInterest = async () => {
    try {
      // Simulate the transaction first
      // await publicClient?.simulateContract({
      //   address: FUNDING_POOL_ADDRESS,
      //   abi: [
      //     {
      //       inputs: [],
      //       name: "withdrawInterest",
      //       outputs: [],
      //       stateMutability: "nonpayable",
      //       type: "function"
      //     },
      //     ...customErrors
      //   ],
      //   functionName: "withdrawInterest",
      // })

      const hash = await writeContractAsync({
        address: FUNDING_POOL_ADDRESS,
        abi: [
          {
            inputs: [],
            name: "withdrawInterest",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
          },
          ...customErrors
        ],
        functionName: "withdrawInterest",
      })

      return { success: true, message: `Interest withdrawal transaction sent! Hash: ${hash}` }
    } catch (error: any) {
      console.error("Error withdrawing interest:", error)
      return { success: false, message: error?.message || "Failed to withdraw interest" }
    }
  }

  const withdrawPrincipal = async () => {
    try {
      // Simulate the transaction first
      // await publicClient?.simulateContract({
      //   address: FUNDING_POOL_ADDRESS,
      //   abi: [
      //     {
      //       inputs: [],
      //       name: "withdrawPrincipal",
      //       outputs: [],
      //       stateMutability: "nonpayable",
      //       type: "function"
      //     },
      //     ...customErrors
      //   ],
      //   functionName: "withdrawPrincipal",
      // })

      const hash = await writeContractAsync({
        address: FUNDING_POOL_ADDRESS,
        abi: [
          {
            inputs: [],
            name: "withdrawPrincipal",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
          },
          ...customErrors
        ],
        functionName: "withdrawPrincipal",
      })

      return { success: true, message: `Principal withdrawal transaction sent! Hash: ${hash}` }
    } catch (error: any) {
      console.error("Error withdrawing principal:", error)
      return { success: false, message: error?.message || "Failed to withdraw principal" }
    }
  }

  const withdrawPrincipalAmount = async (amount: number) => {
    try {
      if (isNaN(amount) || amount <= 0) {
        return { success: false, message: "Amount must be greater than 0" }
      }

      const amountInWei = parseUSDC(amount)

      // Simulate the transaction first
      // await publicClient?.simulateContract({
      //   address: FUNDING_POOL_ADDRESS,
      //   abi: [
      //     {
      //       inputs: [
      //         {
      //           "internalType": "uint256",
      //           "name": "amount",
      //           "type": "uint256"
      //         }
      //       ],
      //       name: "withdrawPrincipalAmount",
      //       outputs: [],
      //       stateMutability: "nonpayable",
      //       type: "function"
      //     },
      //     ...customErrors
      //   ],
      //   functionName: "withdrawPrincipalAmount",
      //   args: [amountInWei],
      // })

      const hash = await writeContractAsync({
        address: FUNDING_POOL_ADDRESS,
        abi: [
          {
            inputs: [
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              }
            ],
            name: "withdrawPrincipalAmount",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
          },
          ...customErrors
        ],
        args: [amountInWei],
        functionName: "withdrawPrincipalAmount",
      })

      return { success: true, message: `Principal amount withdrawal transaction sent! Hash: ${hash}` }
    } catch (error: any) {
      console.error("Error withdrawing principal amount:", error)
      return { success: false, message: error?.message || "Failed to withdraw principal amount" }
    }
  }

  return {
    isConnected,
    withdrawInterest,
    withdrawPrincipal,
    withdrawPrincipalAmount,
  }
}

export function usePoolInfo() {
  const { address } = useAccount()

  if (!address) {
    throw new Error("Wallet not connected. Please connect your wallet to view pool information.")
  }

  const result = useReadContract({
    address: FUNDING_POOL_ADDRESS,
    abi: [
      {
        inputs: [
        ],
        name: "getPoolInfo",
        outputs: [
          {
            internalType: "uint256",
            name: "poolAmount",
            type: "uint256"
          },
          {
            internalType: "uint256",
            name: "pValue",
            type: "uint256"
          },
          {
            internalType: "uint256",
            name: "investedAmount",
            type: "uint256"
          }
        ],
        stateMutability: "view",
        type: "function"
      }
    ],
    functionName: "getPoolInfo",
  })


  const poolInfo = useMemo(() => {
    if (!result.data) return {
      totalPoolAmount: 0,
      totalPValue: 0,
      totalInvestedAmount: 0,
    }

    const [totalPoolAmount, totalPValue, investedAmount] = result.data

    return {
      totalPValue: formatUSDC(totalPValue),
      totalPoolAmount: formatUSDC(totalPoolAmount), // Convert from wei to USDC
      totalInvestedAmount: formatUSDC(investedAmount), // Convert from wei to USDC
    }
  }, [result, address])

  return poolInfo
}

export function usePoolBorrowerInfo() {
  const { address } = useAccount()

  if (!address) {
    throw new Error("Wallet not connected. Please connect your wallet to view borrower information.")
  }

  const result = useReadContract({
    address: FUNDING_POOL_ADDRESS,
    abi: [
      {
        inputs: [
          {
            internalType: "address",
            name: "borrowerAddr",
            type: "address"
          }
        ],
        name: "getBorrowerInfo",
        outputs: [
          {
            internalType: "uint256",
            name: "remainingAmount",
            type: "uint256"
          },
        ],
        stateMutability: "view",
        type: "function"
      }
    ],
    functionName: "getBorrowerInfo",
    args: [address],
  })

  const borrowerInfo = useMemo(() => {
    if (!result.data) return {
      remainingAmount: 0,
    }

    return {
      remainingAmount: formatUSDC(result.data), // Convert from wei to USDC
    }
  }, [result, address])

  return borrowerInfo
}

export function usePoolFunderInfo() {
  const { address } = useAccount()

  if (!address) {
    throw new Error("Wallet not connected. Please connect your wallet to view funder information.")
  }

  const result = useReadContract({
    address: FUNDING_POOL_ADDRESS,
    abi: [
      {
        inputs: [
          {
            "internalType": "address",
            "name": "funderAddr",
            "type": "address"
          }
        ],
        name: "getFunderInfo",
        outputs: [
          {
            internalType: "uint256",
            name: "principal",
            type: "uint256"
          },
          {
            internalType: "uint256",
            name: "pendingInterest",
            type: "uint256"
          },
        ],
        stateMutability: "view",
        type: "function"
      }
    ],
    functionName: "getFunderInfo",
    args: [address],
  })

  const funderInfo = useMemo(() => {

    if (!result.data) return {
      principal: 0,
      pendingInterest: 0,
      interestDebt: 0
    }

    const [principal, pendingInterest] = result.data

    const response = {
      principal: formatUSDC(principal), // Convert from wei to USDC
      pendingInterest: formatUSDC(pendingInterest),
    }

    console.log("Parsed funder info:", response)
    return response
  }, [result, address])

  return funderInfo
}