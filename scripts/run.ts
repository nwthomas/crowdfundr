import { ethers } from "hardhat";

async function main() {
  const ManagerContractFactory = await ethers.getContractFactory("Manager");
  const manager = await ManagerContractFactory.deploy();
  await manager.deployed();

  console.log("Manager deployed to:", manager.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
