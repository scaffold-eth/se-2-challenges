//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import {LeanIMT, LeanIMTData} from "@zk-kit/lean-imt.sol/LeanIMT.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
/// Checkpoint 6 //////
// import {IVerifier} from "./Verifier.sol";

contract Voting is Ownable {
    using LeanIMT for LeanIMTData;

    //////////////////
    /// Errors //////
    /////////////////

    error Voting__CommitmentAlreadyAdded(uint256 commitment);
    error Voting__NullifierHashAlreadyUsed(bytes32 nullifierHash);
    error Voting__InvalidProof();
    error Voting__NotAllowedToVote();

    ///////////////////////
    /// State Variables ///
    ///////////////////////

    string private s_question;
    mapping(address => bool) private s_voters;
    uint256 private s_yesVotes;
    uint256 private s_noVotes;

    /// Checkpoint 2 //////

    /// Checkpoint 6 //////

    //////////////
    /// Events ///
    //////////////

    event VoterAdded(address indexed voter);
    event NewLeaf(uint256 index, uint256 value);
    event VoteCast(
        bytes32 indexed nullifierHash,
        address indexed voter,
        bool vote,
        uint256 timestamp,
        uint256 totalYes,
        uint256 totalNo
    );

    //////////////////
    ////Constructor///
    //////////////////

    constructor(address _owner, address _verifier, string memory _question) Ownable(_owner) {
        s_question = _question;
        /// Checkpoint 6 //////
    }

    //////////////////
    /// Functions ///
    //////////////////

    /**
     * @notice Batch updates the allowlist of voter EOAs
     * @dev Only the contract owner can call this function. Emits `VoterAdded` for each updated entry.
     * @param voters Addresses to update in the allowlist
     * @param statuses True to allow, false to revoke
     */
    function addVoters(address[] calldata voters, bool[] calldata statuses) public onlyOwner {
        require(voters.length == statuses.length, "Voters and statuses length mismatch");

        for (uint256 i = 0; i < voters.length; i++) {
            s_voters[voters[i]] = statuses[i];
            emit VoterAdded(voters[i]);
        }
    }

    /**
     * @notice Registers a commitment leaf for an allowlisted address
     * @dev A given allowlisted address can register exactly once. Reverts if
     *      the caller is not allowlisted or has already registered, or if the
     *      same commitment has been previously inserted. Emits `NewLeaf`.
     * @param _commitment The Poseidon-based commitment to insert into the IMT
     */
    function register(uint256 _commitment) public {
        /// Checkpoint 2 //////
    }

    /**
     * @notice Casts a vote using a zero-knowledge proof
     * @dev Enforces single-use via `s_nullifierHashes`. Public inputs order must
     *      match the circuit: root, nullifierHash, vote, depth. The `_vote`
     *      value is interpreted as: 1 => yes, any other value => no. Emits `VoteCast`.
     * @param _proof Ultra Honk proof bytes
     * @param _root Merkle root corresponding to the registered commitments tree
     * @param _nullifierHash Unique nullifier to prevent double voting
     * @param _vote Encoded vote: 1 for yes, otherwise counted as no
     * @param _depth Tree depth used by the circuit
     */
    function vote(bytes memory _proof, bytes32 _nullifierHash, bytes32 _root, bytes32 _vote, bytes32 _depth) public {
        /// Checkpoint 6 //////
    }

    /////////////////////////
    /// Getter Functions ///
    ////////////////////////

    function getVotingData()
        public
        view
        returns (
            string memory question,
            address contractOwner,
            uint256 yesVotes,
            uint256 noVotes,
            uint256 size,
            uint256 depth,
            uint256 root
        )
    {
        question = s_question;
        contractOwner = owner();
        yesVotes = s_yesVotes;
        noVotes = s_noVotes;
        /// Checkpoint 2 //////
        // size = s_tree.size;
        // depth = s_tree.depth;
        // root = s_tree.root();
    }

    function getVoterData(address _voter) public view returns (bool voter, bool registered) {
        voter = s_voters[_voter];
        // /// Checkpoint 2 //////
        // registered = s_hasRegistered[_voter];
    }
}
