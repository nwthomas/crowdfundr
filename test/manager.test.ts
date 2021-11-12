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

  const getDeployedContract = async () => {
    const contractFactory = await ethers.getContractFactory("Manager");
    const contract = await contractFactory.deploy();

    return contract;
  };

  describe("deploy", () => {
    it("deploys a new contract", async () => {
      const manager = await getDeployedContract();
      expect(manager.address).to.equal(
        "0x5FbDB2315678afecb367f032d93F642f64180aa3"
      );
    });
  });

  describe("ownership", () => {
    it("instantiates a new contract with owner", async () => {
      const manager = await getDeployedContract();
      const owner = await manager.owner();
      expect(owner).to.equal(ownerAddress.address);
    });

    it("transfers ownership", async () => {
      const manager = await getDeployedContract();
      const transferOwnershipTxn = await manager.transferOwnership(
        secondAddress.address
      );
      expect(transferOwnershipTxn)
        .to.emit(manager, "OwnershipTransferred")
        .withArgs(ownerAddress.address, secondAddress.address);
    });

    it("throws error when non-owner attempts transfer", async () => {
      const manager = await getDeployedContract();

      let error;
      try {
        await manager
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
      const manager = await getDeployedContract();
      const renounceOwnershipTxn = manager.renounceOwnership();
      expect(renounceOwnershipTxn)
        .to.emit(manager, "OwnershipTransferred")
        .withArgs(
          ownerAddress.address,
          "0x0000000000000000000000000000000000000000"
        );
    });

    it("throws error when non-owner attempts renouncing ownership", async () => {
      const manager = await getDeployedContract();

      let error;
      try {
        await manager.connect(secondAddress).renounceOwnership();
      } catch (newError) {
        error = newError;
      }

      expect(error instanceof Error).to.equal(true);
      expect(String(error)).to.equal(
        "Error: VM Exception while processing transaction: reverted with reason string 'Ownable: caller is not the owner'"
      );
    });
  });

  describe("createNewProject", () => {
    it("allows the owner to create a new project", async () => {
      const manager = await getDeployedContract();
      const newProjectTxn = await manager.createNewProject(
        "Test Name",
        "Test description",
        "TEST",
        ethers.utils.parseEther("10")
      );
      expect(newProjectTxn)
        .to.emit(manager, "ProjectCreated")
        .withArgs(
          ownerAddress.address,
          "0x94099942864EA81cCF197E9D71ac53310b1468D8",
          0
        );
    });

    it("allows any address to create a new project", async () => {
      const manager = await getDeployedContract();
      const newProjectTxn = await manager
        .connect(thirdAddress)
        .createNewProject(
          "Test Name",
          "Test description",
          "TEST",
          ethers.utils.parseEther("10")
        );
      expect(newProjectTxn)
        .to.emit(manager, "ProjectCreated")
        .withArgs(
          thirdAddress.address,
          "0x6F1216D1BFe15c98520CA1434FC1d9D57AC95321",
          0
        );
    });

    it("tracks new projects in array", async () => {
      const manager = await getDeployedContract();
      await manager
        .connect(secondAddress)
        .createNewProject(
          "Test Name 1",
          "Test description 1",
          "TST1",
          ethers.utils.parseEther("10")
        );
      await manager
        .connect(thirdAddress)
        .createNewProject(
          "Test Name 2",
          "Test description 2",
          "TST2",
          ethers.utils.parseEther("11")
        );
      const projectOneTxn = await manager.projects(0);
      const projectTwoTxn = await manager.projects(1);
      expect(projectOneTxn).to.equal(
        "0x8dAF17A20c9DBA35f005b6324F493785D239719d"
      );
      expect(projectTwoTxn).to.equal(
        "0x3Ca8f9C04c7e3E1624Ac2008F92f6F366A869444"
      );
    });

    it("tracks ownership of projects with projects array index reference", async () => {
      const manager = await getDeployedContract();
      await manager.createNewProject(
        "Test Name 1",
        "Test description 1",
        "TST1",
        ethers.utils.parseEther("10")
      );
      await manager
        .connect(thirdAddress)
        .createNewProject(
          "Test Name 2",
          "Test description 2",
          "TST2",
          ethers.utils.parseEther("10")
        );
      const ownerAddressProjectIndex = await manager.ownerToProjects(
        ownerAddress.address,
        0
      );
      const thirdAddressProjectIndex = await manager.ownerToProjects(
        thirdAddress.address,
        0
      );
      expect(ownerAddressProjectIndex.toNumber()).to.equal(0);
      expect(thirdAddressProjectIndex.toNumber()).to.equal(1);
    });
  });
});
