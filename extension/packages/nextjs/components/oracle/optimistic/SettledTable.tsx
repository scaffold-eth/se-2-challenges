"use client";

import { OOTableProps } from "../types";
import { EmptyRow } from "./EmptyRow";
import { SettledRow } from "./SettledRow";

export const SettledTable = ({ assertions }: OOTableProps) => {
  return (
    <div className="bg-base-100 rounded-lg shadow-lg overflow-x-auto">
      <table className="w-full table-auto [&_th]:px-6 [&_th]:py-4 [&_td]:px-6 [&_td]:py-4">
        {/* Header */}
        <thead>
          <tr className="bg-base-300">
            <th className="text-left font-semibold w-4/12">Description</th>
            <th className="text-left font-semibold w-1/12">Result</th>
            <th className="text-left font-semibold w-3/12">Winner</th>
            <th className="text-left font-semibold w-2/12">Reward</th>
            <th className="text-left font-semibold w-2/12">Claim</th>
          </tr>
        </thead>

        <tbody>
          {assertions.length > 0 ? (
            assertions.map(assertion => <SettledRow key={assertion.assertionId} assertionId={assertion.assertionId} />)
          ) : (
            <EmptyRow colspan={5} />
          )}
        </tbody>
      </table>
    </div>
  );
};
