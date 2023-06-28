import { useCallback, useState } from "react";
import { useGlobalState } from "~~/services/store/store";
import { getTargetNetwork } from "~~/utils/scaffold-eth";

type TBalanceProps = {
  value?: string;
  className?: string;
};

/**
 * Display (ETH & USD) value for the input value provided.
 */
export const ETHToPrice = ({ value, className = "" }: TBalanceProps) => {
  const [isEthBalance, setIsEthBalance] = useState(true);
  const configuredNetwork = getTargetNetwork();
  const price = useGlobalState(state => state.nativeCurrencyPrice);

  const onToggleBalance = useCallback(() => {
    if (price > 0) {
      setIsEthBalance(!isEthBalance);
    }
  }, [isEthBalance, price]);

  if (!value) {
    return (
      <div className="animate-pulse flex space-x-4">
        <div className="flex items-center space-y-6">
          <div className="h-5 w-12 bg-slate-300 rounded"></div>
        </div>
      </div>
    );
  }
  return (
    <button
      className={`btn btn-sm btn-ghost flex flex-col font-normal items-center hover:bg-transparent ${className}`}
      onClick={onToggleBalance}
    >
      <div className="w-full flex items-center justify-center">
        {isEthBalance ? (
          <>
            <span>{parseFloat(value).toFixed(4)}</span>
            <span className="text-xs font-bold ml-1">{configuredNetwork.nativeCurrency.symbol}</span>
          </>
        ) : (
          <>
            <span className="text-xs font-bold mr-1">$</span>
            <span>{(parseFloat(value) * price).toFixed(2)}</span>
          </>
        )}
      </div>
    </button>
  );
};
