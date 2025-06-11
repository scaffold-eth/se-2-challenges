import React, { useCallback, useEffect, useRef, useState } from "react";
import CollateralOperations from "./CollateralOperations";
import MintOperations from "./MintOperations";
import StakeOperations from "./StakeOperations";
import { ChartBarIcon, CurrencyDollarIcon, LockClosedIcon } from "@heroicons/react/24/outline";

type ButtonType = "collateral" | "mint" | "stake";

interface ButtonConfig {
  id: ButtonType;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}

const BUTTONS: ButtonConfig[] = [
  { id: "collateral", icon: ChartBarIcon, title: "Collateral" },
  { id: "mint", icon: CurrencyDollarIcon, title: "Mint" },
  { id: "stake", icon: LockClosedIcon, title: "Stake" },
];

const HOVER_DELAY = 200;

const SideButton: React.FC<{
  config: ButtonConfig;
  isHovered: boolean;
  onHover: (id: ButtonType) => void;
}> = React.memo(({ config, isHovered, onHover }) => {
  const Icon = config.icon;
  return (
    <button
      className={`btn btn-circle btn-primary transition-transform duration-300 hover:scale-110 ${isHovered ? "ring-2 ring-primary" : ""}`}
      onMouseEnter={() => onHover(config.id)}
    >
      <Icon className="h-6 w-6" />
    </button>
  );
});

SideButton.displayName = "SideButton";

const SideButtons: React.FC = () => {
  const [hoveredButton, setHoveredButton] = useState<ButtonType | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleButtonHover = useCallback((buttonId: ButtonType) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setHoveredButton(buttonId);
  }, []);

  const handleContainerLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setHoveredButton(null);
    }, HOVER_DELAY);
  }, []);

  const handleContainerEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const renderModalContent = useCallback(() => {
    if (!hoveredButton) return null;

    switch (hoveredButton) {
      case "collateral":
        return <CollateralOperations />;
      case "mint":
        return <MintOperations />;
      case "stake":
        return <StakeOperations />;
      default:
        return null;
    }
  }, [hoveredButton]);

  return (
    <div
      className="absolute top-[120px] right-0 bg-base-100 w-fit border-base-300 border shadow-md rounded-xl z-5"
      onMouseEnter={handleContainerEnter}
      onMouseLeave={handleContainerLeave}
    >
      <div className="relative">
        <div className="p-4 flex flex-col items-center gap-2">
          {BUTTONS.map(config => (
            <SideButton
              key={config.id}
              config={config}
              isHovered={hoveredButton === config.id}
              onHover={handleButtonHover}
            />
          ))}
        </div>

        {/* Invisible bridge to cover the gap */}
        {hoveredButton && (
          <div
            className="absolute top-1/2 -translate-y-1/2 right-full w-4 h-full pointer-events-auto"
            onMouseEnter={handleContainerEnter}
            onMouseLeave={handleContainerLeave}
          />
        )}

        {/* Hover Windows */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 right-full mr-4 transition-all duration-300 z-10 ease-in-out ${hoveredButton ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"}`}
          onMouseEnter={handleContainerEnter}
          onMouseLeave={handleContainerLeave}
        >
          {renderModalContent()}
        </div>
      </div>
    </div>
  );
};

export default React.memo(SideButtons);
