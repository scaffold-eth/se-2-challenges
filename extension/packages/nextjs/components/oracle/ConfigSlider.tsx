import { useEffect, useState } from "react";

interface ConfigSliderProps {
  nodeAddress: string;
  endpoint: string;
  label: string;
}

export const ConfigSlider = ({ nodeAddress, endpoint, label }: ConfigSliderProps) => {
  const [value, setValue] = useState<number>(0.0);
  const [isLoading, setIsLoading] = useState(false);
  const [localValue, setLocalValue] = useState<number>(0.0);

  // Fetch initial value
  useEffect(() => {
    const fetchValue = async () => {
      try {
        const response = await fetch(`/api/config/${endpoint}?nodeAddress=${nodeAddress}`);
        const data = await response.json();
        if (data.value !== undefined) {
          setValue(data.value);
          setLocalValue(data.value);
        }
      } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
      }
    };
    fetchValue();
  }, [nodeAddress, endpoint]);

  const handleChange = (newValue: number) => {
    setLocalValue(newValue);
  };

  const handleFinalChange = async () => {
    if (localValue === value) return; // Don't send request if value hasn't changed

    setIsLoading(true);
    try {
      const response = await fetch(`/api/config/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: localValue, nodeAddress }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to update ${endpoint}`);
      }
      setValue(localValue); // Update the committed value after successful API call
    } catch (error) {
      console.error(`Error updating ${endpoint}:`, error);
      setLocalValue(value); // Reset to last known good value on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <td className="relative">
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={localValue}
        onChange={e => handleChange(parseFloat(e.target.value))}
        onMouseUp={handleFinalChange}
        onTouchEnd={handleFinalChange}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
      />
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
        {(localValue * 100).toFixed(0)}% {label}
      </div>
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        </div>
      )}
    </td>
  );
};
