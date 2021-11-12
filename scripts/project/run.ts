import { ethers } from "hardhat";

async function main() {
  const [ownerAddress] = await ethers.getSigners();
  const ProjectContractFactory = await ethers.getContractFactory("Project");
  const project = await ProjectContractFactory.deploy(
    "Name",
    "Description",
    "TEST",
    ethers.utils.parseEther("1").toString(),
    ownerAddress.address
  );
  await project.deployed();

  console.log("Project deployed to:", project.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
