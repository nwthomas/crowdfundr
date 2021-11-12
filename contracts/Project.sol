// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/// @title A contract for holding a fundraising project
/// @author Nathan Thomas
/// @notice This contract is not audited - use at your own risk
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
      balanceOf(msg.sender) <
        addressToContributions[msg.sender] / 1000000000000000000,
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

  /// @notice Instantiates a new fundraising project and instantly transfers ownership
  /// to the _projectOwner address provided
  /// @param _name The name of the fundraising project to be used in the NFT badges
  /// given to contributors of >= 1 ether
  /// @param _description The description of the fundraising project
  /// @param _tokenSymbol The NFT token symbol
  /// @param _fundraisingGoal The total ether goal of the new fundraising project
  /// @param _projectOwner The true owner of the project (and which instantly gains
  /// ownership on completion of instantiating the contract)
  /// @dev The project expiration time will always be 30 days from creation
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

  /// @notice Allows any address to contribute to the contract if the project has not
  /// been cancelled, is not expired, and has not already been finished successfully
  /// @dev If an address' contributions put the contract over the fundraising limit,
  /// it's a valid contribution but the fundraising project is finished immediately
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

  /// @notice Allows the owner of the project to cancel it if the project has not
  /// been cancelled, is not expired, and has not already been finished successfully
  function cancelProject()
    external
    onlyOwner
    isNotCancelledProject
    isNotExpiredProject
    isNotFinishedProject
  {
    isCancelled = true;
  }

  /// @notice Refunds an address' ether if the project is either cancelled or has
  /// expired without finishing successfully
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

  /// @notice Allows the owner of the contract to withdraw a successfully completed
  /// fundraising project's ether
  function withdrawCompletedProjectFunds() external onlyOwner {
    require(isFinished, "Project: project not finished successfully");

    uint256 contractBalance = address(this).balance;
    (bool success, ) = msg.sender.call{ value: contractBalance }("");
    require(success, "Project: withdraw failed");
    emit Withdraw(msg.sender, address(this), contractBalance);
  }

  /// @notice Allows the lazy minting of NFT badges for all contributors for the
  /// fundraising project
  /// @dev Once a token has been minted here, the NFT will respect all ERC721 API
  /// spec requirements
  function mintNFT() external hasMintableNFTs {
    uint256 newTokenId = tokenIds.current();
    _safeMint(msg.sender, newTokenId);

    tokenIds.increment();
  }
}
