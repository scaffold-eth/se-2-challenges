import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const TabButton = ({
  children,
  tabIndex,
  currentIndex,
  onClick,
}: {
  children: React.ReactNode;
  tabIndex: number;
  currentIndex: number;
  onClick: (index: number) => void;
}) => {
  return (
    <button
      onClick={() => onClick(tabIndex)}
      className={` ${
        tabIndex == currentIndex ? " bg-base-100" : "bg-base-300"
      } btn btn-secondary btn-xl normal-case font-xl text-lg`}
    >
      {children}
    </button>
  );
};

/**
 * Site header
 */
export const Tab = ({ onTabChange, currentIndex }: { onTabChange: (index: number) => void; currentIndex: number }) => {
  const tabs = (
    <>
      <div className="flex justify-between w-full">
        <TabButton tabIndex={0} currentIndex={currentIndex} onClick={onTabChange}>
          Basic Roll
        </TabButton>
        <TabButton tabIndex={1} currentIndex={currentIndex} onClick={onTabChange}>
          Rigged Roll
        </TabButton>
      </div>
      <div className="divide-y-8 bg-base-300 h-1 my-5 " />
    </>
  );

  return <div>{tabs}</div>;
};
