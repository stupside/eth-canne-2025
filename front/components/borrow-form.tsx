"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle } from "lucide-react"
import { usePoolInfo } from "@/lib/wallet-actions"

interface BorrowFormProps {
  wallet: `0x${string}`
}

export function BorrowForm({ wallet }: BorrowFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    amount: "",
    payments: "",
    frequency: "",
  })

  const poolInfo = usePoolInfo()
  const amount = Number(formData.amount) || 0

  const isValidAmount = amount > 0 && amount <= (poolInfo?.totalPoolAmount || 0)
  const isValidPayments = Number(formData.payments) > 0
  const isValidFrequency = formData.frequency === "weekly" || formData.frequency === "monthly"

  const isFormValid = isValidAmount && isValidPayments && isValidFrequency

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!isFormValid) {
      setError("Please fill in all fields correctly")
      return
    }

    // Additional validation for pool amount
    if (amount > (poolInfo?.totalPoolAmount || 0)) {
      setError(`Cannot borrow more than available pool funds ($${poolInfo?.totalPoolAmount?.toLocaleString() || 0})`)
      return
    }

    if ((poolInfo?.totalPoolAmount || 0) <= 0) {
      setError("Pool has no available funds for borrowing")
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        user: {
          wallet: wallet,
        },
        order: {
          amount: amount,
          currency: "USD",
          payments: Number(formData.payments),
          frequency: formData.frequency as "weekly" | "monthly",
        },
      }

      const response = await fetch("https://back.xonery.dev/gocardless/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        const { authorisationUrl } = data

        setSuccess("Borrow request submitted successfully! Redirecting to payment...")
        setFormData({ amount: "", payments: "", frequency: "" })

        // Open payment URL in new tab
        window.open(authorisationUrl, "_blank")
      } else {
        setError("Failed to submit borrow request. Please try again.")
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      setError("Error submitting borrow request. Please check your connection and try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Request New Loan</CardTitle>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pool Information Section */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Pool Information</h4>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Available to Borrow:</span>
              <span className="text-sm font-medium text-green-600">
                ${poolInfo?.totalPoolAmount?.toLocaleString() || 0}
              </span>
            </div>
          </div>

          {/* Loan Amount Section */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">
              Loan Amount (USD)
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              max={poolInfo?.totalPoolAmount || 0}
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="Enter amount in USD"
              required
              className={!isValidAmount && formData.amount ? "border-red-500" : ""}
            />
            {!isValidAmount && formData.amount && (
              <div className="space-y-1">
                {amount <= 0 && (
                  <p className="text-xs text-red-500">Please enter a valid amount greater than 0</p>
                )}
                {amount > 0 && amount > (poolInfo?.totalPoolAmount || 0) && (
                  <p className="text-xs text-red-500">
                    Amount exceeds available pool funds (${poolInfo?.totalPoolAmount?.toLocaleString() || 0})
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Payment Terms Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payments" className="text-sm font-medium">
                Number of Payments
              </Label>
              <Input
                id="payments"
                type="number"
                min="1"
                value={formData.payments}
                onChange={(e) => setFormData({ ...formData, payments: e.target.value })}
                placeholder="e.g., 12"
                required
                className={!isValidPayments && formData.payments ? "border-red-500" : ""}
              />
              {!isValidPayments && formData.payments && (
                <p className="text-xs text-red-500">Please enter a valid number</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency" className="text-sm font-medium">
                Payment Frequency
              </Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger className={!isValidFrequency && formData.frequency ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              {!isValidFrequency && formData.frequency && (
                <p className="text-xs text-red-500">Please select a frequency</p>
              )}
            </div>
          </div>

          {/* Loan Summary */}
          {isFormValid && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Loan Summary</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="font-medium">${amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payments:</span>
                  <span className="font-medium">{formData.payments} × {formData.frequency}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Payment:</span>
                  <span className="font-medium">
                    ${(amount / Number(formData.payments)).toFixed(2)} per {formData.frequency.slice(0, -2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || !isFormValid || !poolInfo?.totalPoolAmount}
            className="w-full"
          >
            {isSubmitting ? "Processing..." : "Submit Loan Request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
