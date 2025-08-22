// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./OptimisticOracle.sol";

contract Decider {
    address public owner;
    OptimisticOracle public oracle;
    
    event DisputeSettled(uint256 indexed assertionId, bool resolvedValue);
    
    constructor(address _oracle) {
        owner = msg.sender;
        oracle = OptimisticOracle(_oracle);
    }
    
    /**
     * @notice Settle a dispute by determining the true/false outcome
     * @param assertionId The ID of the assertion to settle
     * @param resolvedValue The true/false outcome determined by the decider
     */
    function settleDispute(uint256 assertionId, bool resolvedValue) external {
        require(assertionId >= 1, "Invalid assertion ID");
        
        // Call the oracle's settleAssertion function
        oracle.settleAssertion(assertionId, resolvedValue);
        
        emit DisputeSettled(assertionId, resolvedValue);
    }
    
    function setOracle(address newOracle) external {
        require(msg.sender == owner, "Only owner can set oracle");
        oracle = OptimisticOracle(newOracle);
    }

    /**
     * @notice Allow the contract to receive ETH
     */
    receive() external payable {}
} 
