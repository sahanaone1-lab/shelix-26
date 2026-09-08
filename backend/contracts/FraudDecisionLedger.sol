// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FraudDecisionLedger
 * @notice Immutable, tamper-evident audit ledger for financial fraud decisions.
 * @dev Stores cryptographically hashed decision proofs and evidence without exposing sensitive customer PII.
 */
contract FraudDecisionLedger {
    address public immutable owner;

    struct FraudDecision {
        bytes32 transactionHash;   // SHA-256 / Keccak-256 hash of the unique transaction identifier
        string transactionId;     // Human-readable reference ID (e.g. TXN-LOW-XXXX or UUID)
        uint16 riskScore;         // Evaluated ML risk score (0–100)
        string riskCategory;      // Risk tier ("LOW", "MEDIUM", "HIGH")
        string decision;          // Finalized outcome ("COMPLETED", "BLOCKED")
        uint256 timestamp;        // Decision timestamp (Unix epoch seconds)
        bytes32 evidenceHash;     // Cryptographic hash of SHAP explanations & behavioral evidence
        address recordedBy;       // Identity of the authorized service or analyst
        uint256 blockNumber;      // Block height at time of recording
    }

    // Mapping from transactionHash to FraudDecision record
    mapping(bytes32 => FraudDecision) public decisions;

    // Ordered list of transaction hashes for enumeration and transparency
    bytes32[] public decisionKeys;

    // Emitted whenever a fraud decision is recorded on the blockchain
    event FraudDecisionRecorded(
        bytes32 indexed transactionHash,
        string transactionId,
        uint16 riskScore,
        string riskCategory,
        string decision,
        uint256 timestamp,
        bytes32 evidenceHash,
        address indexed recordedBy,
        uint256 blockNumber
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "FraudDecisionLedger: Caller is not the authorized owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Records a finalized fraud decision into the immutable ledger.
     * @param _transactionHash Cryptographic hash of the transaction identifier
     * @param _transactionId Human-readable transaction identifier
     * @param _riskScore Score between 0 and 100
     * @param _riskCategory Risk tier (LOW, MEDIUM, HIGH)
     * @param _decision Final decision (COMPLETED or BLOCKED)
     * @param _timestamp Decision epoch timestamp
     * @param _evidenceHash Hash of SHAP factors, timing, and travel velocity evidence
     */
    function recordDecision(
        bytes32 _transactionHash,
        string calldata _transactionId,
        uint16 _riskScore,
        string calldata _riskCategory,
        string calldata _decision,
        uint256 _timestamp,
        bytes32 _evidenceHash
    ) external returns (bool) {
        require(_transactionHash != bytes32(0), "FraudDecisionLedger: Invalid transaction hash");
        require(decisions[_transactionHash].timestamp == 0, "FraudDecisionLedger: Decision already recorded on-chain");

        uint256 recordTime = _timestamp > 0 ? _timestamp : block.timestamp;

        FraudDecision memory record = FraudDecision({
            transactionHash: _transactionHash,
            transactionId: _transactionId,
            riskScore: _riskScore,
            riskCategory: _riskCategory,
            decision: _decision,
            timestamp: recordTime,
            evidenceHash: _evidenceHash,
            recordedBy: msg.sender,
            blockNumber: block.number
        });

        decisions[_transactionHash] = record;
        decisionKeys.push(_transactionHash);

        emit FraudDecisionRecorded(
            _transactionHash,
            _transactionId,
            _riskScore,
            _riskCategory,
            _decision,
            recordTime,
            _evidenceHash,
            msg.sender,
            block.number
        );

        return true;
    }

    /**
     * @notice Verifies if a given transaction decision matches the immutable on-chain record.
     * @return isAnchored True if the transaction exists in the ledger
     * @return isValid True if anchored and all parameters match
     * @return isTampered True if anchored but parameters differ (tampering detected)
     */
    function verifyDecision(
        bytes32 _transactionHash,
        uint16 _riskScore,
        string calldata _decision,
        bytes32 _evidenceHash
    ) external view returns (bool isAnchored, bool isValid, bool isTampered) {
        FraudDecision memory stored = decisions[_transactionHash];
        if (stored.timestamp == 0) {
            return (false, false, false); // Not anchored
        }

        bool scoreMatch = (stored.riskScore == _riskScore);
        bool decisionMatch = (keccak256(bytes(stored.decision)) == keccak256(bytes(_decision)));
        bool evidenceMatch = (_evidenceHash == bytes32(0) || stored.evidenceHash == _evidenceHash);

        if (scoreMatch && decisionMatch && evidenceMatch) {
            return (true, true, false);
        } else {
            return (true, false, true); // Tampering detected
        }
    }

    /**
     * @notice Retrieves total number of decisions anchored.
     */
    function getTotalDecisions() external view returns (uint256) {
        return decisionKeys.length;
    }

    /**
     * @notice Retrieves an anchored decision by transaction hash.
     */
    function getDecision(bytes32 _transactionHash) external view returns (FraudDecision memory) {
        require(decisions[_transactionHash].timestamp != 0, "FraudDecisionLedger: Decision not found");
        return decisions[_transactionHash];
    }
}
