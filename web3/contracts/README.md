# FundingPool Contract

## Overview

`FundingPool` is a fair, time-weighted lending pool for multiple borrowers and funders using a stablecoin (e.g., USDC). It allows funders to deposit stablecoins, which are then lent out to borrowers. Interest from loans is distributed fairly among funders based on their principal and the time their funds were locked in the pool.

## Architecture

- **Main Contract:** `FundingPool.sol`
- **Storage Layout:** Defined in `modules/FundingPoolStorage.sol`
- **Events:** Defined in `modules/FundingPoolEvents.sol`
- **Custom Errors:** Defined in `modules/FundingPoolErrors.sol`
- **Interface:** `interfaces/IFundingPool.sol`

### Key Data Structures
- **Funder:**
  - `principal`: Amount of stablecoin deposited and currently locked (excludes interest)
  - `pointsDebt`: Points already credited to this funder
  - `interestEarned`: Interest earned but not withdrawn
- **Loan:**
  - `start`: Timestamp when the loan started
  - `amount`: Amount borrowed
  - `interest`: Interest paid on repayment
  - `borrower`: Address of the borrower
  - `pointsSnapshot`: Points per principal at loan start
  - `repaid`: Whether the loan has been repaid

### Main Storage Variables
- `usdcWallet`: Address used for repayments
- `backends`: List of authorized backend addresses (can create/repay loans)
- `stablecoin`: The ERC20 stablecoin used
- `deployer`: The contract deployer (admin)
- `loans`: Mapping of loan ID to Loan struct
- `funders`: Mapping of funder address to Funder struct
- `activeLoanOf`: Mapping of borrower address to their current active loan ID
- `funderList`: List of all funder addresses
- `lastUpdate`, `nextLoanId`, `totalPrincipal`, `accPointsPerPrincipal`: Global accounting variables
- `loanFunderPrincipal`: Snapshots each funder's principal at the time of each loan

## Algorithm & Flow

### 1. Deposit
- Funders deposit stablecoin via `depositPrincipal(amount)`.
- Their principal is tracked, and they are added to `funderList` if new.

### 2. Loan Request
- Only authorized backends can call `requestFundingForBorrower(borrower, amount)`.
- Checks:
  - Borrower has no active loan
  - Amount > 0 and <= total pool principal
- A new loan is created, and the borrower's `activeLoanOf` is set.
- Each funder's principal is snapshotted for fair interest distribution.
- Funds are transferred to the borrower.

### 3. Repayment
- Only backends can call `repayAmountForLoan(loanId, amount)`.
- Checks:
  - Loan not already repaid
  - Amount >= principal (must include interest)
  - Interest > 0
- Repayment is transferred from the `usdcWallet`.
- Interest is distributed to funders based on their principal at loan start and time-weighted points.
- Loan is marked as repaid, and principal is returned to the pool.

### 4. Withdrawal
- Funders can call `withdrawFunderBalance()` to withdraw their principal and earned interest.
- If their principal becomes zero, they are removed from `funderList`.

### 5. Info & Admin
- `getFunderInfo(address)`: Returns a funder's principal, points, and interest earned.
- `canRequestFunding(amount)`: Checks if a borrower can request a loan.
- `setBackends(addresses)`, `setUsdcWallet(address)`: Admin functions for deployer only.

## Interest Distribution Algorithm
- Uses a time-weighted points system (`accPointsPerPrincipal`) to fairly distribute interest based on how long and how much each funder contributed.
- At loan creation, each funder's principal is snapshotted.
- When a loan is repaid, interest is distributed proportionally to funders' points accrued during the loan.
- Late depositors (after loan start) do not receive interest for that loan.

## Events
- `Deposited(funder, amount)`
- `Funded(borrower, amount, loanId)`
- `Repaid(borrower, principal, interest, loanId)`
- `Withdrawn(funder, amount, interest)`

## Custom Errors
- `ZeroAmount()`, `NoActiveLoan()`, `NoInterestPaid()`, `NothingToWithdraw()`, `LoanAlreadyRepaid()`, `AlreadyHasActiveLoan()`, `InsufficientPoolFunds()`

## Edge Cases & Protections
- Borrowers can only have one active loan at a time.
- Funders who withdraw before a loan do not receive interest for that loan.
- Depositing zero or requesting a zero/insufficient loan reverts.
- Only authorized backends can create/repay loans; only deployer can set backends or USDC wallet.
- Interest is only distributed if actually paid (no zero-interest repayments).

## Example Scenarios
- Multiple funders, multiple loans: Interest is distributed fairly based on time and amount.
- Funder withdraws and redeposits: Only principal present during a loan accrues interest for that loan.
- Late depositors: Do not receive interest for loans already in progress.
- All funds loaned out: No points accumulate until funds are returned.

---

For more details, see the contract code and tests in this folder. 