// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Project.sol";

/// @title A contract for managing the creation of new fundraising projects
/// @author Nathan Thomas
/// @notice This contract is not audited - use at your own risk
contract Manager is Ownable {
  Project[] public projects;
  mapping(address => uint256[]) public ownerToProjects;

  event ProjectCreated(
    address indexed creator,
    address indexed projectAddress,
    uint256 indexed projectIndex
  );

  /// @notice Creates a new fundraising project with ownership of the msg.sender
  /// @param _name The name of the new fundraising project
  /// @param _description The description of the new fundraising project
  /// @param _fundraisingGoal The total ether goal of the new fundraising project
  /// @dev The event or the tracking variables can be used to get the new project
  /// address when it's created
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
