"use client"

import { LendPosition } from "@/components/lend-position"
import { LendForm } from "@/components/lend-form"
import { useAccount } from "wagmi"

export default function LendPage() {
  const { isConnected } = useAccount()

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-2xl font-bold mb-4">Connect Wallet</h1>
        <p className="text-muted-foreground">Please connect your MetaMask wallet to access the lend page</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Lend Dashboard</h1>
        <p className="text-muted-foreground">Manage your investments and earn interest</p>
      </div>

      {/* Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Portfolio Overview */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Portfolio Overview</h2>
            <LendPosition />
          </div>
        </div>

        {/* Right Column - Investment Actions */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">New Investment</h2>
            <LendForm />
          </div>
        </div>
      </div>
    </div>
  )
}
