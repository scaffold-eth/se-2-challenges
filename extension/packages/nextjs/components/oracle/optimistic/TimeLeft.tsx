"use client";

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
  const [currentTime, setCurrentTime] = useState<number>(() =>
    timestamp ? Number(timestamp) : Math.floor(Date.now() / 1000),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const start = Number(startTime);
  const end = Number(endTime);
  const now = currentTime;
  const duration = end - now;
  const ended = duration <= 0;

  // Guard against division by zero and clamp to [0, 100]
  const totalWindow = Math.max(end - start, 1);
  const rawPercent = ((now - start) / totalWindow) * 100;
  const progressPercent = Math.max(0, Math.min(100, rawPercent));

  useEffect(() => {
    if (ended && timestamp) {
      refetchAssertionStates();
    }
  }, [ended, refetchAssertionStates, timestamp]);

  let displayText: string;
  if (ended) {
    displayText = "Ended";
  } else if (now < start) {
    displayText = formatDuration(start - now, true);
  } else {
    displayText = formatDuration(Math.max(duration, 0), false);
  }

  return (
    <div className="w-full space-y-1">
      <div className={ended || duration < 60 ? "text-error" : ""}>{displayText}</div>
      <div
        className={`w-full h-1 bg-base-300 rounded-full overflow-hidden transition-opacity ${now > start ? "opacity-100" : "opacity-0"}`}
      >
        <div className="h-full bg-error transition-all" style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  );
};
