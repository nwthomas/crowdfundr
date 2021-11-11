// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

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
  event Refunded(
    address indexed to,
    address indexed project,
    uint256 indexed amount
  );
  event Withdrawn(
    address indexed to,
    address indexed project,
    uint256 indexed amount
  );

  modifier hasMintableNFTs() {
    uint256 addressNFTs = balanceOf(msg.sender);
    uint256 wholeEthContributed = addressToContributions[msg.sender] / 1;
    require(
      addressNFTs < wholeEthContributed,
      "Project: no available NFTs to mint"
    );
    _;
  }

  modifier isCancelledProject() {
    require(isCancelled, "Project: project has not been cancelled");
    _;
  }

  modifier isExpiredProject() {
    require(
      projectEndTimeSeconds > block.timestamp,
      "Project: time limit has not expired"
    );
    _;
  }

  modifier isNotExpiredProject() {
    require(
      projectEndTimeSeconds <= block.timestamp,
      "Project: time limit for project expired"
    );
    _;
  }

  modifier isNotCancelledProject() {
    require(!isCancelled, "Project: project has been cancelled");
    _;
  }

  modifier isValidContribution() {
    require(
      msg.value >= MINIMUM_CONTRIBUTION,
      "Project: contribution must be >= 0.01 ether"
    );
    _;
  }

  constructor(
    string memory _name,
    string memory _description,
    string memory _tokenSymbol,
    uint256 _fundraisingGoal,
    address _projectOwner
  ) payable ERC721(_name, _tokenSymbol) {
    transferOwnership(_projectOwner);

    description = _description;
    fundraisingGoal = _fundraisingGoal;
    projectEndTimeSeconds = block.timestamp + PROJECT_TIME_LENGTH_SECONDS;
  }

  receive()
    external
    payable
    isValidContribution
    isNotExpiredProject
    isNotCancelledProject
  {
    addressToContributions[msg.sender] += msg.value;
    emit Contribution(msg.sender, address(this), msg.value);
  }

  function cancelProject() external onlyOwner isNotCancelledProject {
    isCancelled = true;
  }

  function withdrawCancelledProjectFunds() external isCancelledProject {
    require(
      addressToContributions[msg.sender] > 0,
      "Project: address has not contributions"
    );

    uint256 addressContributions = addressToContributions[msg.sender];
    addressToContributions[msg.sender] = 0;
    (bool success, ) = msg.sender.call{ value: addressContributions }("");
    require(success, "Error: Transfer failed");
    emit Refunded(msg.sender, address(this), addressContributions);
  }

  function withdrawCompletedProjectFunds()
    external
    onlyOwner
    isNotCancelledProject
    isExpiredProject
  {
    require(address(this).balance > 0, "Project: contains no ether");

    uint256 contractBalance = address(this).balance;
    (bool success, ) = msg.sender.call{ value: contractBalance }("");
    require(success, "Project: transfer failed");
    emit Withdrawn(msg.sender, address(this), contractBalance);
  }

  function mintNFT()
    external
    isNotCancelledProject
    isExpiredProject
    hasMintableNFTs
    returns (uint256)
  {
    uint256 newTokenId = tokenIds.current();
    _safeMint(msg.sender, newTokenId);

    tokenIds.increment();

    return newTokenId;
  }
}
