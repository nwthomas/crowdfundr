import chai from "chai";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { solidity } from "ethereum-waffle";
import { ethers } from "hardhat";
const { expect } = chai;

chai.use(solidity);

describe("Project", () => {
  let ownerAddress: SignerWithAddress,
    secondAddress: SignerWithAddress,
    thirdAddress: SignerWithAddress;

  beforeEach(async () => {
    const [owner, second, third] = await ethers.getSigners();

    ownerAddress = owner;
    secondAddress = second;
    thirdAddress = third;

    await ethers.provider.send("evm_revert", ["0x0"]);
  });

  const getDeployedContract = async (
    contractName: string,
    name: string = "Test",
    description: string = "Test description",
    tokenSymbol: string = "TEST",
    fundraisingGoal: string = `${10 ** 18}`,
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
    it("assigns state variables for project on deploy", async () => {
      const project = await getDeployedContract(
        "Project",
        "Name",
        "Description",
        "Symbol",
        "1"
      );

      const nameTxn = await project.name();
      expect(nameTxn).to.equal("Name");

      const descriptionTxn = await project.description();
      expect(descriptionTxn).to.equal("Description");

      const symbolTxn = await project.symbol();
      expect(symbolTxn).to.equal("Symbol");

      const fundraisingGoal = await project.fundraisingGoal();
      expect(fundraisingGoal).to.equal(1);
    });

    it("reassigns ownership on deployment using address argument", async () => {
      const project = await getDeployedContract(
        "Project",
        "Test",
        "Test description",
        "TEST",
        "1000",
        thirdAddress.address
      );
      const ownershipTxn = await project.owner();
      expect(ownershipTxn).to.equal(thirdAddress.address);
    });

    it("correctly sets end time for project", async () => {
      const currentTimestamp = Date.now();
      await ethers.provider.send("evm_setNextBlockTimestamp", [
        currentTimestamp,
      ]);
      const project = await getDeployedContract("Project");

      const projectEndTimeTxn = await project.projectEndTimeSeconds();
      expect(projectEndTimeTxn).to.equal(
        `${currentTimestamp + 60 * 60 * 24 * 30}`
      );
    });
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

      expect(String(error)).to.equal(
        "Error: VM Exception while processing transaction: reverted with reason string 'Ownable: caller is not the owner'"
      );
    });
  });

  describe("receive", () => {
    it("allows the owner to contribute", async () => {
      const project = await getDeployedContract("Project");

      await ownerAddress.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("0.01"),
      });

      const ownerContributionsTxn = await project.addressToContributions(
        ownerAddress.address
      );
      expect(ownerContributionsTxn).to.equal(ethers.utils.parseEther("0.01"));
    });

    it("allows multiple addresses to contribute", async () => {
      const project = await getDeployedContract("Project");

      await secondAddress.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("0.01"),
      });
      await thirdAddress.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("1"),
      });

      const secondAddressContributionsTxn =
        await project.addressToContributions(secondAddress.address);
      expect(secondAddressContributionsTxn).to.equal(
        ethers.utils.parseEther("0.01")
      );

      const thirdAddressContributionsTxn = await project.addressToContributions(
        thirdAddress.address
      );
      expect(thirdAddressContributionsTxn).to.equal(
        ethers.utils.parseEther("1")
      );
    });

    it("allows the same address to contribute multiple times", async () => {
      const project = await getDeployedContract(
        "Project",
        "Name",
        "Description",
        "TEST",
        ethers.utils.parseEther("10").toString()
      );

      for (let i = 0; i < 10; i++) {
        await ownerAddress.sendTransaction({
          to: project.address,
          value: ethers.utils.parseEther("0.1"),
        });
      }

      const ownerAddressContributionsTxn = await project.addressToContributions(
        ownerAddress.address
      );
      expect(ownerAddressContributionsTxn).to.equal(
        ethers.utils.parseEther("1")
      );
    });

    it("sets the isFinished boolean to true when balance >= fundraising goal", async () => {
      const project = await getDeployedContract(
        "Project",
        "Name",
        "Description",
        "TEST",
        ethers.utils.parseEther("0.01").toString()
      );
      await thirdAddress.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("1"),
      });

      const isFinishedTxn = await project.isFinished();
      expect(isFinishedTxn).to.equal(true);
    });

    it("emits a Contribution event", async () => {
      const project = await getDeployedContract("Project");

      const contributionTxn = await secondAddress.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("0.01"),
      });
      expect(contributionTxn)
        .to.emit(project, "Contribution")
        .withArgs(
          secondAddress.address,
          project.address,
          ethers.utils.parseEther("0.01")
        );
    });

    it("throws error if the project is cancelled", async () => {
      const project = await getDeployedContract("Project");
      await project.cancelProject();

      let error;
      try {
        await thirdAddress.sendTransaction({
          to: project.address,
          value: ethers.utils.parseEther("0.01"),
        });
      } catch (newError) {
        error = newError;
      }

      expect(String(error)).to.equal(
        "Error: VM Exception while processing transaction: reverted with reason string 'Project: project is cancelled'"
      );
    });

    it("throw error if time limit has expired", async () => {
      const currentTime = Date.now();
      await ethers.provider.send("evm_setNextBlockTimestamp", [currentTime]);
      const project = await getDeployedContract("Project");

      await ethers.provider.send("evm_setNextBlockTimestamp", [
        currentTime + 60 * 60 * 24 * 30,
      ]);

      let error;
      try {
        await thirdAddress.sendTransaction({
          to: project.address,
          value: ethers.utils.parseEther("0.01"),
        });
      } catch (newError) {
        error = newError;
      }

      expect(String(error)).to.equal(
        "Error: VM Exception while processing transaction: reverted with reason string 'Project: time limit for project expired'"
      );
    });

    it("throws error if the project is finished successfully", async () => {
      const project = await getDeployedContract(
        "Project",
        "Name",
        "Description",
        "TEST",
        ethers.utils.parseEther("0.01").toString()
      );
      await ownerAddress.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("0.01"),
      });

      let error;
      try {
        await ownerAddress.sendTransaction({
          to: project.address,
          value: ethers.utils.parseEther("0.01"),
        });
      } catch (newError) {
        error = newError;
      }

      expect(String(error)).to.equal(
        "Error: VM Exception while processing transaction: reverted with reason string 'Project: project has finished'"
      );
    });

    it("throws error if contribution is below the minimum required 0.01 ether", async () => {
      const project = await getDeployedContract("Project");

      let error;
      try {
        await ownerAddress.sendTransaction({
          to: project.address,
          value: ethers.utils.parseEther("0.0001"),
        });
      } catch (newError) {
        error = newError;
      }

      expect(String(error)).to.equal(
        "Error: VM Exception while processing transaction: reverted with reason string 'Project: contribution must be >= 0.01 ether'"
      );
    });
  });

  describe("cancelProject", () => {
    it("cancels a project when the owner calls it", async () => {
      const project = await getDeployedContract("Project");
      await project.cancelProject();

      const isCancelledTxn = await project.isCancelled();
      expect(isCancelledTxn).to.equal(true);
    });

    it("throws error when non-owner address calls it", async () => {
      const project = await getDeployedContract("Project");

      let error;
      try {
        await project.connect(secondAddress).cancelProject();
      } catch (newError) {
        error = newError;
      }

      expect(String(error)).to.equal(
        "Error: VM Exception while processing transaction: reverted with reason string 'Ownable: caller is not the owner'"
      );
    });

    it("throws error when project is cancelled already", async () => {
      const project = await getDeployedContract("Project");
      await project.cancelProject();

      let error;
      try {
        await project.cancelProject();
      } catch (newError) {
        error = newError;
      }

      expect(String(error)).to.equal(
        "Error: VM Exception while processing transaction: reverted with reason string 'Project: project is cancelled'"
      );
    });

    it("throws error when project time limit has expired", async () => {
      const currentTime = Date.now();
      await ethers.provider.send("evm_setNextBlockTimestamp", [currentTime]);
      const project = await getDeployedContract("Project");

      await ethers.provider.send("evm_setNextBlockTimestamp", [
        currentTime + 60 * 60 * 24 * 30,
      ]);

      let error;
      try {
        await project.cancelProject();
      } catch (newError) {
        error = newError;
      }

      expect(String(error)).to.equal(
        "Error: VM Exception while processing transaction: reverted with reason string 'Project: time limit for project expired'"
      );
    });

    it("throws error when project is finished successfully", async () => {
      const project = await getDeployedContract(
        "Project",
        "Name",
        "Description",
        "TEST",
        ethers.utils.parseEther("0.01").toString()
      );
      await ownerAddress.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("1"),
      });

      let error;
      try {
        await project.cancelProject();
      } catch (newError) {
        error = newError;
      }

      expect(String(error)).to.equal(
        "Error: VM Exception while processing transaction: reverted with reason string 'Project: project has finished'"
      );
    });
  });

  describe("withdrawCancelledProjectFunds", () => {
    // finish
  });

  describe("withdrawCompletedProjectFunds", () => {
    // finish
  });

  describe("NFTs", () => {
    // finish
  });
});