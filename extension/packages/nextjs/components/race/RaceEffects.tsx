"use client";

import React from "react";

interface RaceEffectsProps {
  isRacing: boolean;
}

const RaceEffects: React.FC<RaceEffectsProps> = ({ isRacing }) => {
  if (!isRacing) return null;

  return (
    <>
      {/* Speed lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, index) => (
          <div
            key={index}
            className="absolute h-[1px] bg-gray-400 opacity-50"
            style={{
              top: `${Math.random() * 100}%`,
              left: 0,
              width: `${20 + Math.random() * 80}px`,
              animation: `speedLine ${0.5 + Math.random() * 1.5}s linear infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Dust particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 15 }).map((_, index) => (
          <div
            key={index}
            className="absolute rounded-full bg-gray-300 opacity-40"
            style={{
              top: `${50 + (Math.random() * 40 - 20)}%`,
              left: `${Math.random() * 100}%`,
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              animation: `dust ${1 + Math.random() * 3}s linear infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes speedLine {
          0% {
            transform: translateX(100vw);
          }
          100% {
            transform: translateX(-100px);
          }
        }

        @keyframes dust {
          0% {
            transform: translate(0, 0);
            opacity: 0.4;
          }
          50% {
            opacity: 0.7;
          }
          100% {
            transform: translate(-50px, 0);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
};

export default RaceEffects;
