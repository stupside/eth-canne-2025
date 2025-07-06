// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

event Repaid(address indexed borrower, uint256 principal, uint256 interest, uint256 loanId);
event InstallmentPaid(address indexed borrower, uint256 installmentAmount, uint256 remainingAmount, uint256 loanId);
event Funded(address indexed borrower, uint256 amount, uint256 loanId);
event Deposited(address indexed funder, uint256 amount);
event Withdrawn(address indexed funder, uint256 amount, uint256 interest); 