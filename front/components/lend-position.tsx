"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { usePoolActions, usePoolFunderInfo, usePoolInfo } from "@/lib/wallet-actions"

export function LendPosition() {
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const funderInfo = usePoolFunderInfo()
  const poolInfo = usePoolInfo()
  const { withdrawInterest, withdrawPrincipal, withdrawPrincipalAmount, isConnected } = usePoolActions()

  const totalPortfolioValue = funderInfo.principal + funderInfo.pendingInterest
  const earningsPercentage = funderInfo.principal > 0 ? (funderInfo.pendingInterest / funderInfo.principal) * 100 : 0
  const poolPercentage = poolInfo.totalPoolAmount > 0 ? (funderInfo.principal / poolInfo.totalInvestedAmount) * 100 : 0

  const handleWithdrawInterest = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first")
      return
    }

    setIsLoading(true)
    try {
      const result = await withdrawInterest()
      if (result.success) {
        alert(result.message)
      } else {
        alert(result.message)
      }
    } catch (error) {
      alert("Failed to withdraw interest")
    } finally {
      setIsLoading(false)
    }
  }

  const handleWithdrawPrincipal = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first")
      return
    }

    setIsLoading(true)
    try {
      const result = await withdrawPrincipal()
      if (result.success) {
        alert(result.message)
      } else {
        alert(result.message)
      }
    } catch (error) {
      alert("Failed to withdraw all funds")
    } finally {
      setIsLoading(false)
    }
  }

  const handleWithdrawPrincipalAmount = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first")
      return
    }

    const amount = Number.parseFloat(withdrawAmount)
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount greater than 0")
      return
    }

    setIsLoading(true)

    try {
      const result = await withdrawPrincipalAmount(amount)
      if (result.success) {
        alert(result.message)
        setWithdrawAmount("")
      } else {
        alert(result.message)
      }
    } catch (error) {
      alert("Failed to withdraw specified amount")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Portfolio Overview</span>
            <Badge variant="default" className="text-sm">
              Active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Total Portfolio Value */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
            <span className="block text-sm text-gray-600">Total Portfolio Value</span>
            <span className="text-3xl font-bold text-blue-600">
              ${totalPortfolioValue.toLocaleString()}
            </span>
          </div>

          {/* Key Metrics - More Subtle Design */}
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Principal</span>
              <span className="text-sm font-medium">${funderInfo.principal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Interest</span>
              <span className="text-sm font-medium text-green-600">+${funderInfo.pendingInterest.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Return Rate</span>
              <span className="text-sm font-medium text-green-600">{earningsPercentage.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Total Pool Volume</span>
              <span className="text-sm font-medium text-blue-600">${poolInfo.totalPoolAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">Your Pool Share</span>
              <span className="text-sm font-medium text-blue-600">{poolPercentage.toFixed(2)}%</span>
            </div>
          </div>

          {/* Earnings Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Earnings Rate</span>
              <span>{earningsPercentage.toFixed(2)}%</span>
            </div>
            <Progress value={Math.min(earningsPercentage, 100)} className="h-2" />
          </div>

          {/* Pool Share Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Pool Share</span>
              <span>{poolPercentage.toFixed(2)}%</span>
            </div>
            <Progress value={Math.min(poolPercentage, 100)} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Withdraw Funds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">Available to Withdraw:</span>
            <span className="text-xl font-bold text-green-600">
              ${totalPortfolioValue.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Button
              onClick={handleWithdrawInterest}
              className="w-full"
              disabled={funderInfo.pendingInterest <= 0 || isLoading || !isConnected}
              variant="outline"
            >
              {isLoading ? "Processing..." : `Withdraw Interest (+${funderInfo.pendingInterest.toFixed(2)})`}
            </Button>

            <Button
              onClick={handleWithdrawPrincipal}
              className="w-full"
              variant="destructive"
              disabled={funderInfo.principal <= 0 || isLoading || !isConnected}
            >
              {isLoading ? "Processing..." : `Withdraw All Principal (+${funderInfo.principal.toFixed(2)})`}
            </Button>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <Label htmlFor="withdraw-amount" className="text-sm font-medium">
              Withdraw Specific Amount
            </Label>
            <div className="flex gap-2">
              <Input
                id="withdraw-amount"
                type="number"
                step="0.01"
                min="0"
                max={totalPortfolioValue}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount to withdraw"
                disabled={isLoading || !isConnected}
                className="flex-1"
              />
              <Button
                onClick={handleWithdrawPrincipalAmount}
                disabled={!withdrawAmount || isLoading || !isConnected}
                size="sm"
              >
                {isLoading ? "Processing..." : "Withdraw"}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Maximum: ${totalPortfolioValue.toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
