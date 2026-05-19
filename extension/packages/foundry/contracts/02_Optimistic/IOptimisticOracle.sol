// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IOptimisticOracle {
    // Enums
    enum State {
        Invalid,
        Asserted,
        Proposed,
        Disputed,
        Settled,
        Expired
    }

    // Errors
    error AssertionNotFound();
    error AssertionProposed();
    error InvalidValue();
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

    // Structs
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

    // Events
    event EventAsserted(uint256 assertionId, address asserter, string description, uint256 reward);
    event OutcomeProposed(uint256 assertionId, address proposer, bool outcome);
    event OutcomeDisputed(uint256 assertionId, address disputer);
    event AssertionSettled(uint256 assertionId, bool outcome, address winner);
    event DeciderUpdated(address oldDecider, address newDecider);
    event RewardClaimed(uint256 assertionId, address winner, uint256 amount);
    event RefundClaimed(uint256 assertionId, address asserter, uint256 amount);

    // Functions
    function MINIMUM_ASSERTION_WINDOW() external view returns (uint256);
    function DISPUTE_WINDOW() external view returns (uint256);
    function decider() external view returns (address);
    function owner() external view returns (address);
    function nextAssertionId() external view returns (uint256);
    function setDecider(address _decider) external;
    function getAssertion(uint256 assertionId) external view returns (EventAssertion memory);
    function assertEvent(string memory description, uint256 startTime, uint256 endTime) external payable returns (uint256);
    function proposeOutcome(uint256 assertionId, bool outcome) external payable;
    function disputeOutcome(uint256 assertionId) external payable;
    function claimUndisputedReward(uint256 assertionId) external;
    function claimDisputedReward(uint256 assertionId) external;
    function claimRefund(uint256 assertionId) external;
    function settleAssertion(uint256 assertionId, bool resolvedOutcome) external;
    function getState(uint256 assertionId) external view returns (State);
    function getResolution(uint256 assertionId) external view returns (bool);
}
