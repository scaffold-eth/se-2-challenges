import { create } from "zustand";
import { persist } from "zustand/middleware";

type RaceState = {
  raceStarted: boolean;
  raceFinished: boolean;
  elapsedTime: number;
  cars: Array<{
    id: number;
    position: number;
    lane: number;
    color: string;
  }>;
  startTime: number | null;
  carSpeeds: { [key: number]: number };
  setRaceStarted: (started: boolean) => void;
  setRaceFinished: (finished: boolean) => void;
  setElapsedTime: (time: number) => void;
  setCars: (cars: Array<{ id: number; position: number; lane: number; color: string }>) => void;
  setStartTime: (time: number | null) => void;
  setCarSpeeds: (speeds: { [key: number]: number }) => void;
  resetRace: () => void;
};

export const useRaceStore = create<RaceState>()(
  persist(
    set => ({
      raceStarted: false,
      raceFinished: false,
      elapsedTime: 0,
      cars: [
        { id: 1, position: 0, lane: 0, color: "#2ecc71" },
        { id: 2, position: 0, lane: 1, color: "#e74c3c" },
      ],
      startTime: null,
      carSpeeds: {},
      setRaceStarted: started => set({ raceStarted: started }),
      setRaceFinished: finished => set({ raceFinished: finished }),
      setElapsedTime: time => set({ elapsedTime: time }),
      setCars: cars => set({ cars }),
      setStartTime: time => set({ startTime: time }),
      setCarSpeeds: speeds => set({ carSpeeds: speeds }),
      resetRace: () =>
        set({
          raceStarted: false,
          raceFinished: false,
          elapsedTime: 0,
          cars: [
            { id: 1, position: 0, lane: 0, color: "#2ecc71" },
            { id: 2, position: 0, lane: 1, color: "#e74c3c" },
          ],
          startTime: null,
        }),
    }),
    {
      name: "race-storage",
    },
  ),
);
