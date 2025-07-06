"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { usePoolBorrowerInfo } from "@/lib/wallet-actions"

interface BorrowPositionProps {
  wallet: `0x${string}`
}

export function BorrowPosition({ wallet }: BorrowPositionProps) {
  const borrowerInfo = usePoolBorrowerInfo()

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800"
      case "overdue":
        return "bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800"
      default:
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 hover:text-yellow-800"
    }
  }

  const getStatusText = () => {
    if (borrowerInfo.remainingAmount <= 0) return "Paid"
    return "Active"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Loan Status</span>
          <Badge className={`text-sm ${getStatusColor(getStatusText().toLowerCase())}`}>
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Outstanding Amount - Prominent Display */}
        {borrowerInfo.remainingAmount > 0 && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4">
            <div className="text-center">
              <p className="text-sm text-red-700 font-medium mb-1">Outstanding Balance</p>
              <p className="text-2xl font-bold text-red-800">${borrowerInfo.remainingAmount.toLocaleString()}</p>
              <p className="text-xs text-red-600 mt-1">Amount remaining to be paid</p>
            </div>
          </div>
        )}

        {/* Loan Details */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
            <p className="text-sm font-medium mt-1">{getStatusText()}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Payment Due</p>
            <p className="text-sm font-medium mt-1">
              {borrowerInfo.remainingAmount > 0 ? "Next Payment" : "Completed"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
