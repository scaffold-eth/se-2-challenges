"use client";

import React from "react";
import Image from "next/image";
import CrownSvg from "../assets/race-assets/crown.svg";
import GreenCarSvg from "../assets/race-assets/green-car.svg";
import RedCarSvg from "../assets/race-assets/red-car.svg";

interface CarProps {
  position: number;
  lane: number;
  color: string;
  isWinner?: boolean;
}

const Car: React.FC<CarProps> = ({ position, lane, color, isWinner }) => {
  // Determine which SVG to use based on the color
  const carImage = color === "#2ecc71" ? GreenCarSvg : RedCarSvg;

  return (
    <div
      className="absolute transition-all duration-1000 ease-in-out"
      style={{
        left: isWinner ? "50%" : `${position}%`,
        top: isWinner ? "50%" : `${lane * 100 + 50}px`,
        transform: isWinner ? "translate(-50%, -50%)" : "translateY(-50%)",
        zIndex: 10,
      }}
    >
      {isWinner && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
          <div className="w-10 h-10 mb-2">
            <Image src={CrownSvg} alt="Crown" width={48} height={48} />
          </div>
        </div>
      )}
      <div className="w-32 h-10 relative">
        <Image
          src={carImage}
          alt={color === "#2ecc71" ? "Green Car" : "Red Car"}
          fill
          style={{ objectFit: "contain" }}
        />
      </div>
    </div>
  );
};

export default Car;
