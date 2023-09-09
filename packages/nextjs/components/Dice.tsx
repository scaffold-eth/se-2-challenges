import React from "react";

export const Dice = () => {
  return (
    <div className=" mx-10">
      <div className="card-body flex">
        <div className="h-80  bg-black opacity-70 rounded-md"></div>
        <div className="flex w-full justify-center mt-4">
          <span className="text-xl"> Roll a 0, 1, or 2 to win the prize! </span>
        </div>
      </div>
    </div>
  );
};
