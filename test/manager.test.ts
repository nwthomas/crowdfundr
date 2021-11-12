import chai from "chai";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { solidity } from "ethereum-waffle";
import { ethers } from "hardhat";
const { expect } = chai;

chai.use(solidity);

describe("Manager", () => {
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let account3: SignerWithAddress;

  beforeEach(async () => {
    const [owner, second, third] = await ethers.getSigners();

    account1 = owner;
    account2 = second;
    account3 = third;
  });

  const getDeployedManagerContract = async () => {
    const contractFactory = await ethers.getContractFactory("Manager");
    const contract = await contractFactory.deploy();

    return contract;
  };

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
    it("deploys a new contract", async () => {
      const manager = await getDeployedManagerContract();
      expect(manager.address).to.equal(
        "0x5FbDB2315678afecb367f032d93F642f64180aa3"
      );
    });
  });

  describe("ownership", () => {
    it("instantiates a new contract with owner", async () => {
      const manager = await getDeployedManagerContract();
      const owner = await manager.owner();
      expect(owner).to.equal(account1.address);
    });

    it("transfers ownership", async () => {
      const manager = await getDeployedManagerContract();
      const transferOwnershipTxn = await manager.transferOwnership(
        account2.address
      );
      expect(transferOwnershipTxn)
        .to.emit(manager, "OwnershipTransferred")
        .withArgs(account1.address, account2.address);
    });

    it("throws error when non-owner attempts transfer", async () => {
      const manager = await getDeployedManagerContract();

      let error;
      try {
        await manager.connect(account2).transferOwnership(account2.address);
      } catch (newError) {
        error = newError;
      }

      expect(error instanceof Error).to.equal(true);
      expect(
        String(error).indexOf("Ownable: caller is not the owner") > -1
      ).to.equal(true);
    });

    it("renounces ownership", async () => {
      const manager = await getDeployedManagerContract();
      const renounceOwnershipTxn = manager.renounceOwnership();
      expect(renounceOwnershipTxn)
        .to.emit(manager, "OwnershipTransferred")
        .withArgs(
          account1.address,
          "0x0000000000000000000000000000000000000000"
        );
    });

    it("throws error when non-owner attempts renouncing ownership", async () => {
      const manager = await getDeployedManagerContract();

      let error;
      try {
        await manager.connect(account2).renounceOwnership();
      } catch (newError) {
        error = newError;
      }

      expect(error instanceof Error).to.equal(true);
      expect(
        String(error).indexOf("Ownable: caller is not the owner") > -1
      ).to.equal(true);
    });
  });

  describe("createNewProject", () => {
    it("allows the owner to create a new project", async () => {
      const manager = await getDeployedManagerContract();
      const newProjectTxn = await manager.createNewProject(
        "Test Name",
        "Test description",
        "TEST",
        ethers.utils.parseEther("10")
      );
      expect(newProjectTxn)
        .to.emit(manager, "ProjectCreated")
        .withArgs(
          account1.address,
          "0x94099942864EA81cCF197E9D71ac53310b1468D8",
          0
        );
    });

    it("allows any address to create a new project", async () => {
      const manager = await getDeployedManagerContract();
      const newProjectTxn = await manager
        .connect(account3)
        .createNewProject(
          "Test Name",
          "Test description",
          "TEST",
          ethers.utils.parseEther("10")
        );
      expect(newProjectTxn)
        .to.emit(manager, "ProjectCreated")
        .withArgs(
          account3.address,
          "0x6F1216D1BFe15c98520CA1434FC1d9D57AC95321",
          0
        );
    });

    it("tracks new projects in array", async () => {
      const manager = await getDeployedManagerContract();
      await manager
        .connect(account2)
        .createNewProject(
          "Test Name 1",
          "Test description 1",
          "TST1",
          ethers.utils.parseEther("10")
        );
      await manager
        .connect(account3)
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
      const manager = await getDeployedManagerContract();
      await manager.createNewProject(
        "Test Name 1",
        "Test description 1",
        "TST1",
        ethers.utils.parseEther("10")
      );
      await manager
        .connect(account3)
        .createNewProject(
          "Test Name 2",
          "Test description 2",
          "TST2",
          ethers.utils.parseEther("10")
        );
      const account1ProjectIndex = await manager.ownerToProjects(
        account1.address,
        0
      );
      const account3ProjectIndex = await manager.ownerToProjects(
        account3.address,
        0
      );
      expect(account1ProjectIndex.toNumber()).to.equal(0);
      expect(account3ProjectIndex.toNumber()).to.equal(1);
    });

    it("deploys child projects with msg.sender as owner", async () => {
      let project = await getDeployedProjectContract();
      const manager = await getDeployedManagerContract();
      await manager
        .connect(account2)
        .createNewProject(
          "Test Name 1",
          "Test description 1",
          "TST1",
          ethers.utils.parseEther("10")
        );

      const projectAddressTxn = await manager.projects(0);
      project = await project.attach(projectAddressTxn);

      const projectOwnerTxn = await project.owner();
      expect(projectOwnerTxn).to.equal(account2.address);
    });
  });
});
