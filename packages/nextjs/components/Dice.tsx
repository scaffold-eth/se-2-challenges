import React, { useCallback, useRef, useState } from "react";

export const Dice = ({ onRoll }: { onRoll: () => void }) => {
  return (
    <div className=" mx-10">
      <div className="card-body flex">
        <div className="h-80  bg-black opacity-70 rounded-md"></div>
        <div className="flex w-full justify-center mt-4">
          <span className="text-xl"> Roll a 0, 1, or 2 to win the prize! </span>
        </div>
        <button onClick={onRoll} className="btn btn-secondary btn-xl normal-case font-xl text-lg">
          Roll the dice
        </button>
        <div className="mt-6 flex w-full justify-center ">
          <span className="text-xl"> This button allow a rigged roll </span>
        </div>
        <button onClick={onRoll} className="btn btn-secondary btn-xl normal-case font-xl text-lg">
          Rigged Roll
        </button>
      </div>
    </div>
  );
};
