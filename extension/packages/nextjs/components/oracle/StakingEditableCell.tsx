import { useEffect, useMemo, useRef, useState } from "react";
import { HighlightedCell } from "./HighlightedCell";
import { formatEther, parseEther } from "viem";
import { ArrowPathIcon, PencilIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

type StakingEditableCellProps = {
  value: string | number;
  nodeAddress: string;
  highlightColor?: string;
  className?: string;
  canEdit?: boolean;
  disabled?: boolean;
};

export const StakingEditableCell = ({
  value,
  nodeAddress,
  highlightColor = "",
  className = "",
  canEdit = true,
  disabled = false,
}: StakingEditableCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const coerceToNumber = (val: string | number) => {
    if (typeof val === "number") return val;
    const numeric = Number(String(val).replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(numeric) ? numeric : NaN;
  };
  const [editValue, setEditValue] = useState<number | string>(coerceToNumber(value) || "");
  const inputRef = useRef<HTMLInputElement>(null);

  const { writeContractAsync: writeStakingOracle } = useScaffoldWriteContract({ contractName: "StakingOracle" });

  // Read current bucket and previous bucket average for refresh
  const { data: currentBucket } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getCurrentBucketNumber",
  }) as { data: bigint | undefined };

  const previousBucket = useMemo(
    () => (currentBucket && currentBucket > 0n ? currentBucket - 1n : 0n),
    [currentBucket],
  );

  const { data: prevBucketAverage } = useScaffoldReadContract({
    contractName: "StakingOracle",
    functionName: "getPastPrice",
    args: [previousBucket] as any,
  }) as { data: bigint | undefined };

  const hasPrevAvg = typeof prevBucketAverage === "bigint" && prevBucketAverage > 0n;

  useEffect(() => {
    if (!isEditing) {
      setEditValue(coerceToNumber(value) || "");
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSubmit = async () => {
    const parsedValue = Number(editValue);
    if (isNaN(parsedValue)) {
      notification.error("Invalid number");
      return;
    }
    try {
      await writeStakingOracle({
        functionName: "reportPrice",
        args: [parseEther(parsedValue.toString())],
        account: nodeAddress as `0x${string}`,
      });
      setIsEditing(false);
    } catch (error: any) {
      console.error(error?.shortMessage || "Failed to update price");
    }
  };

  // Resubmits the average price from the previous bucket
  const handleRefresh = async () => {
    if (!prevBucketAverage || prevBucketAverage === 0n) {
      notification.error("No previous bucket average available");
      return;
    }
    const avgPrice = Number(formatEther(prevBucketAverage));
    try {
      await writeStakingOracle({
        functionName: "reportPrice",
        args: [parseEther(avgPrice.toString())],
        account: nodeAddress as `0x${string}`,
      });
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleCancel = () => setIsEditing(false);
  const startEditing = () => {
    if (!canEdit || disabled) return;
    setIsEditing(true);
  };

  return (
    <HighlightedCell
      value={value}
      highlightColor={highlightColor}
      className={`min-w-[14rem] w-[16rem] whitespace-nowrap overflow-visible ${className}`}
    >
      <div className="flex w-full items-start">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="relative px-1">
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="w-full text-sm bg-secondary rounded-md"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 h-full items-stretch">
              <span className="truncate">{value}</span>
              {canEdit && (
                <div className="flex items-stretch gap-1">
                  <button
                    className="px-2 text-sm bg-primary rounded disabled:opacity-50 cursor-pointer"
                    onClick={startEditing}
                    disabled={!canEdit || disabled}
                    title="Edit price"
                  >
                    <PencilIcon className="w-2.5 h-2.5" />
                  </button>
                  <button
                    className="px-2 text-sm bg-secondary rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    onClick={() => {
                      if (isRefreshing || !hasPrevAvg || disabled) return;
                      setIsRefreshing(true);
                      try {
                        void handleRefresh();
                      } catch {}
                      setTimeout(() => setIsRefreshing(false), 3000);
                    }}
                    disabled={!canEdit || disabled || isRefreshing || !hasPrevAvg}
                    title={hasPrevAvg ? "Report previous bucket average" : "No past price available"}
                  >
                    <ArrowPathIcon className={`w-2.5 h-2.5 ${isRefreshing ? "animate-spin" : ""}`} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="shrink-0 items-stretch justify-start pl-2">
          {isEditing && (
            <div className="flex items-stretch gap-1 w-full h-full">
              <button onClick={handleSubmit} className="px-2 text-sm bg-primary rounded cursor-pointer">
                ✓
              </button>
              <button onClick={handleCancel} className="px-2 text-sm bg-secondary rounded cursor-pointer">
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </HighlightedCell>
  );
};
