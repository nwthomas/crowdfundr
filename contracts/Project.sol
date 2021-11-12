// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "hardhat/console.sol";

contract Project is Ownable, ERC721 {
  using Counters for Counters.Counter;
  Counters.Counter private tokenIds;

  string public description;
  uint256 public projectEndTimeSeconds;
  uint256 public fundraisingGoal;
  bool public isCancelled = false;
  bool public isFinished = false;

  mapping(address => uint256) public addressToContributions;

  uint256 public constant MINIMUM_CONTRIBUTION = 0.01 ether;
  uint256 public constant PROJECT_TIME_LENGTH_SECONDS = 30 days;

  event Contribution(
    address indexed from,
    address indexed project,
    uint256 indexed amount
  );
  event Refund(
    address indexed to,
    address indexed project,
    uint256 indexed amount
  );
  event Withdraw(
    address indexed to,
    address indexed project,
    uint256 indexed amount
  );

  modifier hasMintableNFTs() {
    require(
      balanceOf(msg.sender) + 1 < addressToContributions[msg.sender],
      "Project: no available NFTs to mint"
    );
    _;
  }
  modifier isNotCancelledProject() {
    require(!isCancelled, "Project: project is cancelled");
    _;
  }

  modifier isNotExpiredProject() {
    require(
      block.timestamp < projectEndTimeSeconds,
      "Project: time limit for project expired"
    );
    _;
  }

  modifier isNotFinishedProject() {
    require(!isFinished, "Project: project has finished");
    _;
  }

  constructor(
    string memory _name,
    string memory _description,
    string memory _tokenSymbol,
    uint256 _fundraisingGoal,
    address _projectOwner
  ) ERC721(_name, _tokenSymbol) {
    transferOwnership(_projectOwner);
    description = _description;
    fundraisingGoal = _fundraisingGoal;
    projectEndTimeSeconds = block.timestamp + PROJECT_TIME_LENGTH_SECONDS;
  }

  receive()
    external
    payable
    isNotCancelledProject
    isNotExpiredProject
    isNotFinishedProject
  {
    require(
      msg.value >= MINIMUM_CONTRIBUTION,
      "Project: contribution must be >= 0.01 ether"
    );

    if (msg.value + address(this).balance >= fundraisingGoal) {
      isFinished = true;
    }

    addressToContributions[msg.sender] += msg.value;
    emit Contribution(msg.sender, address(this), msg.value);
  }

  function cancelProject()
    external
    onlyOwner
    isNotCancelledProject
    isNotExpiredProject
    isNotFinishedProject
  {
    isCancelled = true;
  }

  function refundCancelledProjectFunds() external {
    require(
      isCancelled || (block.timestamp >= projectEndTimeSeconds && !isFinished),
      "Project: cannot refund project funds"
    );

    require(
      addressToContributions[msg.sender] > 0,
      "Project: address has no contributions"
    );

    uint256 addressContributions = addressToContributions[msg.sender];
    addressToContributions[msg.sender] = 0;
    (bool success, ) = msg.sender.call{ value: addressContributions }("");
    require(success, "Error: refund failed");
    emit Refund(msg.sender, address(this), addressContributions);
  }

  function withdrawCompletedProjectFunds() external onlyOwner {
    require(isFinished, "Project: project not finished successfully");

    uint256 contractBalance = address(this).balance;
    (bool success, ) = msg.sender.call{ value: contractBalance }("");
    require(success, "Project: withdraw failed");
    emit Withdraw(msg.sender, address(this), contractBalance);
  }

  function mintNFT() external hasMintableNFTs returns (uint256) {
    console.log("running");
    uint256 newTokenId = tokenIds.current();
    _safeMint(msg.sender, newTokenId);

    tokenIds.increment();

    return newTokenId;
  }
}
