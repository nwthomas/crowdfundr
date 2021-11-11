// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./Ownable.sol";

contract Project is Ownable {
  string public name;
  string public description;
  uint256 public projectEndTimeSeconds;
  uint256 public fundraisingGoal;
  bool public isCancelled = false;

  mapping(address => uint256) public addressToContributions;

  uint256 private constant MINIMUM_CONTRIBUTION = 0.01 ether;
  uint256 private constant PROJECT_TIME_LENGTH_SECONDS = 30 days;

  event Contribution(address from, address project, uint256 amount);
  event Refunded(address to, address project, uint256 amount);
  event Withdrawn(address to, address project, uint256 amount);

  modifier isNotExpiredProject() {
    require(
      projectEndTimeSeconds <= block.timestamp,
      "Project: time limit for project expired"
    );
    _;
  }

  modifier isExpiredProject() {
    require(
      projectEndTimeSeconds > block.timestamp,
      "Project: time limit has not expired"
    );
    _;
  }

  modifier isNotCancelledProject() {
    require(!isCancelled, "Project: project has been cancelled");
    _;
  }

  modifier isCancelledProject() {
    require(isCancelled, "Project: project has not been cancelled");
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
    uint256 _fundraisingGoal,
    address _projectOwner
  ) payable Ownable(_projectOwner) {
    name = _name;
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

  function withdrawCancelledProjectFunds() external payable isCancelledProject {
    uint256 addressContributions = addressToContributions[msg.sender];
    addressToContributions[msg.sender] = 0;
    (bool success, ) = msg.sender.call{ value: addressContributions }("");
    require(success, "Error: Transfer failed");
    emit Refunded(msg.sender, address(this), addressContributions);
  }

  function withdrawCompletedProjectFunds()
    external
    payable
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

  function mintNFTs() external isNotCancelledProject isExpiredProject {
    // finish
  }
}
