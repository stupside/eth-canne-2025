// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { FundingPool } from "./FundingPool.sol";

import { Test } from "forge-std/Test.sol";

// Minimal ERC20 mock for testing
contract ERC20Mock {
    string public name = "MockToken";
    string public symbol = "MTK";

    uint8 public decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;

        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {

        allowance[msg.sender][spender] = amount;

        emit Approval(msg.sender, spender, amount);

        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");

        balanceOf[to] += amount;
        balanceOf[msg.sender] -= amount;

        emit Transfer(msg.sender, to, amount);

        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");

        balanceOf[from] -= amount;
        allowance[from][msg.sender] -= amount;
        
        balanceOf[to] += amount;
        
        emit Transfer(from, to, amount);

        return true;
    }
}

contract FundingPoolTest is Test {
    FundingPool pool;
    ERC20Mock stablecoin;

    function setUp() public {
        stablecoin = new ERC20Mock();
        pool = new FundingPool(address(stablecoin));
        address funder = address(0x1);
        address backend = address(0x2);
        address usdcWallet = address(0x3);
        // Set backend and usdcWallet
        address[] memory backends = new address[](1);
        backends[0] = backend;
        pool.setBackends(backends);
        pool.setUsdcWallet(usdcWallet);
        // Mint and approve stablecoin for funder and usdcWallet
        stablecoin.mint(funder, 1000 ether);
        vm.prank(funder);
        stablecoin.approve(address(pool), 1000 ether);
        stablecoin.mint(usdcWallet, 1000 ether);
        vm.prank(usdcWallet);
        stablecoin.approve(address(pool), 1000 ether);
    }

    function testDepositPrincipal() public {
        address funder = address(0x1);
        vm.prank(funder);
        pool.depositPrincipal(100 ether);
        (uint256 principal,,) = pool.getFunderInfo(funder);
        assertEq(principal, 100 ether);
    }

    function testRequestFundingAndRepay() public {
        address funder = address(0x1);
        address backend = address(0x2);
        address borrower = address(0x3);
        // Funder deposits
        vm.prank(funder);
        pool.depositPrincipal(200 ether);
        // Backend requests loan for borrower
        vm.prank(backend);
        pool.requestFundingForBorrower(borrower, 100 ether, 110 ether); // 100 principal + 10 interest
        // Simulate time passing
        vm.warp(block.timestamp + 1 hours);
        // Backend repays loan in installments
        uint256 loanId = pool.activeLoanOf(borrower);
        vm.prank(backend);
        pool.repayAmountForLoan(loanId, 60 ether); // First installment
        vm.prank(backend);
        pool.repayAmountForLoan(loanId, 50 ether); // Second installment (total 110 ether = 100 + 10% interest)
        // Debug: check funder info before withdrawal
        (uint256 principal, uint256 pendingInterest, ) = pool.getFunderInfo(funder);
        emit log_named_uint("Funder principal before withdrawal", principal);
        emit log_named_uint("Funder pending interest before withdrawal", pendingInterest);
        emit log_named_uint("Funder stablecoin balance before withdrawal", stablecoin.balanceOf(funder));
        // Funder withdraws interest
        vm.prank(funder);
        pool.withdrawInterest();
        // Funder withdraws principal
        vm.prank(funder);
        pool.withdrawPrincipal();
        // Debug: check funder info and balance after withdrawal
        (principal, pendingInterest, ) = pool.getFunderInfo(funder);
        emit log_named_uint("Funder principal after withdrawal", principal);
        emit log_named_uint("Funder pending interest after withdrawal", pendingInterest);
        emit log_named_uint("Funder stablecoin balance after withdrawal", stablecoin.balanceOf(funder));
        // Funder should have more than initial deposit (earned interest)
        assertGt(stablecoin.balanceOf(funder), 1000 ether);
    }

    function testMultipleFundersInterestDistribution() public {
        address funder1 = address(0x1);
        address funder2 = address(0x2);
        address backend = address(0x3);
        address borrower = address(0x4);
        address usdcWallet = address(0x5);

        // Deploy pool and mint tokens
        ERC20Mock stablecoin2 = new ERC20Mock();
        FundingPool pool2 = new FundingPool(address(stablecoin2));
        address[] memory backends = new address[](1);
        backends[0] = backend;
        vm.prank(pool2.deployer());
        pool2.setBackends(backends);
        vm.prank(pool2.deployer());
        pool2.setUsdcWallet(usdcWallet);

        // Mint and approve for both funders and usdcWallet
        stablecoin2.mint(funder1, 1000 ether);
        stablecoin2.mint(funder2, 1000 ether);
        stablecoin2.mint(usdcWallet, 1000 ether);

        vm.prank(funder1);
        stablecoin2.approve(address(pool2), 1000 ether);
        vm.prank(funder2);
        stablecoin2.approve(address(pool2), 1000 ether);
        vm.prank(usdcWallet);
        stablecoin2.approve(address(pool2), 1000 ether);

        // Both funders deposit
        vm.prank(funder1);
        pool2.depositPrincipal(100 ether);
        vm.prank(funder2);
        pool2.depositPrincipal(200 ether);

        // Backend requests loan for borrower
        vm.prank(backend);
        pool2.requestFundingForBorrower(borrower, 150 ether, 165 ether); // 150 principal + 15 interest

        // Simulate time passing
        vm.warp(block.timestamp + 1 hours);

        // Backend repays loan in installments
        uint256 loanId = pool2.activeLoanOf(borrower);
        vm.prank(backend);
        pool2.repayAmountForLoan(loanId, 100 ether); // First installment
        vm.prank(backend);
        pool2.repayAmountForLoan(loanId, 65 ether); // Second installment (total 165 ether = 150 + 10% interest)

        // Both funders withdraw interest
        vm.prank(funder1);
        pool2.withdrawInterest();
        vm.prank(funder2);
        pool2.withdrawInterest();
        // Both funders withdraw principal
        vm.prank(funder1);
        pool2.withdrawPrincipal();
        vm.prank(funder2);
        pool2.withdrawPrincipal();

        // Check balances
        uint256 funder1Final = stablecoin2.balanceOf(funder1);
        uint256 funder2Final = stablecoin2.balanceOf(funder2);
        emit log_named_uint("Funder1 final balance", funder1Final);
        emit log_named_uint("Funder2 final balance", funder2Final);

        // Funder1 should get 1/3 of the interest, funder2 2/3
        assertApproxEqAbs(funder1Final, 1005 ether, 1);
        assertApproxEqAbs(funder2Final, 1010 ether, 1);
    }

    function testManyFundersManyLoans() public {
        uint256 numFunders = 10;
        address[] memory funders = new address[](numFunders);
        ERC20Mock stablecoin2 = new ERC20Mock();
        FundingPool pool2 = new FundingPool(address(stablecoin2));
        address backend = address(0xBEEF);
        address usdcWallet = address(0xD00D);
        address[] memory backends = new address[](1);
        backends[0] = backend;
        vm.prank(pool2.deployer());
        pool2.setBackends(backends);
        vm.prank(pool2.deployer());
        pool2.setUsdcWallet(usdcWallet);
        // Mint and approve for all funders and usdcWallet
        for (uint256 i = 0; i < numFunders; i++) {
            funders[i] = address(uint160(0x100 + i));
            stablecoin2.mint(funders[i], 1000 ether);
            vm.prank(funders[i]);
            stablecoin2.approve(address(pool2), 1000 ether);
            vm.prank(funders[i]);
            pool2.depositPrincipal((i + 1) * 10 ether); // increasing deposit
        }
        stablecoin2.mint(usdcWallet, 10000 ether);
        vm.prank(usdcWallet);
        stablecoin2.approve(address(pool2), 10000 ether);
        // Multiple loans and repayments, each with a unique borrower
        for (uint256 l = 0; l < 3; l++) {
            address borrower = address(uint160(0xCAFE + l));
            vm.prank(backend);
            pool2.requestFundingForBorrower(borrower, 100 ether, 110 ether); // 100 principal + 10 interest
            vm.warp(block.timestamp + 1 hours);
            uint256 loanId = pool2.activeLoanOf(borrower);
            vm.prank(backend);
            pool2.repayAmountForLoan(loanId, 60 ether); // First installment
            vm.prank(backend);
            pool2.repayAmountForLoan(loanId, 50 ether); // Second installment (total 110 ether)
        }
        // All funders withdraw
        for (uint256 i = 0; i < numFunders; i++) {
            vm.prank(funders[i]);
            pool2.withdrawPrincipal();
            emit log_named_uint("Funder final balance", stablecoin2.balanceOf(funders[i]));
        }
    }

    function testFunderWithdrawsAndRedeopsits() public {
        address funder = address(0x1);
        address backend = address(0x2);
        address borrower = address(0x3);
        address usdcWallet = address(0x4);
        ERC20Mock stablecoin2 = new ERC20Mock();
        FundingPool pool2 = new FundingPool(address(stablecoin2));
        address[] memory backends = new address[](1);
        backends[0] = backend;
        vm.prank(pool2.deployer());
        pool2.setBackends(backends);
        vm.prank(pool2.deployer());
        pool2.setUsdcWallet(usdcWallet);
        stablecoin2.mint(funder, 2000 ether);
        stablecoin2.mint(usdcWallet, 1000 ether);
        vm.prank(funder);
        stablecoin2.approve(address(pool2), 2000 ether);
        vm.prank(usdcWallet);
        stablecoin2.approve(address(pool2), 1000 ether);
        // First deposit and loan
        vm.prank(funder);
        pool2.depositPrincipal(100 ether);
        vm.prank(backend);
        pool2.requestFundingForBorrower(borrower, 100 ether, 110 ether); // 100 principal + 10 interest
        vm.warp(block.timestamp + 1 hours);
        uint256 loanId = pool2.activeLoanOf(borrower);
        vm.prank(backend);
        pool2.repayAmountForLoan(loanId, 60 ether); // First installment
        vm.prank(backend);
        pool2.repayAmountForLoan(loanId, 50 ether); // Second installment (total 110 ether)
        vm.prank(funder);
        pool2.withdrawPrincipal();
        // Re-deposit and another loan with a new borrower
        address borrower2 = address(0x5);
        vm.prank(funder);
        pool2.depositPrincipal(200 ether);
        vm.prank(backend);
        pool2.requestFundingForBorrower(borrower2, 200 ether, 220 ether); // 200 principal + 20 interest
        vm.warp(block.timestamp + 1 hours);
        loanId = pool2.activeLoanOf(borrower2);
        vm.prank(backend);
        pool2.repayAmountForLoan(loanId, 120 ether); // First installment
        vm.prank(backend);
        pool2.repayAmountForLoan(loanId, 100 ether); // Second installment (total 220 ether)
        vm.prank(funder);
        pool2.withdrawPrincipal();
        emit log_named_uint("Funder final balance after redeposit", stablecoin2.balanceOf(funder));
    }

    function testAllFundsLoanedOutNoPointsAccumulate() public {
        address funder = address(0x1);
        address backend = address(0x2);
        address borrower = address(0x3);
        address usdcWallet = address(0x4);
        ERC20Mock stablecoin2 = new ERC20Mock();
        FundingPool pool2 = new FundingPool(address(stablecoin2));
        address[] memory backends = new address[](1);
        backends[0] = backend;
        vm.prank(pool2.deployer());
        pool2.setBackends(backends);
        vm.prank(pool2.deployer());
        pool2.setUsdcWallet(usdcWallet);
        stablecoin2.mint(funder, 1000 ether);
        stablecoin2.mint(usdcWallet, 1000 ether);
        vm.prank(funder);
        stablecoin2.approve(address(pool2), 1000 ether);
        vm.prank(usdcWallet);
        stablecoin2.approve(address(pool2), 1000 ether);
        vm.prank(funder);
        pool2.depositPrincipal(100 ether);
        vm.prank(backend);
        pool2.requestFundingForBorrower(borrower, 100 ether, 110 ether); // 100 principal + 10 interest
        // All funds loaned out, simulate time passing
        vm.warp(block.timestamp + 1 hours);
        uint256 loanId = pool2.activeLoanOf(borrower);
        vm.prank(backend);
        pool2.repayAmountForLoan(loanId, 60 ether); // First installment
        vm.prank(backend);
        pool2.repayAmountForLoan(loanId, 50 ether); // Second installment (total 110 ether)
        vm.prank(funder);
        pool2.withdrawPrincipal();
        emit log_named_uint("Funder final balance after all funds loaned out", stablecoin2.balanceOf(funder));
    }

    

    function testOneFunderWithdrawsEarly() public {
        address funder1 = address(0x1);
        address funder2 = address(0x2);
        address backend = address(0x3);
        address borrower = address(0x4);
        address usdcWallet = address(0x5);
        ERC20Mock stablecoin2 = new ERC20Mock();
        FundingPool pool2 = new FundingPool(address(stablecoin2));
        address[] memory backends = new address[](1);
        backends[0] = backend;
        vm.prank(pool2.deployer());
        pool2.setBackends(backends);
        vm.prank(pool2.deployer());
        pool2.setUsdcWallet(usdcWallet);
        stablecoin2.mint(funder1, 1000 ether);
        stablecoin2.mint(funder2, 1000 ether);
        stablecoin2.mint(usdcWallet, 1000 ether);
        vm.prank(funder1);
        stablecoin2.approve(address(pool2), 1000 ether);
        vm.prank(funder2);
        stablecoin2.approve(address(pool2), 1000 ether);
        vm.prank(usdcWallet);
        stablecoin2.approve(address(pool2), 1000 ether);
        // Both funders deposit
        vm.prank(funder1);
        pool2.depositPrincipal(100 ether);
        vm.prank(funder2);
        pool2.depositPrincipal(200 ether);
        // Funder1 withdraws before loan
        vm.prank(funder1);
        pool2.withdrawPrincipal();
        // Backend requests loan for borrower
        vm.prank(backend);
        pool2.requestFundingForBorrower(borrower, 150 ether, 165 ether); // 150 principal + 15 interest
        vm.warp(block.timestamp + 1 hours);
        uint256 loanId = pool2.activeLoanOf(borrower);
        vm.prank(backend);
        pool2.repayAmountForLoan(loanId, 165 ether);
        // Funder2 withdraws
        vm.prank(funder2);
        pool2.withdrawPrincipal();
        emit log_named_uint("Funder2 final balance after early withdrawal by funder1", stablecoin2.balanceOf(funder2));
    }

    function testNoInterestForLateDepositor() public {
        address funder1 = address(0x1);
        address funder2 = address(0x2);
        address backend = address(0x3);
        address borrower = address(0x4);
        address usdcWallet = address(0x5);
        ERC20Mock stablecoin2 = new ERC20Mock();
        FundingPool pool2 = new FundingPool(address(stablecoin2));
        address[] memory backends = new address[](1);
        backends[0] = backend;
        vm.prank(pool2.deployer());
        pool2.setBackends(backends);
        vm.prank(pool2.deployer());
        pool2.setUsdcWallet(usdcWallet);
        stablecoin2.mint(funder1, 1000 ether);
        stablecoin2.mint(funder2, 1000 ether);
        stablecoin2.mint(usdcWallet, 1000 ether);
        vm.prank(funder1);
        stablecoin2.approve(address(pool2), 1000 ether);
        vm.prank(funder2);
        stablecoin2.approve(address(pool2), 1000 ether);
        vm.prank(usdcWallet);
        stablecoin2.approve(address(pool2), 1000 ether);
        // Funder1 deposits 200 ether and loan is made for 100 ether
        vm.prank(funder1);
        pool2.depositPrincipal(200 ether);
        vm.prank(backend);
        pool2.requestFundingForBorrower(borrower, 100 ether, 110 ether); // 100 principal + 10 interest
        // Simulate time passing during the loan
        vm.warp(block.timestamp + 1 hours);
        // Funder2 tries to game the system by depositing just before repayment
        vm.prank(funder2);
        pool2.depositPrincipal(100 ether);
        // Backend repays loan (principal + interest)
        uint256 loanId = pool2.activeLoanOf(borrower);
        vm.prank(backend);
        pool2.repayAmountForLoan(loanId, 60 ether); // First installment
        vm.prank(backend);
        pool2.repayAmountForLoan(loanId, 50 ether); // Second installment (total 110 ether)
        // Both funders withdraw
        vm.prank(funder1);
        pool2.withdrawPrincipal();
        vm.prank(funder2);
        pool2.withdrawPrincipal();
        // Funder1 should get all the interest, funder2 should get only their principal
        uint256 funder1Final = stablecoin2.balanceOf(funder1);
        uint256 funder2Final = stablecoin2.balanceOf(funder2);
        emit log_named_uint("Funder1 final balance (should get interest)", funder1Final);
        emit log_named_uint("Funder2 final balance (should NOT get interest)", funder2Final);
        assertEq(funder2Final, 1000 ether);
    }

    function testDepositZeroAmountReverts() public {
        address funder = address(0x1);
        vm.prank(funder);
        vm.expectRevert();
        pool.depositPrincipal(0);
    }

    function testRequestLoanZeroAmountReverts() public {
        address backend = address(0x2);
        address borrower = address(0x3);
        vm.prank(backend);
        vm.expectRevert();
        pool.requestFundingForBorrower(borrower, 0, 110 ether);
    }

    function testRequestLoanInsufficientFundsReverts() public {
        address backend = address(0x2);
        address borrower = address(0x3);
        // No deposit, so pool has 0 principal
        vm.prank(backend);
        vm.expectRevert();
        pool.requestFundingForBorrower(borrower, 1 ether, 110 ether);
    }

    function testWithdrawZeroBalanceReverts() public {
        address funder = address(0x1);
        vm.prank(funder);
        vm.expectRevert();
        pool.withdrawPrincipal();
    }

    function testNonBackendCannotRequestLoan() public {
        address notBackend = address(0x4);
        address borrower = address(0x5);
        vm.prank(notBackend);
        vm.expectRevert();
        pool.requestFundingForBorrower(borrower, 1 ether, 110 ether);
    }

    function testNonDeployerCannotSetBackendsOrUsdcWallet() public {
        address notDeployer = address(0x6);
        address[] memory newBackends = new address[](1);
        newBackends[0] = address(0x7);
        vm.prank(notDeployer);
        vm.expectRevert();
        pool.setBackends(newBackends);

        vm.prank(notDeployer);
        vm.expectRevert();
        pool.setUsdcWallet(address(0x8));
    }

    function testBorrowerCannotHaveTwoActiveLoans() public {
        address funder = address(0x1);
        address backend = address(0x2);
        address borrower = address(0x3);
        // Funder deposits
        vm.prank(funder);
        pool.depositPrincipal(200 ether);
        // Backend requests first loan for borrower
        vm.prank(backend);
        pool.requestFundingForBorrower(borrower, 100 ether, 110 ether); // 100 principal + 10 interest
        // Try to request a second loan for the same borrower before repayment
        vm.prank(backend);
        vm.expectRevert();
        pool.requestFundingForBorrower(borrower, 50 ether, 110 ether);
    }

    // ===== NEW TESTS FOR WITHDRAWAL FUNCTIONS =====

    function testWithdrawPrincipalBasic() public {
        address funder = address(0x1);
        
        // Deposit principal
        vm.prank(funder);
        pool.depositPrincipal(100 ether);
        
        // Check funder info before withdrawal
        (uint256 principal, uint256 pendingInterest, ) = pool.getFunderInfo(funder);
        assertEq(principal, 100 ether);
        assertEq(pendingInterest, 0);
        
        // Withdraw principal
        vm.prank(funder);
        pool.withdrawPrincipal();
        
        // Check funder info after withdrawal
        (principal, pendingInterest, ) = pool.getFunderInfo(funder);
        assertEq(principal, 0);
        assertEq(pendingInterest, 0);
        
        // Check balance
        assertEq(stablecoin.balanceOf(funder), 1000 ether); // Should have original balance back
    }

    function testWithdrawPrincipalAmountBasic() public {
        address funder = address(0x1);
        
        // Deposit principal
        vm.prank(funder);
        pool.depositPrincipal(100 ether);
        
        // Withdraw partial amount
        vm.prank(funder);
        pool.withdrawPrincipalAmount(50 ether);
        
        // Check funder info after partial withdrawal
        (uint256 principal, uint256 pendingInterest, ) = pool.getFunderInfo(funder);
        assertEq(principal, 50 ether);
        assertEq(pendingInterest, 0);
        
        // Withdraw remaining amount
        vm.prank(funder);
        pool.withdrawPrincipalAmount(50 ether);
        
        // Check funder info after full withdrawal
        (principal, pendingInterest, ) = pool.getFunderInfo(funder);
        assertEq(principal, 0);
        assertEq(pendingInterest, 0);
    }

    function testWithdrawPrincipalAfterInterestAccrual() public {
        address funder = address(0x1);
        address backend = address(0x2);
        address borrower = address(0x3);
        address usdcWallet = address(0x4);
        
        // Setup and deposit
        vm.prank(funder);
        pool.depositPrincipal(100 ether);
        
        // Create and repay loan to generate interest
        vm.prank(backend);
        pool.requestFundingForBorrower(borrower, 50 ether, 55 ether);
        
        vm.warp(block.timestamp + 1 hours);
        
        uint256 loanId = pool.activeLoanOf(borrower);
        vm.prank(backend);
        pool.repayAmountForLoan(loanId, 55 ether);
        
        // Check funder info before withdrawal
        (uint256 principal, uint256 pendingInterest, ) = pool.getFunderInfo(funder);
        assertEq(principal, 100 ether);
        assertGt(pendingInterest, 0); // Should have accrued interest
        
        // Withdraw principal (should work correctly)
        vm.prank(funder);
        pool.withdrawPrincipal();
        
        // Check funder info after withdrawal
        (principal, pendingInterest, ) = pool.getFunderInfo(funder);
        assertEq(principal, 0);
        assertGt(pendingInterest, 0); // Interest should still be pending
    }

    function testWithdrawPrincipalAmountAfterInterestAccrual() public {
        address funder = address(0x1);
        address backend = address(0x2);
        address borrower = address(0x3);
        address usdcWallet = address(0x4);
        
        // Setup and deposit
        vm.prank(funder);
        pool.depositPrincipal(100 ether);
        
        // Create and repay loan to generate interest
        vm.prank(backend);
        pool.requestFundingForBorrower(borrower, 50 ether, 55 ether);
        
        vm.warp(block.timestamp + 1 hours);
        
        uint256 loanId = pool.activeLoanOf(borrower);
        vm.prank(backend);
        pool.repayAmountForLoan(loanId, 55 ether);
        
        // Withdraw partial amount
        vm.prank(funder);
        pool.withdrawPrincipalAmount(30 ether);
        
        // Check funder info after partial withdrawal
        (uint256 principal, uint256 pendingInterest, ) = pool.getFunderInfo(funder);
        assertEq(principal, 70 ether);
        assertGt(pendingInterest, 0);
        
        // Withdraw remaining amount
        vm.prank(funder);
        pool.withdrawPrincipalAmount(70 ether);
        
        // Check funder info after full withdrawal
        (principal, pendingInterest, ) = pool.getFunderInfo(funder);
        assertEq(principal, 0);
        assertGt(pendingInterest, 0);
    }

    function testWithdrawPrincipalMultipleTimes() public {
        address funder = address(0x1);
        
        // Deposit principal
        vm.prank(funder);
        pool.depositPrincipal(100 ether);
        
        // First withdrawal should work
        vm.prank(funder);
        pool.withdrawPrincipal();
        
        // Second withdrawal should fail
        vm.prank(funder);
        vm.expectRevert();
        pool.withdrawPrincipal();
    }

    function testWithdrawPrincipalAmountMultipleTimes() public {
        address funder = address(0x1);
        
        // Deposit principal
        vm.prank(funder);
        pool.depositPrincipal(100 ether);
        
        // First partial withdrawal
        vm.prank(funder);
        pool.withdrawPrincipalAmount(30 ether);
        
        // Second partial withdrawal
        vm.prank(funder);
        pool.withdrawPrincipalAmount(40 ether);
        
        // Third partial withdrawal
        vm.prank(funder);
        pool.withdrawPrincipalAmount(30 ether);
        
        // Fourth withdrawal should fail (no principal left)
        vm.prank(funder);
        vm.expectRevert();
        pool.withdrawPrincipalAmount(1 ether);
    }

    function testWithdrawPrincipalAmountExceedsPrincipal() public {
        address funder = address(0x1);
        
        // Deposit principal
        vm.prank(funder);
        pool.depositPrincipal(100 ether);
        
        // Try to withdraw more than principal
        vm.prank(funder);
        vm.expectRevert();
        pool.withdrawPrincipalAmount(150 ether);
    }

    function testWithdrawPrincipalAmountZero() public {
        address funder = address(0x1);
        
        // Deposit principal
        vm.prank(funder);
        pool.depositPrincipal(100 ether);
        
        // Try to withdraw zero amount
        vm.prank(funder);
        vm.expectRevert();
        pool.withdrawPrincipalAmount(0);
    }

    function testWithdrawPrincipalWithNoDeposit() public {
        address funder = address(0x1);
        
        // Try to withdraw without depositing
        vm.prank(funder);
        vm.expectRevert();
        pool.withdrawPrincipal();
    }

    function testWithdrawPrincipalAmountWithNoDeposit() public {
        address funder = address(0x1);
        
        // Try to withdraw without depositing
        vm.prank(funder);
        vm.expectRevert();
        pool.withdrawPrincipalAmount(10 ether);
    }

    function testWithdrawPrincipalAndInterestSeparately() public {
        address funder = address(0x1);
        address backend = address(0x2);
        address borrower = address(0x3);
        address usdcWallet = address(0x4);
        
        // Setup and deposit
        vm.prank(funder);
        pool.depositPrincipal(100 ether);
        
        // Create and repay loan to generate interest
        vm.prank(backend);
        pool.requestFundingForBorrower(borrower, 50 ether, 55 ether);
        
        vm.warp(block.timestamp + 1 hours);
        
        uint256 loanId = pool.activeLoanOf(borrower);
        vm.prank(backend);
        pool.repayAmountForLoan(loanId, 55 ether);
        
        // Check initial state
        (uint256 principal, uint256 pendingInterest, ) = pool.getFunderInfo(funder);
        assertEq(principal, 100 ether);
        assertGt(pendingInterest, 0);
        
        // Withdraw interest first
        vm.prank(funder);
        pool.withdrawInterest();
        
        // Check state after interest withdrawal
        (principal, pendingInterest, ) = pool.getFunderInfo(funder);
        assertEq(principal, 100 ether);
        assertEq(pendingInterest, 0);
        
        // Withdraw principal
        vm.prank(funder);
        pool.withdrawPrincipal();
        
        // Check final state
        (principal, pendingInterest, ) = pool.getFunderInfo(funder);
        assertEq(principal, 0);
        assertEq(pendingInterest, 0);
    }

    function testWithdrawPrincipalAndInterestInReverseOrder() public {
        address funder = address(0x1);
        address backend = address(0x2);
        address borrower = address(0x3);
        address usdcWallet = address(0x4);
        
        // Setup and deposit
        vm.prank(funder);
        pool.depositPrincipal(100 ether);
        
        // Create and repay loan to generate interest
        vm.prank(backend);
        pool.requestFundingForBorrower(borrower, 50 ether, 55 ether);
        
        vm.warp(block.timestamp + 1 hours);
        
        uint256 loanId = pool.activeLoanOf(borrower);
        vm.prank(backend);
        pool.repayAmountForLoan(loanId, 55 ether);
        
        // Check initial state
        (uint256 principal, uint256 pendingInterest, ) = pool.getFunderInfo(funder);
        assertEq(principal, 100 ether);
        assertGt(pendingInterest, 0);
        
        // Withdraw principal first
        vm.prank(funder);
        pool.withdrawPrincipal();
        
        // Check state after principal withdrawal
        (principal, pendingInterest, ) = pool.getFunderInfo(funder);
        assertEq(principal, 0);
        assertGt(pendingInterest, 0);
        
        // Withdraw interest
        vm.prank(funder);
        pool.withdrawInterest();
        
        // Check final state
        (principal, pendingInterest, ) = pool.getFunderInfo(funder);
        assertEq(principal, 0);
        assertEq(pendingInterest, 0);
    }

    function testWithdrawPrincipalWithMultipleFunders() public {
        address funder1 = address(0x1);
        address funder2 = address(0x2);
        address backend = address(0x2); // Use the same backend as in setUp()
        address borrower = address(0x4);
        address usdcWallet = address(0x3); // Use the same usdcWallet as in setUp()
        
        // Setup multiple funders
        stablecoin.mint(funder2, 1000 ether);
        vm.prank(funder2);
        stablecoin.approve(address(pool), 1000 ether);
        
        // Both funders deposit
        vm.prank(funder1);
        pool.depositPrincipal(100 ether);
        vm.prank(funder2);
        pool.depositPrincipal(200 ether);
        
        // Create and repay loan
        vm.prank(backend);
        pool.requestFundingForBorrower(borrower, 150 ether, 165 ether);
        
        vm.warp(block.timestamp + 1 hours);
        
        uint256 loanId = pool.activeLoanOf(borrower);
        vm.prank(backend);
        pool.repayAmountForLoan(loanId, 165 ether);
        
        // Both funders withdraw interest first
        vm.prank(funder1);
        pool.withdrawInterest();
        vm.prank(funder2);
        pool.withdrawInterest();
        
        // Then both funders withdraw principal
        vm.prank(funder1);
        pool.withdrawPrincipal();
        vm.prank(funder2);
        pool.withdrawPrincipal();
        
        // Check final balances (should be greater than initial due to interest earned)
        assertGt(stablecoin.balanceOf(funder1), 1000 ether);
        assertGt(stablecoin.balanceOf(funder2), 1000 ether);
    }

    function testWithdrawPrincipalAmountWithMultipleFunders() public {
        address funder1 = address(0x1);
        address funder2 = address(0x2);
        address backend = address(0x2); // Use the same backend as in setUp()
        address borrower = address(0x4);
        address usdcWallet = address(0x3); // Use the same usdcWallet as in setUp()
        
        // Setup multiple funders
        stablecoin.mint(funder2, 1000 ether);
        vm.prank(funder2);
        stablecoin.approve(address(pool), 1000 ether);
        
        // Both funders deposit
        vm.prank(funder1);
        pool.depositPrincipal(100 ether);
        vm.prank(funder2);
        pool.depositPrincipal(200 ether);
        
        // Create and repay loan
        vm.prank(backend);
        pool.requestFundingForBorrower(borrower, 150 ether, 165 ether);
        
        vm.warp(block.timestamp + 1 hours);
        
        uint256 loanId = pool.activeLoanOf(borrower);
        vm.prank(backend);
        pool.repayAmountForLoan(loanId, 165 ether);
        
        // Both funders withdraw interest first
        vm.prank(funder1);
        pool.withdrawInterest();
        vm.prank(funder2);
        pool.withdrawInterest();
        
        // Both funders withdraw partial amounts
        vm.prank(funder1);
        pool.withdrawPrincipalAmount(50 ether);
        vm.prank(funder2);
        pool.withdrawPrincipalAmount(100 ether);
        
        // Check remaining principal
        (uint256 principal1, , ) = pool.getFunderInfo(funder1);
        (uint256 principal2, , ) = pool.getFunderInfo(funder2);
        assertEq(principal1, 50 ether);
        assertEq(principal2, 100 ether);
        
        // Withdraw remaining amounts
        vm.prank(funder1);
        pool.withdrawPrincipalAmount(50 ether);
        vm.prank(funder2);
        pool.withdrawPrincipalAmount(100 ether);
        
        // Check final state
        (principal1, , ) = pool.getFunderInfo(funder1);
        (principal2, , ) = pool.getFunderInfo(funder2);
        assertEq(principal1, 0);
        assertEq(principal2, 0);
    }
} 