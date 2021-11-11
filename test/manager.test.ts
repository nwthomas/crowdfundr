import chai from "chai";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { solidity } from "ethereum-waffle";
import { ethers } from "hardhat";
const { expect } = chai;

chai.use(solidity);

const getDeployedContract = async (contractName: string) => {
  const contractFactory = await ethers.getContractFactory("Manager");
  const contract = await contractFactory.deploy();

  return contract;
};

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

  describe("deploy", () => {
    it("instantiates a new contract with owner", async () => {
      const manager = getDeployedContract("Manager");
      const owner = await manager.owner();
      expect(owner).to.equal(ownerAddress.address);
    });
  });

  describe("createNewProject", () => {
    // finish
  });
});
