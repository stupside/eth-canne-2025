import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("FundingPoolModule", (m) => {
  const stablecoinAddress = m.getParameter("stablecoinAddress", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");

  const fundingPool = m.contract("FundingPool", [stablecoinAddress]);

  return { fundingPool };
});
