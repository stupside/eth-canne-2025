"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Info } from "lucide-react"
import { useSendLendWithUSDCGasDelegated } from "@/lib/metamask"

export function LendForm() {
  const [amount, setAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const sendLendWithUSDCGas = useSendLendWithUSDCGasDelegated()

  const isValidAmount = Number(amount) > 0
  const estimatedReturns = Number(amount) * 0.05 // 5% annual return estimate

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!amount || !isValidAmount) {
      setError("Please enter a valid USDC amount")
      return
    }

    // Additional validation
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid USDC amount greater than 0")
      return
    }

    if (!window.ethereum) {
      setError("MetaMask is not installed. Please install MetaMask to continue.")
      return
    }

    setIsSubmitting(true)

    try {
      // Debug logging for amount parsing
      console.log("Form - Amount entered:", amount)
      console.log("Form - Amount as float:", numAmount)
      console.log("Form - Amount in USDC:", numAmount)

      const txHash = await sendLendWithUSDCGas(numAmount)

      setSuccess(`Transaction submitted successfully! Hash: ${txHash}`)
      setAmount("")
    } catch (error: any) {
      console.error("Error submitting form:", error)
      setError(error?.message || "Failed to submit lend transaction. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Invest USDC</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Status Messages */}
        {error && (
          <Alert className="mb-4" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4" variant="default">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Investment Info */}
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Invest USDC to earn interest. Your funds are used to provide loans to borrowers.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Investment Amount Section */}
          <div className="space-y-2">
            <Label htmlFor="usdc-amount" className="text-sm font-medium">
              Investment Amount (USDC)
            </Label>
            <Input
              id="usdc-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter USDC amount"
              required
              className={!isValidAmount && amount ? "border-red-500" : ""}
            />
            {!isValidAmount && amount && (
              <p className="text-xs text-red-500">Please enter a valid amount greater than 0</p>
            )}
          </div>

          {/* Investment Summary */}
          {isValidAmount && (
            <div className="p-3 bg-green-50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Investment Summary</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Amount to Invest:</span>
                  <span className="font-medium">{Number(amount).toLocaleString()} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Annual Return:</span>
                  <span className="font-medium text-green-600">~{estimatedReturns.toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span>Return Rate:</span>
                  <span className="font-medium text-green-600">~5% APY</span>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !isValidAmount}
          >
            {isSubmitting ? "Processing..." : "Invest USDC"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
