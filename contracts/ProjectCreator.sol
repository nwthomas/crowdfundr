// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./Ownable.sol";
import "./Project.sol";

contract ProjectFactory is Ownable(msg.sender) {
  Project[] public projects;
  mapping(address => uint256[]) public ownerToProjects;

  function createNewProject(
    string calldata _name,
    string calldata _description,
    uint256 _fundraisingGoal
  ) external {
    Project newProject = new Project(
      _name,
      _description,
      _fundraisingGoal,
      msg.sender
    );

    ownerToProjects[msg.sender].push(projects.length);
    projects.push(newProject);
  }
}
