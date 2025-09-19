import { useEffect, useRef, useState } from "react";
import { HighlightedCell } from "./HighlightedCell";
import { parseEther } from "viem";
import { useWriteContract } from "wagmi";
import { PencilIcon } from "@heroicons/react/24/outline";
import { SIMPLE_ORACLE_ABI } from "~~/utils/constants";
import { notification } from "~~/utils/scaffold-eth";

type EditableCellProps = {
  value: string | number;
  address: string;
  highlightColor?: string;
};

export const EditableCell = ({ value, address, highlightColor = "" }: EditableCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(Number(value.toString()) || "");
  const inputRef = useRef<HTMLInputElement>(null);

  const { writeContractAsync } = useWriteContract();

  // Update edit value when prop value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(Number(value.toString()) || "");
    }
  }, [value, isEditing]);

  // Focus input when editing starts
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
      await writeContractAsync({
        abi: SIMPLE_ORACLE_ABI,
        address: address,
        functionName: "setPrice",
        args: [parseEther(parsedValue.toString())],
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Submit failed:", error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  return (
    <HighlightedCell value={value} highlightColor={highlightColor} className={`w-[40%] max-w-[40%] overflow-hidden`}>
      <div className="flex w-full items-start">
        {/* 70% width for value display/editing */}
        <div className="w-[70%]">
          {isEditing ? (
            <div className="relative px-1">
              <input
                ref={inputRef}
                type={"text"}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="w-full text-sm bg-secondary rounded-md"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 h-full items-stretch">
              {value}
              <button className="px-2 text-sm bg-primary rounded" onClick={startEditing}>
                <PencilIcon className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>

        {/* 30% width for action buttons */}
        <div className="w-[30%] items-stretch justify-start pl-2">
          {isEditing && (
            <div className="flex items-stretch gap-1 w-full h-full">
              <button onClick={handleSubmit} className="px-2 text-sm bg-primary rounded">
                ✓
              </button>
              <button onClick={handleCancel} className="px-2 text-sm bg-secondary rounded">
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </HighlightedCell>
  );
};
