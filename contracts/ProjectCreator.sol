// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./Ownable.sol";
import "./Project.sol";

contract ProjectFactory is Ownable(msg.sender) {
  Project[] public projects;
  mapping(address => uint256[]) public ownersToProjects;

  function createNewProject(
    string memory _name,
    string memory _description,
    uint256 _fundraisingGoal
  ) external payable {
    Project newProject = new Project(
      _name,
      _description,
      _fundraisingGoal,
      msg.sender
    );

    ownersToProjects[msg.sender].push(projects.length);
    projects.push(newProject);
  }
}
