// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Project.sol";

contract Manager is Ownable {
  Project[] public projects;
  mapping(address => uint256[]) public ownerToProjects;

  event ProjectCreated(
    address indexed creator,
    address indexed projectAddress,
    uint256 indexed projectIndex
  );

  function createNewProject(
    string calldata _name,
    string calldata _description,
    string calldata _tokenSymbol,
    uint256 _fundraisingGoal
  ) external {
    Project newProject = new Project(
      _name,
      _description,
      _tokenSymbol,
      _fundraisingGoal,
      msg.sender
    );

    uint256 newProjectIndex = projects.length;
    ownerToProjects[msg.sender].push(newProjectIndex);
    projects.push(newProject);
    emit ProjectCreated(msg.sender, address(newProject), newProjectIndex);
  }
}
