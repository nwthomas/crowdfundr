import chai from "chai";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { solidity } from "ethereum-waffle";
import { ethers } from "hardhat";
const { expect } = chai;

chai.use(solidity);

describe("Manager", () => {
  let ownerAddress: SignerWithAddress,
    secondAddress: SignerWithAddress,
    thirdAddress: SignerWithAddress;

  beforeEach(async () => {
    const [owner, second, third] = await ethers.getSigners();

    ownerAddress = owner;
    secondAddress = second;
    thirdAddress = third;
  });

  const getDeployedContract = async (
    contractName: string,
    name: string = "Test",
    description: string = "Test description",
    tokenSymbol: string = "TEST",
    fundraisingGoal: number = 100000000,
    projectOwner: string = ownerAddress.address
  ) => {
    const contractFactory = await ethers.getContractFactory(contractName);
    const contract = await contractFactory.deploy(
      name,
      description,
      tokenSymbol,
      fundraisingGoal,
      projectOwner
    );

    return contract;
  };

  describe("deploy", () => {
    // finish
  });

  describe("ownership", () => {
    it("instantiates a new contract with owner", async () => {
      const project = await getDeployedContract("Project");
      const owner = await project.owner();
      expect(owner).to.equal(ownerAddress.address);
    });

    it("transfers ownership", async () => {
      const project = await getDeployedContract("Project");
      const transferOwnershipTxn = await project.transferOwnership(
        secondAddress.address
      );
      expect(transferOwnershipTxn)
        .to.emit(project, "OwnershipTransferred")
        .withArgs(ownerAddress.address, secondAddress.address);
    });

    it("throws error when non-owner attempts transfer", async () => {
      const project = await getDeployedContract("Project");

      let error;
      try {
        await project
          .connect(secondAddress)
          .transferOwnership(secondAddress.address);
      } catch (newError) {
        error = newError;
      }

      expect(error instanceof Error).to.equal(true);
      expect(String(error)).to.equal(
        "Error: VM Exception while processing transaction: reverted with reason string 'Ownable: caller is not the owner'"
      );
    });

    it("renounces ownership", async () => {
      const project = await getDeployedContract("Project");
      const renounceOwnershipTxn = project.renounceOwnership();
      expect(renounceOwnershipTxn)
        .to.emit(project, "OwnershipTransferred")
        .withArgs(
          ownerAddress.address,
          "0x0000000000000000000000000000000000000000"
        );
    });

    it("throws error when non-owner attempts renouncing ownership", async () => {
      const project = await getDeployedContract("Project");

      let error;
      try {
        await project.connect(secondAddress).renounceOwnership();
      } catch (newError) {
        error = newError;
      }

      expect(error instanceof Error).to.equal(true);
      expect(String(error)).to.equal(
        "Error: VM Exception while processing transaction: reverted with reason string 'Ownable: caller is not the owner'"
      );
    });
  });

  describe("receive", () => {
    // finish
  });

  describe("cancelProject", () => {
    // finish
  });

  describe("withdrawCancelledProjectFunds", () => {
    // finish
  });

  describe("withdrawCompletedProjectFunds", () => {
    // finish
  });

  describe("mint NFT", () => {
    // finish
  });
});
