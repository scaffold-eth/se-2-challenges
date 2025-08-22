"use client";

import { OOTableProps } from "../types";
import { EmptyRow } from "./EmptyRow";
import { ExpiredRow } from "./ExpiredRow";

export const ExpiredTable = ({ assertions }: OOTableProps) => {
  return (
    <div className="bg-base-100 rounded-lg shadow-lg overflow-x-auto">
      <table className="w-full table-auto [&_th]:px-6 [&_th]:py-4 [&_td]:px-6 [&_td]:py-4">
        {/* Header */}
        <thead>
          <tr className="bg-base-300">
            <th className="text-left font-semibold w-5/12">Description</th>
            <th className="text-left font-semibold w-3/12">Asserter</th>
            <th className="text-left font-semibold w-2/12">Reward</th>
            <th className="text-left font-semibold w-2/12">Claim Refund</th>
          </tr>
        </thead>

        <tbody>
          {assertions.length > 0 ? (
            assertions.map(assertion => <ExpiredRow key={assertion.assertionId} assertionId={assertion.assertionId} />)
          ) : (
            <EmptyRow colspan={4} />
          )}
        </tbody>
      </table>
    </div>
  );
};
