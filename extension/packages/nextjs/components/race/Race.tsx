"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import BackgroundImageDark from "../assets/race-assets/background-dark.svg";
import BackgroundImage from "../assets/race-assets/background.svg";
import Car from "./Car";
import RaceEffects from "./RaceEffects";
import { useTheme } from "next-themes";
import { useRaceStore } from "~~/services/store/raceStore";

const RaceTrack: React.FC = () => {
  const { resolvedTheme } = useTheme();

  // Race configuration
  const RACE_DURATION = 30; // Duration in seconds

  const {
    raceStarted,
    raceFinished,
    elapsedTime,
    cars,
    startTime,
    carSpeeds,
    setRaceStarted,
    setRaceFinished,
    setElapsedTime,
    setCars,
    setStartTime,
    setCarSpeeds,
    resetRace,
  } = useRaceStore();

  const raceInterval = useRef<NodeJS.Timeout | null>(null);

  // Start the race with a fixed duration
  const startRace = () => {
    if (raceStarted || raceFinished) {
      resetRace();

      // Wait 1 second before starting a new race
      setTimeout(() => {
        const newStartTime = Date.now();
        setStartTime(newStartTime);
        setCarSpeeds({
          0: 2.5 + Math.random() * 1,
          1: 2.5 + Math.random() * 1,
        });
        setRaceStarted(true);

        // Clear any existing interval
        if (raceInterval.current) {
          clearInterval(raceInterval.current);
        }

        // Start new interval
        raceInterval.current = setInterval(() => {
          const currentTime = (Date.now() - newStartTime) / 1000; // seconds elapsed

          if (currentTime >= RACE_DURATION) {
            // At race end, set final positions
            setElapsedTime(RACE_DURATION);
            setCars([
              { id: 1, position: carSpeeds[0] * RACE_DURATION, lane: 0, color: "#2ecc71" },
              { id: 2, position: carSpeeds[1] * RACE_DURATION, lane: 1, color: "#e74c3c" },
            ]);
            setRaceFinished(true);
            if (raceInterval.current) clearInterval(raceInterval.current);
          } else {
            setElapsedTime(currentTime);
            // Update positions based on random speeds
            setCars([
              { id: 1, position: carSpeeds[0] * currentTime, lane: 0, color: "#2ecc71" },
              { id: 2, position: carSpeeds[1] * currentTime, lane: 1, color: "#e74c3c" },
            ]);
          }
        }, 100); // update every 100ms
      }, 1000); // 1 second delay before starting the new race

      return;
    }

    setCarSpeeds({
      0: 2.5 + Math.random() * 1,
      1: 2.5 + Math.random() * 1,
    });
    const newStartTime = Date.now();
    setStartTime(newStartTime);
    setRaceStarted(true);

    // Clear any existing interval
    if (raceInterval.current) {
      clearInterval(raceInterval.current);
    }

    // Start new interval
    raceInterval.current = setInterval(() => {
      const currentTime = (Date.now() - newStartTime) / 1000; // seconds elapsed

      if (currentTime >= RACE_DURATION) {
        // At race end, set final positions
        setElapsedTime(RACE_DURATION);
        setCars([
          { id: 1, position: carSpeeds[0] * RACE_DURATION, lane: 0, color: "#2ecc71" },
          { id: 2, position: carSpeeds[1] * RACE_DURATION, lane: 1, color: "#e74c3c" },
        ]);
        setRaceFinished(true);
        if (raceInterval.current) clearInterval(raceInterval.current);
      } else {
        setElapsedTime(currentTime);
        // Update positions based on random speeds
        setCars([
          { id: 1, position: carSpeeds[0] * currentTime, lane: 0, color: "#2ecc71" },
          { id: 2, position: carSpeeds[1] * currentTime, lane: 1, color: "#e74c3c" },
        ]);
      }
    }, 100); // update every 100ms
  };

  // Format elapsed time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle visibility change and race state
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden, clear the interval
        if (raceInterval.current) {
          clearInterval(raceInterval.current);
        }
      } else if (raceStarted && !raceFinished && startTime) {
        // Tab is visible and race is in progress, restart the interval
        const currentTime = (Date.now() - startTime) / 1000;
        if (currentTime < RACE_DURATION) {
          // Clear any existing interval
          if (raceInterval.current) {
            clearInterval(raceInterval.current);
          }

          // Start new interval
          raceInterval.current = setInterval(() => {
            const updatedTime = (Date.now() - startTime) / 1000;
            if (updatedTime >= RACE_DURATION) {
              setElapsedTime(RACE_DURATION);
              setCars([
                { id: 1, position: carSpeeds[0] * RACE_DURATION, lane: 0, color: "#2ecc71" },
                { id: 2, position: carSpeeds[1] * RACE_DURATION, lane: 1, color: "#e74c3c" },
              ]);
              setRaceFinished(true);
              if (raceInterval.current) clearInterval(raceInterval.current);
            } else {
              setElapsedTime(updatedTime);
              const redPosition = carSpeeds[0] * updatedTime;
              const bluePosition = carSpeeds[1] * updatedTime;
              setCars([
                { id: 1, position: redPosition, lane: 0, color: "#2ecc71" },
                { id: 2, position: bluePosition, lane: 1, color: "#e74c3c" },
              ]);
            }
          }, 100);
        } else {
          // Race has finished while tab was hidden
          setElapsedTime(RACE_DURATION);
          setCars([
            { id: 1, position: carSpeeds[0] * RACE_DURATION, lane: 0, color: "#2ecc71" },
            { id: 2, position: carSpeeds[1] * RACE_DURATION, lane: 1, color: "#e74c3c" },
          ]);
          setRaceFinished(true);
        }
      }
    };

    // Initial setup if race is already started
    if (raceStarted && !raceFinished && startTime) {
      const currentTime = (Date.now() - startTime) / 1000;
      if (currentTime < RACE_DURATION) {
        if (raceInterval.current) {
          clearInterval(raceInterval.current);
        }
        raceInterval.current = setInterval(() => {
          const updatedTime = (Date.now() - startTime) / 1000;
          if (updatedTime >= RACE_DURATION) {
            setElapsedTime(RACE_DURATION);
            setCars([
              { id: 1, position: carSpeeds[0] * RACE_DURATION, lane: 0, color: "#2ecc71" },
              { id: 2, position: carSpeeds[1] * RACE_DURATION, lane: 1, color: "#e74c3c" },
            ]);
            setRaceFinished(true);
            if (raceInterval.current) clearInterval(raceInterval.current);
          } else {
            setElapsedTime(updatedTime);
            const redPosition = carSpeeds[0] * updatedTime;
            const bluePosition = carSpeeds[1] * updatedTime;
            setCars([
              { id: 1, position: redPosition, lane: 0, color: "#2ecc71" },
              { id: 2, position: bluePosition, lane: 1, color: "#e74c3c" },
            ]);
          }
        }, 100);
      } else {
        setElapsedTime(RACE_DURATION);
        setCars([
          { id: 1, position: carSpeeds[0] * RACE_DURATION, lane: 0, color: "#2ecc71" },
          { id: 2, position: carSpeeds[1] * RACE_DURATION, lane: 1, color: "#e74c3c" },
        ]);
        setRaceFinished(true);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (raceInterval.current) clearInterval(raceInterval.current);
    };
  }, [raceStarted, raceFinished, startTime, RACE_DURATION, setElapsedTime, setCars, setRaceFinished, carSpeeds]);

  return (
    <div className="mt-6 w-full mx-auto">
      <div className="card bg-base-100 w-full shadow-xl indicator">
        <div className="card-body">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="card-title">
              {raceFinished ? (
                <span className="flex items-center gap-2">
                  Winner:{" "}
                  <span style={{ color: cars[0].position > cars[1].position ? "#2ecc71" : "#e74c3c" }}>
                    {cars[0].position > cars[1].position ? "Green" : "Red"} Car
                  </span>{" "}
                  🏆
                </span>
              ) : (
                `Race Time: ${formatTime(elapsedTime)}`
              )}
            </h2>
            <div className="space-x-4 flex items-center">
              <button onClick={startRace} className="btn btn-primary text-lg">
                {raceFinished ? "Race Again" : raceStarted ? "Restart Race" : "Start Race"}
              </button>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden">
            <Image
              src={resolvedTheme === "dark" ? BackgroundImageDark : BackgroundImage}
              alt="Mountain Background"
              width={1000}
              height={1000}
              className="w-full h-auto"
              suppressHydrationWarning
            />
            <div className="relative w-full h-[200px] bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <RaceEffects isRacing={raceStarted && !raceFinished} />

              <div className="absolute top-0 bottom-0 w-4 bg-black" style={{ left: "90%", zIndex: 5 }}>
                <div className="h-full w-full grid grid-cols-2 grid-rows-4">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-full h-full ${(Math.floor(i / 2) + i) % 2 === 0 ? "bg-black" : "bg-white"}`}
                    />
                  ))}
                </div>
              </div>

              <div
                className="absolute left-0 right-[50px] h-[3px]"
                style={{
                  top: "50%",
                  background:
                    "repeating-linear-gradient(90deg, transparent 0px, transparent 50px, white 50px, white 100px)",
                }}
              ></div>

              {cars.map(car => (
                <Car
                  key={car.id}
                  position={car.position}
                  lane={car.lane}
                  color={car.color}
                  isWinner={raceFinished && car.position === Math.max(...cars.map(c => c.position))}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RaceTrack;
