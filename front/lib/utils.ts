import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { parseUnits, formatUnits } from 'viem'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// USDC has 6 decimals
export const USDC_DECIMALS = 6

/**
 * Convert a USDC amount (as a number) to wei (the smallest unit)
 * @param amount The amount in USDC (e.g., 1.5 for 1.5 USDC)
 * @returns The amount in wei as a bigint
 */
export function parseUSDC(amount: number): bigint {
  return parseUnits(amount.toString(), USDC_DECIMALS)
}

/**
 * Convert wei (the smallest unit) to USDC amount
 * @param amount The amount in wei as a bigint
 * @returns The amount in USDC as a number
 */
export function formatUSDC(amount: bigint): number {
  return Number(formatUnits(amount, USDC_DECIMALS))
}

/**
 * Convert a USDC amount string to wei
 * @param amount The amount as a string (e.g., "1.5")
 * @returns The amount in wei as a bigint
 */
export function parseUSDCString(amount: string): bigint {
  return parseUnits(amount, USDC_DECIMALS)
}
