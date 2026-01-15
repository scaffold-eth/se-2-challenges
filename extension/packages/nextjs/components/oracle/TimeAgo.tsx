"use client";

import { useEffect, useState } from "react";
import { useChallengeState } from "~~/services/store/challengeStore";

type TimeAgoProps = {
  timestamp?: bigint;
  staleWindow?: bigint;
  className?: string;
};

const formatTimeAgo = (tsSec: number | undefined, nowSec: number): string => {
  if (tsSec === undefined) return "—";
  if (tsSec === 0) return "never";
  // Clamp to avoid negative display in rare race conditions
  const diffSec = Math.max(0, nowSec - tsSec);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
};

export const TimeAgo = ({ timestamp, staleWindow, className = "" }: TimeAgoProps) => {
  const { timestamp: networkTimestamp } = useChallengeState();
  const [currentTime, setCurrentTime] = useState<number>(() =>
    networkTimestamp ? Number(networkTimestamp) : Math.floor(Date.now() / 1000),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const tsSec = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  const displayNow = currentTime;
  const text = formatTimeAgo(tsSec, displayNow);

  // Determine staleness coloring
  let colorClass = "";
  if (tsSec === undefined) {
    colorClass = "";
  } else if (tsSec === 0) {
    colorClass = "text-error";
  } else if (typeof staleWindow === "bigint") {
    const isStale = tsSec === undefined ? false : displayNow - tsSec > Number(staleWindow);
    colorClass = isStale ? "text-error" : "text-success";
  }

  return <span className={`whitespace-nowrap ${colorClass} ${className}`}>{text}</span>;
};

export default TimeAgo;
