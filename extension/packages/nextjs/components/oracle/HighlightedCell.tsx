import { useEffect, useRef, useState } from "react";

export const HighlightedCell = ({
  value,
  highlightColor,
  children,
  className,
  handleClick,
}: {
  value: string | number;
  highlightColor: string;
  children: React.ReactNode;
  className?: string;
  handleClick?: () => void;
}) => {
  const [isHighlighted, setIsHighlighted] = useState(false);
  const prevValue = useRef<string | number | undefined>(undefined);

  useEffect(() => {
    if (value === undefined) return;
    if (value === "Not reported") return;
    if (value === "Loading...") return;
    const hasPrev = typeof prevValue.current === "number" || typeof prevValue.current === "string";

    if (hasPrev && value !== prevValue.current) {
      setIsHighlighted(true);
      const timer = setTimeout(() => setIsHighlighted(false), 1000);
      return () => clearTimeout(timer);
    }
    prevValue.current = value;
  }, [value]);

  return (
    <td
      className={`transition-colors duration-300 ${isHighlighted ? highlightColor : ""} ${className}`}
      onClick={handleClick}
    >
      {children}
    </td>
  );
};
