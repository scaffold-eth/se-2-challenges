/**
 * Utility functions for storing and retrieving proof data and commitment data from localStorage
 */

export interface SerializableProofData {
  proof: number[]; // Uint8Array serialized as number array
  publicInputs: any[];
  timestamp: number;
  contractAddress?: string;
  voteChoice?: boolean;
}

export interface CommitmentData {
  commitment: string;
  nullifier: string;
  secret: string;
  index: number;
}

export interface SerializableCommitmentData extends CommitmentData {
  timestamp: number;
  contractAddress?: string;
  userAddress?: string;
}

const PROOF_STORAGE_KEY_PREFIX = "zk-voting-proof-data";

/**
 * Generate contract and user-specific storage key
 */
const getStorageKey = (contractAddress?: string, userAddress?: string): string => {
  if (!contractAddress && !userAddress) {
    return `${PROOF_STORAGE_KEY_PREFIX}-default`;
  }
  if (!contractAddress) {
    return `${PROOF_STORAGE_KEY_PREFIX}-${userAddress?.toLowerCase() || "default"}`;
  }
  if (!userAddress) {
    return `${PROOF_STORAGE_KEY_PREFIX}-${contractAddress.toLowerCase()}`;
  }
  return `${PROOF_STORAGE_KEY_PREFIX}-${contractAddress.toLowerCase()}-${userAddress.toLowerCase()}`;
};

/**
 * Convert ProofData to a serializable format for localStorage
 */
export const serializeProofData = (
  proofData: { proof: Uint8Array; publicInputs: any[] },
  contractAddress?: string,
  voteChoice?: boolean,
): SerializableProofData => {
  return {
    proof: Array.from(proofData.proof), // Convert Uint8Array to number array
    publicInputs: proofData.publicInputs,
    timestamp: Date.now(),
    contractAddress,
    voteChoice,
  };
};

/**
 * Convert serialized data back to ProofData format
 */
export const deserializeProofData = (
  serializedData: SerializableProofData,
): { proof: Uint8Array; publicInputs: any[] } => {
  return {
    proof: new Uint8Array(serializedData.proof), // Convert number array back to Uint8Array
    publicInputs: serializedData.publicInputs,
  };
};

/**
 * Save proof data to localStorage
 */
export const saveProofToLocalStorage = (
  proofData: { proof: Uint8Array; publicInputs: any[] },
  contractAddress?: string,
  voteChoice?: boolean,
  userAddress?: string,
): void => {
  try {
    const serialized = serializeProofData(proofData, contractAddress, voteChoice);
    const storageKey = getStorageKey(contractAddress, userAddress);
    localStorage.setItem(storageKey, JSON.stringify(serialized));
    console.log(`Proof data saved to localStorage for contract: ${contractAddress}, user: ${userAddress}`);
  } catch (error) {
    console.error("Failed to save proof data to localStorage:", error);
  }
};

/**
 * Load proof data from localStorage
 */
export const loadProofFromLocalStorage = (
  contractAddress?: string,
  userAddress?: string,
): { proof: Uint8Array; publicInputs: any[] } | null => {
  try {
    const storageKey = getStorageKey(contractAddress, userAddress);
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;

    const serialized: SerializableProofData = JSON.parse(stored);
    return deserializeProofData(serialized);
  } catch (error) {
    console.error("Failed to load proof data from localStorage:", error);
    return null;
  }
};

/**
 * Get full serialized proof data with metadata from localStorage
 */
export const getStoredProofMetadata = (
  contractAddress?: string,
  userAddress?: string,
): SerializableProofData | null => {
  try {
    const storageKey = getStorageKey(contractAddress, userAddress);
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to get stored proof metadata:", error);
    return null;
  }
};

/**
 * Clear proof data from localStorage
 */
export const clearProofFromLocalStorage = (contractAddress?: string, userAddress?: string): void => {
  try {
    const storageKey = getStorageKey(contractAddress, userAddress);
    localStorage.removeItem(storageKey);
    console.log(`Proof data cleared from localStorage for contract: ${contractAddress}, user: ${userAddress}`);
  } catch (error) {
    console.error("Failed to clear proof data from localStorage:", error);
  }
};

/**
 * Check if proof data exists in localStorage
 */
export const hasStoredProof = (contractAddress?: string, userAddress?: string): boolean => {
  try {
    const storageKey = getStorageKey(contractAddress, userAddress);
    return localStorage.getItem(storageKey) !== null;
  } catch {
    return false;
  }
};

// Commitment storage functions
const COMMITMENT_STORAGE_KEY_PREFIX = "zk-voting-commitment-data";

/**
 * Generate contract and user-specific storage key for commitments
 */
