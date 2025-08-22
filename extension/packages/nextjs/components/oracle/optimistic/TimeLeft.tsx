import { useEffect, useState } from "react";
import { useChallengeState } from "~~/services/store/challengeStore";

function formatDuration(seconds: number, isPending: boolean) {
  const totalSeconds = Math.max(seconds, 0);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m} m ${s} s${isPending ? " left to start" : ""}`;
}

export const TimeLeft = ({ startTime, endTime }: { startTime: bigint; endTime: bigint }) => {
  const { timestamp, refetchAssertionStates } = useChallengeState();
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Update current time every second
  useEffect(() => {
    // Initialize with timestamp from global state or current time
    const initialTime = timestamp ? Number(timestamp) : Math.floor(Date.now() / 1000);
    setCurrentTime(initialTime);

    const interval = setInterval(() => {
      setCurrentTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timestamp]);

  const start = Number(startTime);
  const end = Number(endTime);
  const now = currentTime;
  const duration = end - now;
  const ended = duration <= 0;
  const progressPercent = Math.min(((now - start) / (end - start)) * 100, 100);

  useEffect(() => {
    if (ended && timestamp) {
      refetchAssertionStates();
    }
  }, [ended, refetchAssertionStates, timestamp]);

  if (!timestamp) return "Calculating...";

  return (
    <div className="w-full space-y-1">
      <div className={ended || duration < 60 ? "text-error" : ""}>
        {ended ? "Ended" : now < start ? formatDuration(start - now, true) : formatDuration(duration, false)}
      </div>
      <div
        className={`w-full h-1 bg-base-300 rounded-full overflow-hidden transition-opacity ${now > start ? "opacity-100" : "opacity-0"}`}
      >
        <div className="h-full bg-error transition-all" style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  );
};
