// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title FundingPoolStorage - Storage layout for FundingPool
contract FundingPoolStorage {
    /// @notice Information about a funder
    struct Funder {
        uint256 principal;         // Amount of stablecoin originally deposited by the funder and currently locked in the pool (excludes interest)
        uint256 interestDebt;      // Interest per share already credited to this funder
        uint256 pendingInterest;   // Interest accrued but not yet withdrawn
    }

    /// @notice Information about a loan
    struct Loan {
        uint256 amount;           // Amount borrowed
        address borrower;         // Address of the borrower
        bool repaid;              // Whether the loan has been repaid
        uint256 principalAtCreation; // Total principal in pool when loan was created
        uint256 remainingAmount;  // Remaining amount to be repaid
        uint256 totalRepaid;      // Total amount repaid so far
    }

    // --- Storage Variables ---
    address public usdcWallet; // The USDC wallet address used for repayments
    address[] public backends; // List of authorized backend addresses

    /// @notice The ERC20 stablecoin used for all operations
    IERC20 public immutable stablecoin;

    address public immutable deployer; // The contract deployer (can set backends)

    // Maps loan ID to Loan struct. Stores all loans, both active and repaid.
    mapping(uint256 => Loan) public loans;
    // Maps funder address to Funder struct
    mapping(address => Funder) public funders;
    // Maps borrower address to their current active loan ID (0 if none). Used for O(1) lookup and enforcing one active loan per borrower.
    mapping(address => uint256) public activeLoanOf;
    // List of all funder addresses (addresses are removed when principal is zero)
    address[] public funderList;

    uint256 public nextLoanId; // Incremented for each new loan
    uint256 public totalPrincipal; // Total principal locked in the pool
    uint256 public accInterestPerShare; // Accumulated interest per principal (scaled by ACC_PRECISION)
} 