const getCommitmentStorageKey = (contractAddress?: string, userAddress?: string): string => {
  if (!contractAddress && !userAddress) {
    return `${COMMITMENT_STORAGE_KEY_PREFIX}-default`;
  }
  if (!contractAddress) {
    return `${COMMITMENT_STORAGE_KEY_PREFIX}-${userAddress?.toLowerCase() || "default"}`;
  }
  if (!userAddress) {
    return `${COMMITMENT_STORAGE_KEY_PREFIX}-${contractAddress.toLowerCase()}`;
  }
  return `${COMMITMENT_STORAGE_KEY_PREFIX}-${contractAddress.toLowerCase()}-${userAddress.toLowerCase()}`;
};

/**
 * Save commitment data to localStorage
 */
export const saveCommitmentToLocalStorage = (
  commitmentData: CommitmentData,
  contractAddress?: string,
  userAddress?: string,
): void => {
  try {
    const serialized: SerializableCommitmentData = {
      ...commitmentData,
      timestamp: Date.now(),
      contractAddress,
      userAddress,
    };
    const storageKey = getCommitmentStorageKey(contractAddress, userAddress);
    localStorage.setItem(storageKey, JSON.stringify(serialized));
    console.log(`Commitment data saved to localStorage for contract: ${contractAddress}, user: ${userAddress}`);
  } catch (error) {
    console.error("Failed to save commitment data to localStorage:", error);
  }
};

/**
 * Load commitment data from localStorage
 */
export const loadCommitmentFromLocalStorage = (
  contractAddress?: string,
  userAddress?: string,
): CommitmentData | null => {
  try {
    const storageKey = getCommitmentStorageKey(contractAddress, userAddress);
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;

    const serialized: SerializableCommitmentData = JSON.parse(stored);
    // Return only the commitment data without metadata
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { timestamp, contractAddress: _, userAddress: __, ...commitmentData } = serialized;
    return commitmentData;
  } catch (error) {
    console.error("Failed to load commitment data from localStorage:", error);
    return null;
  }
};

/**
 * Get full serialized commitment data with metadata from localStorage
 */
export const getStoredCommitmentMetadata = (
  contractAddress?: string,
  userAddress?: string,
): SerializableCommitmentData | null => {
  try {
    const storageKey = getCommitmentStorageKey(contractAddress, userAddress);
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to get stored commitment metadata:", error);
    return null;
  }
};

/**
 * Clear commitment data from localStorage
 */
export const clearCommitmentFromLocalStorage = (contractAddress?: string, userAddress?: string): void => {
  try {
    const storageKey = getCommitmentStorageKey(contractAddress, userAddress);
    localStorage.removeItem(storageKey);
    console.log(`Commitment data cleared from localStorage for contract: ${contractAddress}, user: ${userAddress}`);
  } catch (error) {
    console.error("Failed to clear commitment data from localStorage:", error);
  }
};

/**
 * Check if commitment data exists in localStorage
 */
export const hasStoredCommitment = (contractAddress?: string, userAddress?: string): boolean => {
  try {
    const storageKey = getCommitmentStorageKey(contractAddress, userAddress);
    return localStorage.getItem(storageKey) !== null;
  } catch {
    return false;
  }
};

// Burner wallet storage functions
export interface SerializableBurnerWalletData {
  privateKey: string;
  address: string;
  timestamp: number;
  contractAddress?: string;
  userAddress?: string;
}

const BURNER_WALLET_STORAGE_KEY_PREFIX = "zk-voting-burner-wallet";

/**
 * Generate contract and user-specific storage key for burner wallets
 */
const getBurnerWalletStorageKey = (contractAddress?: string, userAddress?: string): string => {
  if (!contractAddress && !userAddress) {
    return `${BURNER_WALLET_STORAGE_KEY_PREFIX}-default`;
  }
  if (!contractAddress) {
    return `${BURNER_WALLET_STORAGE_KEY_PREFIX}-${userAddress?.toLowerCase() || "default"}`;
  }
  if (!userAddress) {
    return `${BURNER_WALLET_STORAGE_KEY_PREFIX}-${contractAddress.toLowerCase()}`;
  }
  return `${BURNER_WALLET_STORAGE_KEY_PREFIX}-${contractAddress.toLowerCase()}-${userAddress.toLowerCase()}`;
};

/**
 * Save burner wallet data to localStorage
 */
export const saveBurnerWalletToLocalStorage = (
  privateKey: string,
  address: string,
  contractAddress?: string,
  userAddress?: string,
): void => {
  try {
    const serialized: SerializableBurnerWalletData = {
      privateKey,
      address,
      timestamp: Date.now(),
      contractAddress,
      userAddress,
    };
    const storageKey = getBurnerWalletStorageKey(contractAddress, userAddress);
    localStorage.setItem(storageKey, JSON.stringify(serialized));
    console.log(`Burner wallet saved to localStorage for contract: ${contractAddress}, user: ${userAddress}`);
  } catch (error) {
    console.error("Failed to save burner wallet to localStorage:", error);
  }
};

/**
 * Load burner wallet data from localStorage
 */
