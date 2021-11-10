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

  // The minimum contribution limit for contributors to a project
  uint256 private constant MINIMUM_CONTRIBUTION = 0.1 ether;

  // TODO: Write events
  event Contribution(address from, address project, uint256 amount);
  event Refund(address to, address project, uint256 amount);
  event Withdraw(address to, address project, uint256 amount);

  modifier isCurrentlyRunningProject() {
    require(
      projectEndTimeSeconds <= block.timestamp,
      "Error: Time limit ended"
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

    // The maximum length of time a project can run is 30 days
    projectEndTimeSeconds = block.timestamp + (60 * 60 * 24 * 30);

    // Allow owners of project to contribute while instantiating
    if (msg.value > 0) {
      addressToContributions[msg.sender] += msg.value;
      emit Contribution(msg.sender, address(this), msg.value);
    }
  }

  receive() external payable {
    // TODO: Finish contribution
  }

  function cancelProject() external onlyOwner isCurrentlyRunningProject {
    isCancelled = true;
  }

  function withdrawCancelledProjectFunds() external payable {
    require(!isCancelled, "Error: Project is not cancelled");

    uint256 addressContributions = addressToContributions[msg.sender];
    addressToContributions[msg.sender] = 0;
    (bool success, ) = msg.sender.call{ value: addressContributions }("");
    require(success, "Error: Transfer failed");
    emit Refund(msg.sender, address(this), addressContributions);
  }

  function withdrawCompletedProjectFunds() external payable onlyOwner {
    // finish
  }
}
