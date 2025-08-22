// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

contract OptimisticOracle {
    enum State { Invalid, Asserted, Proposed, Disputed, Settled, Expired }

    error AssertionNotFound();
    error AssertionProposed();
    error NotEnoughValue();
    error InvalidTime();
    error ProposalDisputed();
    error NotProposedAssertion();
    error AlreadyClaimed();
    error AlreadySettled();
    error AwaitingDecider();
    error NotDisputedAssertion();
    error OnlyDecider();
    error OnlyOwner();
    error TransferFailed();

    struct EventAssertion {
        address asserter;
        address proposer;
        address disputer;
        bool proposedOutcome;
        bool resolvedOutcome;
        uint256 reward;
        uint256 bond;
        uint256 startTime;
        uint256 endTime;
        bool claimed;
        address winner;
        string description;
    }
    uint256 public constant MINIMUM_ASSERTION_WINDOW = 3 minutes;
    uint256 public constant MINIMUM_DISPUTE_WINDOW = 3 minutes;
    address public decider;
    address public owner;
    uint256 public nextAssertionId = 1;
    mapping(uint256 => EventAssertion) public assertions;

    event EventAsserted(uint256 assertionId, address asserter, string description, uint256 reward);
    event OutcomeProposed(uint256 assertionId, address proposer, bool outcome);
    event OutcomeDisputed(uint256 assertionId, address disputer);
    event AssertionSettled(uint256 assertionId, bool outcome, address winner);
    event DeciderUpdated(address oldDecider, address newDecider);
    event RewardClaimed(uint256 assertionId, address winner, uint256 amount);
    event RefundClaimed(uint256 assertionId, address asserter, uint256 amount);

    modifier onlyDecider() {
        if (msg.sender != decider) revert OnlyDecider();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(address _decider) {
        decider = _decider;
        owner = msg.sender;
    }

    function setDecider(address _decider) external onlyOwner {
        address oldDecider = address(decider);
        decider = _decider;
        emit DeciderUpdated(oldDecider, _decider);
    }

    function getAssertion(uint256 assertionId) external view returns (EventAssertion memory) {
        return assertions[assertionId];
    }

    function assertEvent(string memory description, uint256 startTime, uint256 endTime) external payable returns (uint256) {

    }

    function proposeOutcome(uint256 assertionId, bool outcome) external payable {

    }

    function disputeOutcome(uint256 assertionId) external payable {
  
    }

    function claimUndisputedReward(uint256 assertionId) external {

    }

    function claimDisputedReward(uint256 assertionId) external {

    }

    function claimRefund(uint256 assertionId) external {

    }

    function settleAssertion(uint256 assertionId, bool resolvedOutcome) external onlyDecider {

    }

    function getState(uint256 assertionId) external view returns (State) {

    }

    function getResolution(uint256 assertionId) external view returns (bool) {

    }
}
