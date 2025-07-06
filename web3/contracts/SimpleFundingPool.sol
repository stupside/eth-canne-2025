// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title SimpleFundingPool - A basic lending pool for multiple lenders and borrowers dummy version

contract SimpleFundingPool is Ownable {
    using SafeERC20 for IERC20;

    // Token used for deposits/loans
    IERC20 public immutable stablecoin;

    // Pool state
    uint256 public totalPoolAmount;
    uint256 public totalPValue; // Total expected repayments (p value)
    
    // Lender mapping: address => amount deposited
    mapping(address => uint256) public lenderDeposits;
    
    // Borrower mapping: address => loan amount and expected repayment
    mapping(address => uint256) public borrowerLoans;
    mapping(address => uint256) public borrowerExpectedAmounts;

    
    // Useful for resetting the pool
    // Borrower array
    address[] public borrowers;
    // Lender array
    address[] public lenders;
    
    // Events
    event Deposited(address indexed lender, uint256 amount);
    event Withdrawn(address indexed lender, uint256 amount);
    event Borrowed(address indexed borrower, uint256 amount);
    event Repaid(address indexed borrower, uint256 amount);

    uint256 public totalInvestedAmount; // Total amount invested by lenders

    constructor(address _stablecoin) Ownable(msg.sender) {
        stablecoin = IERC20(_stablecoin);
    }

    /// @notice Lender deposits money into the pool
    /// @param amount Amount to deposit
    function depositPrincipal(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        
        stablecoin.safeTransferFrom(msg.sender, address(this), amount);
        lenderDeposits[msg.sender] += amount;
        totalPoolAmount += amount;
        totalInvestedAmount += amount;
        
        // Add to lenders array if not already present
        if (lenderDeposits[msg.sender] == amount) {
            lenders.push(msg.sender);
        }
        
        emit Deposited(msg.sender, amount);
    }

    /// @notice Lender withdraws all their deposited amount
    function withdrawPrincipal() external {
        uint256 amount = lenderDeposits[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        
        lenderDeposits[msg.sender] = 0;
        totalPoolAmount -= amount;
        totalInvestedAmount -= amount;

        
        stablecoin.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Lender withdraws a specific amount
    /// @param amount Amount to withdraw
    function withdrawPrincipalAmount(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(lenderDeposits[msg.sender] >= amount, "Insufficient funds");
        
        lenderDeposits[msg.sender] -= amount;
        totalPoolAmount -= amount;
        totalInvestedAmount -= amount;
        
        stablecoin.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Lender withdraws their proportional share of p value
    /// @dev Calculates proportional share based on lender's contribution to total pool
    function withdrawInterest() external {
        uint256 deposit = lenderDeposits[msg.sender];
        require(totalPoolAmount > 0, "No pool funds available");
        
        // dummy logic
        // Calculate proportional share of p value
        // Lender's share = (lender's deposit / total pool) * total p value
        uint256 proportionalShare = (deposit * totalPValue) / totalPoolAmount;
        
        // subtract the proportional share from the total p value
        totalPValue -= proportionalShare;
        
        stablecoin.safeTransfer(msg.sender, proportionalShare);
        emit Withdrawn(msg.sender, proportionalShare);
    }

    /// @notice Borrower requests a loan
    /// @param amount Amount to borrow
    /// @param expectedAmount Amount expected to be repaid (p value)
    function requestFundingForBorrower(address borrower, uint256 amount, uint256 expectedAmount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(expectedAmount >= amount, "Expected amount must be >= borrowed amount");
        require(totalPoolAmount >= amount, "Insufficient pool funds");
        
        // TODO: Add proper authorization logic
        // For now, anyone can call this (dumb logic)
        
        borrowerLoans[borrower] += amount; // Increment total borrowed amount
        borrowerExpectedAmounts[borrower] += expectedAmount; // Track expected repayment
        totalPoolAmount -= amount;
        
        // Add to borrowers array if not already present
        if (borrowerLoans[borrower] == amount) {
            borrowers.push(borrower);
        }
        
        stablecoin.safeTransfer(borrower, amount);
        emit Borrowed(borrower, amount);
    }

    /// @notice Intermediate wallet repays loan in installments on behalf of borrower
    /// @param borrowerAddr The address of the borrower whose loan is being repaid
    /// @param installmentAmount Amount to repay
    function repayAmountForLoan(address borrowerAddr, uint256 installmentAmount) external {
        require(installmentAmount > 0, "Amount must be greater than 0");
        require(borrowerExpectedAmounts[borrowerAddr] >= installmentAmount, "Repayment exceeds loan amount");
        
        stablecoin.safeTransferFrom(msg.sender, address(this), installmentAmount);
        
        borrowerLoans[borrowerAddr] -= installmentAmount;
        borrowerExpectedAmounts[borrowerAddr] -= installmentAmount;
        totalPoolAmount += installmentAmount;
        
        // if loan is fully repaid increment the p value global
        if (borrowerLoans[borrowerAddr] == 0) {
            totalPValue += borrowerExpectedAmounts[borrowerAddr];
        }
        
        emit Repaid(borrowerAddr, installmentAmount);
    }

    /// @notice Get lender info
    /// @param funderAddr Lender address
    function getFunderInfo(address funderAddr) external view returns (uint256 principal, uint256 pendingInterest) {
        require(totalPoolAmount > 0, "total pool amount is 0");
        uint256 deposit = lenderDeposits[funderAddr];
        uint256 calculatedInterest = (deposit * totalPValue) / totalPoolAmount;
        return (deposit, calculatedInterest);
    }


    /// @notice Get borrower info
    /// @param borrowerAddr Borrower address
    function getBorrowerInfo(address borrowerAddr) external view returns (uint256 remainingAmount) {
        uint256 remaining = borrowerLoans[borrowerAddr];
        return (remaining);
    }

    function getAvailableFunds() external view returns (uint256) {
        return totalPoolAmount;
    }

    /// @notice Get total p value (expected repayments)
    function getTotalPValue() external view returns (uint256) {
        return totalPValue;
    }


    function resetPool() external onlyOwner {
        for (uint256 i = 0; i < borrowers.length; i++) {
            borrowerLoans[borrowers[i]] = 0;
            borrowerExpectedAmounts[borrowers[i]] = 0;
        }
        for (uint256 i = 0; i < lenders.length; i++) {
            lenderDeposits[lenders[i]] = 0;
        }
        // Transfer all funds to an adress
        stablecoin.safeTransfer(msg.sender, totalPoolAmount + totalPValue);
        totalPoolAmount = 0;
        totalPValue = 0;
    }


    function getPoolInfo() external view returns (uint256 poolAmount, uint256 pValue, uint256 investedAmount) {
        return (totalPoolAmount, totalPValue, totalInvestedAmount);
    }
} 