export const loadBurnerWalletFromLocalStorage = (
  contractAddress?: string,
  userAddress?: string,
): { privateKey: string; address: string } | null => {
  try {
    const storageKey = getBurnerWalletStorageKey(contractAddress, userAddress);
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;

    const serialized: SerializableBurnerWalletData = JSON.parse(stored);
    return {
      privateKey: serialized.privateKey,
      address: serialized.address,
    };
  } catch (error) {
    console.error("Failed to load burner wallet from localStorage:", error);
    return null;
  }
};

/**
 * Get full serialized burner wallet data with metadata from localStorage
 */
export const getStoredBurnerWalletMetadata = (
  contractAddress?: string,
  userAddress?: string,
): SerializableBurnerWalletData | null => {
  try {
    const storageKey = getBurnerWalletStorageKey(contractAddress, userAddress);
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to get stored burner wallet metadata:", error);
    return null;
  }
};

/**
 * Clear burner wallet data from localStorage
 */
export const clearBurnerWalletFromLocalStorage = (contractAddress?: string, userAddress?: string): void => {
  try {
    const storageKey = getBurnerWalletStorageKey(contractAddress, userAddress);
    localStorage.removeItem(storageKey);
    console.log(`Burner wallet cleared from localStorage for contract: ${contractAddress}, user: ${userAddress}`);
  } catch (error) {
    console.error("Failed to clear burner wallet from localStorage:", error);
  }
};

/**
 * Check if burner wallet data exists in localStorage
 */
export const hasStoredBurnerWallet = (contractAddress?: string, userAddress?: string): boolean => {
  try {
    const storageKey = getBurnerWalletStorageKey(contractAddress, userAddress);
    return localStorage.getItem(storageKey) !== null;
  } catch {
    return false;
  }
};

// Transaction result storage functions
export interface TransactionResult {
  userOpHash: string;
  success: boolean;
  timestamp: number;
  contractAddress?: string;
  receipt?: any; // Full receipt data
  errorMessage?: string;
}

const TRANSACTION_RESULT_STORAGE_KEY_PREFIX = "zk-voting-transaction-result";

/**
 * Generate contract and user-specific storage key for transaction results
 */
const getTransactionResultStorageKey = (contractAddress?: string, userAddress?: string): string => {
  if (!contractAddress && !userAddress) {
    return `${TRANSACTION_RESULT_STORAGE_KEY_PREFIX}-default`;
  }
  if (!contractAddress) {
    return `${TRANSACTION_RESULT_STORAGE_KEY_PREFIX}-${userAddress?.toLowerCase() || "default"}`;
  }
  if (!userAddress) {
    return `${TRANSACTION_RESULT_STORAGE_KEY_PREFIX}-${contractAddress.toLowerCase()}`;
  }
  return `${TRANSACTION_RESULT_STORAGE_KEY_PREFIX}-${contractAddress.toLowerCase()}-${userAddress.toLowerCase()}`;
};

/**
 * Save transaction result to localStorage
 */
export const saveTransactionResultToLocalStorage = (
  userOpHash: string,
  success: boolean,
  contractAddress?: string,
  userAddress?: string,
  receipt?: any,
  errorMessage?: string,
): void => {
  try {
    const transactionResult: TransactionResult = {
      userOpHash,
      success,
      timestamp: Date.now(),
      contractAddress,
      receipt,
      errorMessage,
    };
    const storageKey = getTransactionResultStorageKey(contractAddress, userAddress);
    localStorage.setItem(storageKey, JSON.stringify(transactionResult));
    console.log(
      `Transaction result saved to localStorage for contract: ${contractAddress}, user: ${userAddress}, success: ${success}`,
    );
  } catch (error) {
    console.error("Failed to save transaction result to localStorage:", error);
  }
};

/**
 * Load transaction result from localStorage
 */
export const loadTransactionResultFromLocalStorage = (
  contractAddress?: string,
  userAddress?: string,
): TransactionResult | null => {
  try {
    const storageKey = getTransactionResultStorageKey(contractAddress, userAddress);
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;

    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to load transaction result from localStorage:", error);
    return null;
  }
};

/**
 * Clear transaction result from localStorage
 */
export const clearTransactionResultFromLocalStorage = (contractAddress?: string, userAddress?: string): void => {
  try {
    const storageKey = getTransactionResultStorageKey(contractAddress, userAddress);
    localStorage.removeItem(storageKey);
    console.log(`Transaction result cleared from localStorage for contract: ${contractAddress}, user: ${userAddress}`);
  } catch (error) {
    console.error("Failed to clear transaction result from localStorage:", error);
  }
};

/**
 * Check if transaction result exists in localStorage
 */
export const hasStoredTransactionResult = (contractAddress?: string, userAddress?: string): boolean => {
  try {
    const storageKey = getTransactionResultStorageKey(contractAddress, userAddress);
    return localStorage.getItem(storageKey) !== null;
  } catch {
    return false;
  }
};
