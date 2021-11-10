// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./Ownable.sol";
import "./Project.sol";

contract ProjectFactory is Ownable {
  mapping(uint256 => Project) public projectIndexToProject;
  mapping(address => Project[]) public ownersToProjects;

  constructor() Ownable(msg.sender) {}

  function createNewProject(
    string memory _name,
    string memory _description,
    uint256 _fundraisingGoal
  ) external payable {
    // TODO: Write code to declare new owner of Project + pass on msg.value
    Project newProject = new Project(
      _name,
      _description,
      _fundraisingGoal,
      msg.sender
    );
  }
}
