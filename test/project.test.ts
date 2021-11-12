import chai from "chai";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { solidity } from "ethereum-waffle";
import { ethers } from "hardhat";
const { expect } = chai;

chai.use(solidity);

describe("Project", () => {
  let ownerAddress: SignerWithAddress;
  let secondAddress: SignerWithAddress;
  let thirdAddress: SignerWithAddress;

  beforeEach(async () => {
    const [owner, second, third] = await ethers.getSigners();

    ownerAddress = owner;
    secondAddress = second;
    thirdAddress = third;

    await ethers.provider.send("evm_revert", ["0x0"]);
  });

  const getDeployedProjectContract = async (args?: {
    name?: string;
    description?: string;
    tokenSymbol?: string;
    fundraisingGoal?: string;
    projectOwner?: string;
  }) => {
    const { name, description, tokenSymbol, fundraisingGoal, projectOwner } =
      args || {};
    const contractFactory = await ethers.getContractFactory("Project");
    const contract = await contractFactory.deploy(
      name || "Test Name",
      description || "Test description",
      tokenSymbol || "TEST",
      fundraisingGoal || ethers.utils.parseEther("10").toString(),
      projectOwner || ownerAddress.address
    );

    return contract;
  };

  describe("deploy", () => {
    it("assigns state variables for project on deploy", async () => {
      const project = await getDeployedProjectContract({
        name: "This is a name",
        description: "This is a description",
        tokenSymbol: "This is a symbol",
        fundraisingGoal: "10101",
      });

      const nameTxn = await project.name();
      expect(nameTxn).to.equal("This is a name");

      const descriptionTxn = await project.description();
      expect(descriptionTxn).to.equal("This is a description");

      const symbolTxn = await project.symbol();
      expect(symbolTxn).to.equal("This is a symbol");

      const fundraisingGoal = await project.fundraisingGoal();
      expect(fundraisingGoal).to.equal(10101);
    });

    it("reassigns ownership on deployment using address argument", async () => {
      const project = await getDeployedProjectContract({
        fundraisingGoal: "1000",
        projectOwner: thirdAddress.address,
      });
      const ownershipTxn = await project.owner();
      expect(ownershipTxn).to.equal(thirdAddress.address);
    });

    it("correctly sets end time for project", async () => {
      const currentTimestamp = Date.now();
      await ethers.provider.send("evm_setNextBlockTimestamp", [
        currentTimestamp,
      ]);
      const project = await getDeployedProjectContract();

      const projectEndTimeTxn = await project.projectEndTimeSeconds();
      expect(projectEndTimeTxn).to.equal(
        `${currentTimestamp + 60 * 60 * 24 * 30}`
      );
    });
  });

  describe("ownership", () => {
    it("instantiates a new contract with owner", async () => {
      const project = await getDeployedProjectContract();
      const owner = await project.owner();
      expect(owner).to.equal(ownerAddress.address);
    });

    it("transfers ownership", async () => {
      const project = await getDeployedProjectContract();
      const transferOwnershipTxn = await project.transferOwnership(
        secondAddress.address
      );
      expect(transferOwnershipTxn)
        .to.emit(project, "OwnershipTransferred")
        .withArgs(ownerAddress.address, secondAddress.address);
    });

    it("throws error when non-owner attempts transfer", async () => {
      const project = await getDeployedProjectContract();

      let error;
      try {
        await project
          .connect(secondAddress)
          .transferOwnership(secondAddress.address);
      } catch (newError) {
        error = newError;
      }

      expect(
        String(error).indexOf("Ownable: caller is not the owner") > -1
      ).to.equal(true);
    });

    it("renounces ownership", async () => {
      const project = await getDeployedProjectContract();
      const renounceOwnershipTxn = project.renounceOwnership();
      expect(renounceOwnershipTxn)
        .to.emit(project, "OwnershipTransferred")
        .withArgs(
          ownerAddress.address,
          "0x0000000000000000000000000000000000000000"
        );
    });

    it("throws error when non-owner attempts renouncing ownership", async () => {
      const project = await getDeployedProjectContract();

      let error;
      try {
        await project.connect(secondAddress).renounceOwnership();
      } catch (newError) {
        error = newError;
      }

      expect(
        String(error).indexOf("Ownable: caller is not the owner") > -1
      ).to.equal(true);
    });
  });

  describe("receive", () => {
    it("allows the owner to contribute", async () => {
      const project = await getDeployedProjectContract();

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
      const project = await getDeployedProjectContract();

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
      const project = await getDeployedProjectContract({
        fundraisingGoal: ethers.utils.parseEther("10").toString(),
      });

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
      const project = await getDeployedProjectContract({
        fundraisingGoal: ethers.utils.parseEther("0.01").toString(),
      });
      await thirdAddress.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("1"),
      });

      const isFinishedTxn = await project.isFinished();
      expect(isFinishedTxn).to.equal(true);
    });

    it("emits a Contribution event", async () => {
      const project = await getDeployedProjectContract();

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
      const project = await getDeployedProjectContract();
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

      expect(
        String(error).indexOf("Project: project is cancelled") > -1
      ).to.equal(true);
    });

    it("throw error if time limit has expired", async () => {
      const currentTime = Date.now();
      await ethers.provider.send("evm_setNextBlockTimestamp", [currentTime]);
      const project = await getDeployedProjectContract();

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

      expect(
        String(error).indexOf("Project: time limit for project expired") > -1
      ).to.equal(true);
    });

    it("throws error if the project is finished successfully", async () => {
      const project = await getDeployedProjectContract({
        fundraisingGoal: ethers.utils.parseEther("0.01").toString(),
      });
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

      expect(
        String(error).indexOf("Project: project has finished") > -1
      ).to.equal(true);
    });

    it("throws error if contribution is below the minimum required 0.01 ether", async () => {
      const project = await getDeployedProjectContract();

      let error;
      try {
        await ownerAddress.sendTransaction({
          to: project.address,
          value: ethers.utils.parseEther("0.0001"),
        });
      } catch (newError) {
        error = newError;
      }

      expect(
        String(error).indexOf("Project: contribution must be >= 0.01 ether") >
          -1
      ).to.equal(true);
    });
  });

  describe("cancelProject", () => {
    it("cancels a project when the owner calls it", async () => {
      const project = await getDeployedProjectContract();
      await project.cancelProject();

      const isCancelledTxn = await project.isCancelled();
      expect(isCancelledTxn).to.equal(true);
    });

    it("throws error when non-owner address calls it", async () => {
      const project = await getDeployedProjectContract();

      let error;
      try {
        await project.connect(secondAddress).cancelProject();
      } catch (newError) {
        error = newError;
      }

      expect(
        String(error).indexOf("Ownable: caller is not the owner") > -1
      ).to.equal(true);
    });

    it("throws error when project is cancelled already", async () => {
      const project = await getDeployedProjectContract();
      await project.cancelProject();

      let error;
      try {
        await project.cancelProject();
      } catch (newError) {
        error = newError;
      }

      expect(
        String(error).indexOf("Project: project is cancelled") > -1
      ).to.equal(true);
    });

    it("throws error when project time limit has expired", async () => {
      const currentTime = Date.now();
      await ethers.provider.send("evm_setNextBlockTimestamp", [currentTime]);
      const project = await getDeployedProjectContract();

      await ethers.provider.send("evm_setNextBlockTimestamp", [
        currentTime + 60 * 60 * 24 * 30,
      ]);

      let error;
      try {
        await project.cancelProject();
      } catch (newError) {
        error = newError;
      }

      expect(
        String(error).indexOf("Project: time limit for project expired") > -1
      ).to.equal(true);
    });

    it("throws error when project is finished successfully", async () => {
      const project = await getDeployedProjectContract({
        fundraisingGoal: ethers.utils.parseEther("0.01").toString(),
      });
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

      expect(
        String(error).indexOf("Project: project has finished") > -1
      ).to.equal(true);
    });
  });

  describe("refundCancelledProjectFunds", () => {
    it("allows address to refund and updates addressToContributions state", async () => {
      const project = await getDeployedProjectContract();
      await secondAddress.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("1"),
      });
      await project.cancelProject();

      await project.connect(secondAddress).refundCancelledProjectFunds();
      const secondAddressBalanceTxn = await project.addressToContributions(
        secondAddress.address
      );

      expect(secondAddressBalanceTxn.toNumber()).to.equal(0);
    });

    it("emits event when address refunds", async () => {
      const project = await getDeployedProjectContract();
      await secondAddress.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("1"),
      });
      await project.cancelProject();

      const withdrawTxn = await project
        .connect(secondAddress)
        .refundCancelledProjectFunds();
      expect(withdrawTxn)
        .to.emit(project, "Refund")
        .withArgs(
          secondAddress.address,
          project.address,
          ethers.utils.parseEther("1")
        );
    });

    it("throws error if project is not cancelled", async () => {
      const project = await getDeployedProjectContract();

      let error;
      try {
        await project.connect(secondAddress).refundCancelledProjectFunds();
      } catch (newError) {
        error = newError;
      }

      expect(
        String(error).indexOf("Project: cannot refund project funds") > -1
      ).to.equal(true);
    });

    it("throws error if project is finished successfully", async () => {
      const project = await getDeployedProjectContract({
        fundraisingGoal: ethers.utils.parseEther("1").toString(),
      });
      await secondAddress.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("1"),
      });

      let error;
      try {
        await project.connect(secondAddress).refundCancelledProjectFunds();
      } catch (newError) {
        error = newError;
      }

      expect(
        String(error).indexOf("Project: cannot refund project funds") > -1
      ).to.equal(true);
    });

    it("throws error if address has not contributions", async () => {
      const project = await getDeployedProjectContract();
      await project.cancelProject();

      let error;
      try {
        await project.connect(secondAddress).refundCancelledProjectFunds();
      } catch (newError) {
        error = newError;
      }

      expect(
        String(error).indexOf("Project: address has no contributions") > -1
      ).to.equal(true);
    });

    it("throws error if time limit has expired and not finished successfully", async () => {
      const currentTime = Date.now();
      await ethers.provider.send("evm_setNextBlockTimestamp", [currentTime]);
      const project = await getDeployedProjectContract();

      await secondAddress.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("1"),
      });

      await ethers.provider.send("evm_setNextBlockTimestamp", [
        currentTime + 60 * 60 * 24 * 30,
      ]);

      let error;
      try {
        await project.connect(secondAddress).refundCancelledProjectFunds();
      } catch (newError) {
        error = newError;
      }

      expect(String(error)).to.equal("");
    });
  });

  describe("withdrawCompletedProjectFunds", () => {
    it("allows owner to withdraw funds and emits Withdraw event", async () => {
      const project = await getDeployedProjectContract({
        fundraisingGoal: ethers.utils.parseEther("1").toString(),
      });
      await secondAddress.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("2"),
      });

      const withdrawTxn = await project.withdrawCompletedProjectFunds();
      expect(withdrawTxn)
        .to.emit(project, "Withdraw")
        .withArgs(
          ownerAddress.address,
          project.address,
          ethers.utils.parseEther("2")
        );
    });

    it("throws error if project is not finished successfully", async () => {
      const project = await getDeployedProjectContract();

      let error;
      try {
        await project.withdrawCompletedProjectFunds();
      } catch (newError) {
        error = newError;
      }

      expect(
        String(error).indexOf("Project: project not finished successfully") > -1
      ).to.equal(true);
    });

    it("throws error if address is not owner", async () => {
      const project = await getDeployedProjectContract({
        fundraisingGoal: ethers.utils.parseEther("1").toString(),
      });
      await secondAddress.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("2"),
      });

      let error;
      try {
        await project.connect(secondAddress).withdrawCompletedProjectFunds();
      } catch (newError) {
        error = newError;
      }

      expect(
        String(error).indexOf("Ownable: caller is not the owner") > -1
      ).to.equal(true);
    });
  });

  describe("NFTs", () => {
    it("allows contributor with >= 1 eth to mint an NFT badge", async () => {
      const project = await getDeployedProjectContract();
      await secondAddress.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("1"),
      });

      await project.connect(secondAddress).mintNFT();
      const secondAddressNFTBalance = await project.balanceOf(
        secondAddress.address
      );
      expect(secondAddressNFTBalance).to.equal(1);
    });

    it("allows address to mint multiple NFTs for each eth contributed", async () => {
      const project = await getDeployedProjectContract();
      await secondAddress.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("1"),
      });
      await secondAddress.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("2"),
      });

      await project.connect(secondAddress).mintNFT();
      await project.connect(secondAddress).mintNFT();
      const secondAddressNFTBalance = await project.balanceOf(
        secondAddress.address
      );
      expect(secondAddressNFTBalance).to.equal(2);
    });

    it("allows addresses to mint even if project is cancelled", async () => {
      const project = await getDeployedProjectContract();
      await secondAddress.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("2"),
      });

      await project.cancelProject();
      await project.connect(secondAddress).mintNFT();

      const secondAddressNFTBalance = await project.balanceOf(
        secondAddress.address
      );
      expect(secondAddressNFTBalance).to.equal(1);
    });

    it("throws error if no more NFT badges are available to claim", async () => {
      const project = await getDeployedProjectContract();
      await secondAddress.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("1"),
      });
      await project.connect(secondAddress).mintNFT();

      let error;
      try {
        await project.connect(secondAddress).mintNFT();
      } catch (newError) {
        error = newError;
      }

      expect(
        String(error).indexOf("Project: no available NFTs to mint") > -1
      ).to.equal(true);
    });

    it("throws error if address has not contributed", async () => {
      const project = await getDeployedProjectContract();

      let error;
      try {
        await project.connect(secondAddress).mintNFT();
      } catch (newError) {
        error = newError;
      }

      expect(
        String(error).indexOf("Project: no available NFTs to mint") > -1
      ).to.equal(true);
    });
  });
});
