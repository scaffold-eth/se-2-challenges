import React from "react";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";

interface TooltipInfoProps {
  top: number;
  right: number;
  infoText: string;
}

// Note: The indicator should be added to the outer component where this component is used.
const TooltipInfo: React.FC<TooltipInfoProps> = ({ top, right, infoText }) => {
  return (
    <span className={`top-${top} right-${right} indicator-item flex justify-center`}>
      <div className="tooltip tooltip-secondary tooltip-left" data-tip={infoText}>
        <QuestionMarkCircleIcon className="h-5 w-5" />
      </div>
    </span>
  );
};

export default TooltipInfo;
