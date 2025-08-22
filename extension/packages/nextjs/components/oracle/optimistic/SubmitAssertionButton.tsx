"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { usePublicClient } from "wagmi";
import TooltipInfo from "~~/components/TooltipInfo";
import { IntegerInput } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useChallengeState } from "~~/services/store/challengeStore";
import { getRandomQuestion } from "~~/utils/helpers";
import { notification } from "~~/utils/scaffold-eth";

const MINIMUM_ASSERTION_WINDOW = 3;

const getStartTimestamp = (timestamp: bigint, startInMinutes: string) => {
  if (startInMinutes.length === 0) return 0n;
  if (Number(startInMinutes) === 0) return 0n;
  return timestamp + BigInt(startInMinutes) * 60n;
};

const getEndTimestamp = (timestamp: bigint, startTimestamp: bigint, durationInMinutes: string) => {
  if (durationInMinutes.length === 0) return 0n;
  if (Number(durationInMinutes) === MINIMUM_ASSERTION_WINDOW) return 0n;
  if (startTimestamp === 0n) return timestamp + BigInt(durationInMinutes) * 60n;
  return startTimestamp + BigInt(durationInMinutes) * 60n;
};

interface SubmitAssertionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SubmitAssertionModal = ({ isOpen, onClose }: SubmitAssertionModalProps) => {
  const { timestamp } = useChallengeState();
  const [isLoading, setIsLoading] = useState(false);
  const publicClient = usePublicClient();

  const [description, setDescription] = useState("");
  const [reward, setReward] = useState<string>("");
  const [startInMinutes, setStartInMinutes] = useState<string>("");
  const [durationInMinutes, setDurationInMinutes] = useState<string>("");

  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "OptimisticOracle" });

  const handleRandomQuestion = () => {
    setDescription(getRandomQuestion());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (durationInMinutes.length > 0 && Number(durationInMinutes) < MINIMUM_ASSERTION_WINDOW) {
      notification.error(
        `Duration must be at least ${MINIMUM_ASSERTION_WINDOW} minutes or leave blank to use default value`,
      );
      return;
    }

    if (Number(reward) === 0) {
      notification.error(`Reward must be greater than 0 ETH`);
      return;
    }

    if (!publicClient) {
      notification.error("Public client not found");
      return;
    }

    try {
      setIsLoading(true);
      let recentTimestamp = timestamp;
      if (!recentTimestamp) {
        const block = await publicClient.getBlock();
        recentTimestamp = block.timestamp;
      }

      const startTimestamp = getStartTimestamp(recentTimestamp, startInMinutes);
      const endTimestamp = getEndTimestamp(recentTimestamp, startTimestamp, durationInMinutes);

      await writeContractAsync({
        functionName: "assertEvent",
        args: [description.trim(), startTimestamp, endTimestamp],
        value: parseEther(reward),
      });
      // Reset form after successful submission
      setDescription("");
      setReward("");
      setStartInMinutes("");
      setDurationInMinutes("");
      onClose();
    } catch (error) {
      console.log("Error with submission", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form when closing
    setDescription("");
    setReward("");
    setStartInMinutes("");
    setDurationInMinutes("");
  };

  if (!isOpen) return null;
  const readyToSubmit = description.trim().length > 0 && reward.trim().length > 0;

  return (
    <>
      <input type="checkbox" id="assertion-modal" className="modal-toggle" checked={isOpen} readOnly />
      <label htmlFor="assertion-modal" className="modal cursor-pointer" onClick={handleClose}>
        <label className="modal-box relative max-w-md w-full bg-base-100" htmlFor="" onClick={e => e.stopPropagation()}>
          {/* dummy input to capture event onclick on modal box */}
          <input className="h-0 w-0 absolute top-0 left-0" />

          {/* Close button */}
          <button onClick={handleClose} className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3">
            ✕
          </button>

          <div className="relative">
            <TooltipInfo
              top={-2}
              right={5}
              className="tooltip-left"
              infoText="Create a new assertion with your reward stake. Leave time inputs blank to use default values."
            />
          </div>

          {/* Modal Content */}
          <div>
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold">Submit New Assertion</h2>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Description Input */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">
                    Description <span className="text-red-500">*</span>
                  </span>
                </label>
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                    <div className="flex border-2 border-base-300 bg-base-200 rounded-full text-accent">
                      <textarea
                        name="description"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Enter assertion description..."
                        className="input-ghost min-h-[60px] px-4 w-full font-medium placeholder:text-accent/70 text-base-content/70 focus:text-base-content/70 resize-none bg-transparent focus:outline-none focus:border-0"
                        rows={2}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRandomQuestion}
                    className="btn btn-secondary btn-sm"
                    title="Select random question"
                  >
                    🎲
                  </button>
                </div>
              </div>
              <div>
                <label className="label">
                  <span className="label-text font-medium">
                    Reward (ETH) <span className="text-red-500">*</span>
                  </span>
                </label>
                <IntegerInput
                  name="reward"
                  placeholder={`0.01 ETH`}
                  value={reward}
                  onChange={newValue => setReward(newValue)}
                  disableMultiplyBy1e18
                />
              </div>
              {/* Start Time and End Time Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text font-medium">Start in (minutes)</span>
                  </label>
                  <IntegerInput
                    name="startTime"
                    placeholder="blank = now"
                    value={startInMinutes}
                    onChange={newValue => setStartInMinutes(newValue)}
                    disableMultiplyBy1e18
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text font-medium">Duration (minutes)</span>
                  </label>
                  <IntegerInput
                    name="endTime"
                    placeholder={`minimum ${MINIMUM_ASSERTION_WINDOW} minutes`}
                    value={durationInMinutes}
                    onChange={newValue => setDurationInMinutes(newValue)}
                    disableMultiplyBy1e18
                  />
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button type="submit" className="btn btn-primary flex-1" disabled={isLoading || !readyToSubmit}>
                  {isLoading && <span className="loading loading-spinner loading-xs"></span>}
                  Submit
                </button>
              </div>
            </form>
          </div>
        </label>
      </label>
    </>
  );
};

export const SubmitAssertionButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      {/* Button */}
      <div className="my-8 flex justify-center">
        <button className="btn btn-primary btn-lg" onClick={openModal}>
          Submit New Assertion
        </button>
      </div>

      {/* Modal - only mounted when open */}
      {isModalOpen && <SubmitAssertionModal isOpen={isModalOpen} onClose={closeModal} />}
    </>
  );
};
