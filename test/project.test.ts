import chai from "chai";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { solidity } from "ethereum-waffle";
import { ethers } from "hardhat";
const { expect } = chai;

chai.use(solidity);

describe("Project", () => {
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let account3: SignerWithAddress;

  beforeEach(async () => {
    const [owner, second, third] = await ethers.getSigners();

    account1 = owner;
    account2 = second;
    account3 = third;
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
      projectOwner || account1.address
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
        projectOwner: account3.address,
      });
      const ownershipTxn = await project.owner();
      expect(ownershipTxn).to.equal(account3.address);
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
      expect(owner).to.equal(account1.address);
    });

    it("transfers ownership", async () => {
      const project = await getDeployedProjectContract();
      const transferOwnershipTxn = await project.transferOwnership(
        account2.address
      );
      expect(transferOwnershipTxn)
        .to.emit(project, "OwnershipTransferred")
        .withArgs(account1.address, account2.address);
    });

    it("throws error when non-owner attempts transfer", async () => {
      const project = await getDeployedProjectContract();

      let error;
      try {
        await project.connect(account2).transferOwnership(account2.address);
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
          account1.address,
          "0x0000000000000000000000000000000000000000"
        );
    });

    it("throws error when non-owner attempts renouncing ownership", async () => {
      const project = await getDeployedProjectContract();

      let error;
      try {
        await project.connect(account2).renounceOwnership();
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

      await account1.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("0.01"),
      });

      const ownerContributionsTxn = await project.addressToContributions(
        account1.address
      );
      expect(ownerContributionsTxn).to.equal(ethers.utils.parseEther("0.01"));
    });

    it("allows multiple addresses to contribute", async () => {
      const project = await getDeployedProjectContract();

      await account2.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("0.01"),
      });
      await account3.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("1"),
      });

      const account2ContributionsTxn = await project.addressToContributions(
        account2.address
      );
      expect(account2ContributionsTxn).to.equal(
        ethers.utils.parseEther("0.01")
      );

      const account3ContributionsTxn = await project.addressToContributions(
        account3.address
      );
      expect(account3ContributionsTxn).to.equal(ethers.utils.parseEther("1"));
    });

    it("allows the same address to contribute multiple times", async () => {
      const project = await getDeployedProjectContract({
        fundraisingGoal: ethers.utils.parseEther("10").toString(),
      });

      for (let i = 0; i < 10; i++) {
        await account1.sendTransaction({
          to: project.address,
          value: ethers.utils.parseEther("0.1"),
        });
      }

      const account1ContributionsTxn = await project.addressToContributions(
        account1.address
      );
      expect(account1ContributionsTxn).to.equal(ethers.utils.parseEther("1"));
    });

    it("sets the isFinished boolean to true when balance >= fundraising goal", async () => {
      const project = await getDeployedProjectContract({
        fundraisingGoal: ethers.utils.parseEther("0.01").toString(),
      });
      await account3.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("1"),
      });

      const isFinishedTxn = await project.isFinished();
      expect(isFinishedTxn).to.equal(true);
    });

    it("emits a Contribution event", async () => {
      const project = await getDeployedProjectContract();

      const contributionTxn = await account2.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("0.01"),
      });
      expect(contributionTxn)
        .to.emit(project, "Contribution")
        .withArgs(
          account2.address,
          project.address,
          ethers.utils.parseEther("0.01")
        );
    });

    it("throws error if the project is cancelled", async () => {
      const project = await getDeployedProjectContract();
      await project.cancelProject();

      let error;
      try {
        await account3.sendTransaction({
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
        await account3.sendTransaction({
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
      await account1.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("0.01"),
      });

      let error;
      try {
        await account1.sendTransaction({
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
        await account1.sendTransaction({
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
        await project.connect(account2).cancelProject();
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
      const project = await getDeployedProjectContract();

      await ethers.provider.send("evm_increaseTime", [60 * 60 * 24 * 30]);
      await ethers.provider.send("evm_mine", []);

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
      await account1.sendTransaction({
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
      await account2.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("1"),
      });
      await project.cancelProject();

      await project.connect(account2).refundCancelledProjectFunds();
      const account2BalanceTxn = await project.addressToContributions(
        account2.address
      );

      expect(account2BalanceTxn.toNumber()).to.equal(0);
    });

    it("allows address to refund if time limit has expired and not finished successfully", async () => {
      const project = await getDeployedProjectContract();

      await account2.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("1"),
      });

      await ethers.provider.send("evm_increaseTime", [60 * 60 * 24 * 30]);
      await ethers.provider.send("evm_mine", []);

      await project.connect(account2).refundCancelledProjectFunds();
      const account2BalanceTxn = await project.addressToContributions(
        account2.address
      );

      expect(account2BalanceTxn.toNumber()).to.equal(0);
    });

    it("emits event when address refunds", async () => {
      const project = await getDeployedProjectContract();
      await account2.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("1"),
      });
      await project.cancelProject();

      const withdrawTxn = await project
        .connect(account2)
        .refundCancelledProjectFunds();
      expect(withdrawTxn)
        .to.emit(project, "Refund")
        .withArgs(
          account2.address,
          project.address,
          ethers.utils.parseEther("1")
        );
    });

    it("throws error if project is not cancelled", async () => {
      const project = await getDeployedProjectContract();

      let error;
      try {
        await project.connect(account2).refundCancelledProjectFunds();
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
      await account2.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("1"),
      });

      let error;
      try {
        await project.connect(account2).refundCancelledProjectFunds();
      } catch (newError) {
        error = newError;
      }

      expect(
        String(error).indexOf("Project: cannot refund project funds") > -1
      ).to.equal(true);
    });

    it("throws error if project is funded and past time limit", async () => {
      const project = await getDeployedProjectContract({
        fundraisingGoal: ethers.utils.parseEther("1").toString(),
      });
      await account2.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("1"),
      });

      await ethers.provider.send("evm_increaseTime", [60 * 60 * 24 * 30]);
      await ethers.provider.send("evm_mine", []);

      let error;
      try {
        await project.connect(account2).refundCancelledProjectFunds();
      } catch (newError) {
        error = newError;
      }

      expect(
        String(error).indexOf("Project: cannot refund project funds") > -1
      ).to.equal(true);
    });

    it("throws error if address has no contributions", async () => {
      const project = await getDeployedProjectContract();
      await project.cancelProject();

      let error;
      try {
        await project.connect(account2).refundCancelledProjectFunds();
      } catch (newError) {
        error = newError;
      }

      expect(
        String(error).indexOf("Project: address has no contributions") > -1
      ).to.equal(true);
    });
  });

  describe("withdrawCompletedProjectFunds", () => {
    it("allows owner to withdraw funds and emits Withdraw event", async () => {
      const project = await getDeployedProjectContract({
        fundraisingGoal: ethers.utils.parseEther("1").toString(),
      });
      await account2.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("2"),
      });

      const withdrawTxn = await project.withdrawCompletedProjectFunds();
      expect(withdrawTxn)
        .to.emit(project, "Withdraw")
        .withArgs(
          account1.address,
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
      await account2.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("2"),
      });

      let error;
      try {
        await project.connect(account2).withdrawCompletedProjectFunds();
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
      await account2.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("1"),
      });

      await project.connect(account2).mintNFT();
      const account2NFTBalance = await project.balanceOf(account2.address);
      expect(account2NFTBalance).to.equal(1);
    });

    it("allows address to mint multiple NFTs for each eth contributed", async () => {
      const project = await getDeployedProjectContract();
      await account2.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("1"),
      });
      await account2.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("2"),
      });

      await project.connect(account2).mintNFT();
      await project.connect(account2).mintNFT();
      const account2NFTBalance = await project.balanceOf(account2.address);
      expect(account2NFTBalance).to.equal(2);
    });

    it("allows addresses to mint even if project is cancelled", async () => {
      const project = await getDeployedProjectContract();
      await account2.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("2"),
      });

      await project.cancelProject();
      await project.connect(account2).mintNFT();

      const account2NFTBalance = await project.balanceOf(account2.address);
      expect(account2NFTBalance).to.equal(1);
    });

    it("throws error if no more NFT badges are available to claim", async () => {
      const project = await getDeployedProjectContract();
      await account2.sendTransaction({
        to: project.address,
        value: ethers.utils.parseEther("1"),
      });
      await project.connect(account2).mintNFT();

      let error;
      try {
        await project.connect(account2).mintNFT();
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
        await project.connect(account2).mintNFT();
      } catch (newError) {
        error = newError;
      }

      expect(
        String(error).indexOf("Project: no available NFTs to mint") > -1
      ).to.equal(true);
    });
  });
});
