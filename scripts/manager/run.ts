import { ethers } from "hardhat";

async function main() {
  const ManagerContractFactory = await ethers.getContractFactory("Manager");
  const manager = await ManagerContractFactory.deploy();
  await manager.deployed();
  console.log("Manager deployed to:", manager.address);

  const projectTxn = await manager.createNewProject(
    "Name",
    "Description",
    "TEST",
    ethers.utils.parseEther("5")
  );
  projectTxn.wait();

  const projectAddress = await manager.projects(0);
  console.log("Project created at", projectAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
