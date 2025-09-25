"use client";

import { useState } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";

/**
 * Button component that clears all zk-voting related localStorage data
 * This includes proof data, commitment data, and burner wallet data for the current app
 */
export const ClearStorageButton = () => {
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const clearAllVotingStorage = () => {
    setIsClearing(true);

    try {
      // Get all localStorage keys
      const keys = Object.keys(localStorage);

      // Filter keys that belong to this zk-voting app
      const zkVotingKeys = keys.filter(
        key =>
          key.startsWith("zk-voting-proof-data") ||
          key.startsWith("zk-voting-commitment-data") ||
          key.startsWith("zk-voting-burner-wallet") ||
          key.startsWith("zk-voting-transaction-result"),
      );

      // Remove all zk-voting related keys
      zkVotingKeys.forEach(key => {
        localStorage.removeItem(key);
      });

      console.log(`Cleared ${zkVotingKeys.length} zk-voting storage items:`, zkVotingKeys);

      // Force page reload to reset any cached state
      window.location.reload();
    } catch (error) {
      console.error("Failed to clear zk-voting storage:", error);
    } finally {
      setIsClearing(false);
      setShowConfirm(false);
    }
  };

  const handleClick = () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }
    clearAllVotingStorage();
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleClick}
        disabled={isClearing}
        className={`
          btn btn-sm btn-error gap-2
          ${isClearing ? "loading" : ""}
          ${showConfirm ? "btn-outline" : ""}
        `}
      >
        {isClearing ? (
          <>
            <span className="loading loading-spinner loading-xs"></span>
            Clearing...
          </>
        ) : (
          <>
            <TrashIcon className="h-4 w-4" />
            {showConfirm ? "⚠️ Confirm Clear Local Storage ⚠️" : "Clear Local Storage"}
          </>
        )}
      </button>
    </div>
  );
};
