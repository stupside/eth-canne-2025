// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/// @title IFundingPool - Interface for FundingPool contract
interface IFundingPool {
    function repayAmountForLoan(uint256 loanId_, uint256 installmentAmount) external;
    
    function setBackends(address[] calldata newBackends) external;
    function getBackends() external view returns (address[] memory);

    function setUsdcWallet(address newUsdcWallet) external;
    
    function depositPrincipal(uint256 amount) external;

    function withdrawPrincipal() external;
    function withdrawPrincipalAmount(uint256 amount) external;

    function requestFundingForBorrower(address borrower, uint256 amount, uint256 expectedAmount) external;

    function getLoanInfo(uint256 loanId_) external view returns (
        uint256 amount,
        address borrower,
        bool repaid,
        uint256 remainingAmount,
        uint256 totalRepaid
    );

    function getFunderInfo(address funderAddr) external view returns (uint256 principal, uint256 pendingInterest, uint256 interestDebt);

    function canRequestFunding(uint256 amount) external view returns (bool);

    function withdrawInterest() external;
} 