"use client"

import { BorrowForm } from "@/components/borrow-form"
import { BorrowPosition } from "@/components/borrow-position"
import { useAccount } from "wagmi"

export default function BorrowPage() {
  const { isConnected, address } = useAccount()

  if (!isConnected || !address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-2xl font-bold mb-4">Connect Wallet</h1>
        <p className="text-muted-foreground">Please connect your MetaMask wallet to access the borrow page</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Borrow Dashboard</h1>
        <p className="text-muted-foreground">Manage your loans and request new funding</p>
      </div>

      {/* Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Position Overview */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Current Position</h2>
            <BorrowPosition wallet={address} />
          </div>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Request New Loan</h2>
            <BorrowForm wallet={address} />
          </div>
        </div>
      </div>
    </div>
  )
}
