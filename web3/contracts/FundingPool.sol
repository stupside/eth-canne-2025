// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IFundingPool.sol";

import "./modules/FundingPoolEvents.sol";
import "./modules/FundingPoolErrors.sol";
import "./modules/FundingPoolStorage.sol";

/// @title FundingPool - A fair, time-weighted lending pool for multiple borrowers and funders using stablecoin
contract FundingPool is IFundingPool, FundingPoolStorage {
    using SafeERC20 for IERC20;

    /// @notice Precision for time-weighted accounting
    uint256 public constant ACC_PRECISION = 1e18;

    /// @notice Deploy the FundingPool with the stablecoin token address
    /// @param stablecoinAddress The address of the ERC20 stablecoin contract
    constructor(address stablecoinAddress) {
        deployer = msg.sender;
        stablecoin = IERC20(stablecoinAddress);
    }

    /// @dev Restricts function to only deployer address
    modifier onlyDeployer() {
        require(msg.sender == deployer, "Only deployer can call this");
        _;
    }

    /// @dev Restricts function to only backend addresses
    modifier onlyBackend() {
        require(_isBackend(msg.sender), "Only backend can authorize");
        _;
    }

    /// @dev Updates the funder's accrued interest and sets their interestDebt
    modifier updateFunder(address funderAddr) {
        _updateFunderInterest(funderAddr);
        _;
    }

    /// @notice Set the list of backend addresses (only deployer)
    function setBackends(address[] calldata newBackends) external onlyDeployer {
        backends = newBackends;
    }

    // @notice Get the list of backend addresses
    function getBackends() external view returns (address[] memory) {
        return backends;
    }

    /// @notice Set the USDC wallet address (only deployer)
    function setUsdcWallet(address newUsdcWallet) external onlyDeployer {
        usdcWallet = newUsdcWallet;
    }

    /// @notice Deposit stablecoin to become a funder
    /// @param amount The amount to deposit
    function depositPrincipal(uint256 amount) external updateFunder(msg.sender) {
        if (amount == 0) revert ZeroAmount();
        
        Funder storage funder = funders[msg.sender];
        if (funder.principal == 0) {
            funderList.push(msg.sender);
        }
        
        stablecoin.safeTransferFrom(msg.sender, address(this), amount);
        funder.principal += amount;
        totalPrincipal += amount;
        
        emit Deposited(msg.sender, amount);
    }

    /// @notice Withdraw principal (original deposit)
    function withdrawPrincipal() external {
        // Update interest first, then check principal
        _updateFunderInterest(msg.sender);
        
        Funder storage funder = funders[msg.sender];
        uint256 amount = funder.principal;
        if (amount == 0) revert NothingToWithdraw();
        
        funder.principal = 0;
        totalPrincipal -= amount;
        _removeFunderFromList(msg.sender);
        
        stablecoin.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount, 0);
    }

    /// @notice Withdraw a specific amount of principal
    /// @param amount The amount to withdraw
    function withdrawPrincipalAmount(uint256 amount) external {
        // Update interest first, then check principal
        _updateFunderInterest(msg.sender);
        
        Funder storage funder = funders[msg.sender];
        if (amount == 0) revert ZeroAmount();
        if (amount > funder.principal) revert InsufficientFunds();

        funder.principal -= amount;
        totalPrincipal -= amount;
        
        // Remove from funderList if principal becomes 0
        if (funder.principal == 0) {
            _removeFunderFromList(msg.sender);
        }
        
        stablecoin.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount, 0);
    }

    /// @notice Withdraw only accrued interest (does not touch principal)
    function withdrawInterest() external {
        // Update interest first, then check pending interest
        _updateFunderInterest(msg.sender);
        
        Funder storage funder = funders[msg.sender];
        uint256 interest = funder.pendingInterest;
        if (interest == 0) revert NothingToWithdraw();
        
        funder.pendingInterest = 0;
        stablecoin.safeTransfer(msg.sender, interest);
        emit Withdrawn(msg.sender, 0, interest);
    }

    /// @notice Backend-authorized: Create a loan for a borrower
    /// @param borrower The address of the borrower
    /// @param amount The amount to borrow
    function requestFundingForBorrower(address borrower, uint256 amount, uint256 expectedAmount) external onlyBackend {
        if (activeLoanOf[borrower] != 0) revert AlreadyHasActiveLoan();
        if (amount == 0) revert ZeroAmount();
        if (amount > totalPrincipal) revert InsufficientPoolFunds();
        if (expectedAmount < amount) revert ExpectedAmountLessThanAmount();
        
        totalPrincipal -= amount;
        nextLoanId++;
        
        loans[nextLoanId] = Loan({
            amount: amount,
            borrower: borrower,
            repaid: false,
            principalAtCreation: totalPrincipal + amount,
            remainingAmount: expectedAmount,
            totalRepaid: 0
        });
        
        activeLoanOf[borrower] = nextLoanId;
        stablecoin.safeTransfer(borrower, amount);
        
        emit Funded(borrower, amount, nextLoanId);
    }

    /// @notice Repay a loan in installments
    /// @param loanId_ The ID of the loan to repay
    /// @param installmentAmount The amount to pay in this installment
    function repayAmountForLoan(uint256 loanId_, uint256 installmentAmount) external onlyBackend {
        Loan storage loan = loans[loanId_];
        if (loan.repaid) revert LoanAlreadyRepaid();
        if (installmentAmount == 0) revert ZeroAmount();
        if (installmentAmount > loan.remainingAmount) revert InvalidInstallmentAmount();
        
        stablecoin.safeTransferFrom(usdcWallet, address(this), installmentAmount);
        
        loan.totalRepaid += installmentAmount;
        loan.remainingAmount -= installmentAmount;
        
        // Check if loan is fully repaid
        if (loan.remainingAmount == 0) {
            loan.repaid = true;
            activeLoanOf[loan.borrower] = 0;
            totalPrincipal += loan.amount;
            
            // Calculate total interest paid
            uint256 totalInterest = loan.totalRepaid - loan.amount;
            if (totalInterest > 0) {
                _distributeInterest(totalInterest, loan.principalAtCreation);
            }
            
            emit Repaid(loan.borrower, loan.amount, totalInterest, loanId_);
        } else {
            emit InstallmentPaid(loan.borrower, installmentAmount, loan.remainingAmount, loanId_);
        }
    }

    /// @notice Get funder info
    /// @param funderAddr The address of the funder
    /// @return principal The funder's principal
    /// @return pendingInterest The funder's pending interest
    /// @return interestDebt The funder's interest debt
    function getFunderInfo(address funderAddr) external view returns (uint256 principal, uint256 pendingInterest, uint256 interestDebt) {
        Funder storage funder = funders[funderAddr];
        uint256 upToDatePending = funder.pendingInterest;
        
        if (funder.principal > 0) {
            uint256 accrued = (funder.principal * (accInterestPerShare - funder.interestDebt)) / ACC_PRECISION;
            upToDatePending += accrued;
        }
        
        return (funder.principal, upToDatePending, funder.interestDebt);
    }

    /// @notice Returns true if a loan can be requested for the given amount by the sender
    /// @param amount The amount to check
    /// @return True if funding can be requested
    function canRequestFunding(uint256 amount) external view returns (bool) {
        return activeLoanOf[msg.sender] == 0 && amount > 0 && amount <= totalPrincipal;
    }

    /// @notice Get loan information including remaining amount
    /// @param loanId_ The ID of the loan
    /// @return amount The original loan amount
    /// @return borrower The borrower address
    /// @return repaid Whether the loan is fully repaid
    /// @return remainingAmount The remaining amount to be repaid
    /// @return totalRepaid The total amount repaid so far
    function getLoanInfo(uint256 loanId_) external view returns (
        uint256 amount,
        address borrower,
        bool repaid,
        uint256 remainingAmount,
        uint256 totalRepaid
    ) {
        Loan storage loan = loans[loanId_];
        return (loan.amount, loan.borrower, loan.repaid, loan.remainingAmount, loan.totalRepaid);
    }

    /// @dev Check if an address is a backend
    /// @param addr The address to check
    /// @return True if the address is a backend
    function _isBackend(address addr) internal view returns (bool) {
        for (uint256 i = 0; i < backends.length; i++) {
            if (backends[i] == addr) {
                return true;
            }
        }
        return false;
    }

    /// @dev Update a funder's accrued interest
    /// @param funderAddr The address of the funder
    function _updateFunderInterest(address funderAddr) internal {
        Funder storage funder = funders[funderAddr];
        if (funder.principal > 0) {
            uint256 accrued = (funder.principal * (accInterestPerShare - funder.interestDebt)) / ACC_PRECISION;
            funder.pendingInterest += accrued;
        }
        funder.interestDebt = accInterestPerShare;
    }

    /// @dev Distribute interest to all funders
    /// @param interest The interest amount to distribute
    /// @param principalAtCreation The total principal when the loan was created
    function _distributeInterest(uint256 interest, uint256 principalAtCreation) internal {
        if (principalAtCreation > 0) {
            accInterestPerShare += (interest * ACC_PRECISION) / principalAtCreation;
        }
    }

    /// @dev Remove a funder from the funderList
    /// @param funderAddr The address of the funder to remove
    function _removeFunderFromList(address funderAddr) internal {
        for (uint256 i = 0; i < funderList.length; i++) {
            if (funderList[i] == funderAddr) {
                funderList[i] = funderList[funderList.length - 1];
                funderList.pop();
                break;
            }
        }
    }

    /// @notice Get borrower information for the active loan
    /// @param borrowerAddr The address of the borrower
    /// @return loanAmount The original loan amount
    /// @return totalRepaid The total amount repaid so far
    /// @return remainingAmount The remaining amount to be repaid
    function getBorrowerInfo(address borrowerAddr) external view returns (uint256 loanAmount, uint256 totalRepaid, uint256 remainingAmount) {
        uint256 loanId = activeLoanOf[borrowerAddr];
        if (loanId == 0) revert NoActiveLoan();
        
        Loan storage loan = loans[loanId];
        return (loan.amount, loan.totalRepaid, loan.remainingAmount);
    }

    /// @notice Get the active loan ID for a borrower
    /// @param borrowerAddr The address of the borrower
    /// @return The active loan ID, or 0 if no active loan
    function getActiveLoanId(address borrowerAddr) external view returns (uint256) {
        return activeLoanOf[borrowerAddr];
    }
}
    