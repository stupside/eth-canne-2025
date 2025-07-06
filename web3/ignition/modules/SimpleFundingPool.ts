import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("SimpleFundingPoolModule", (m) => {
  const stablecoinAddress = m.getParameter("stablecoinAddress", "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238");

  const simpleFundingPool = m.contract("SimpleFundingPool", [stablecoinAddress]);

  return { simpleFundingPool };
});
