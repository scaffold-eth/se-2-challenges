"use client";

import { OOTableProps } from "../types";
import { DisputedRow } from "./DisputedRow";
import { EmptyRow } from "./EmptyRow";

export const DisputedTable = ({ assertions }: OOTableProps) => {
  return (
    <div className="bg-base-100 rounded-lg shadow-lg overflow-x-auto">
      <table className="w-full table-auto [&_th]:px-6 [&_th]:py-4 [&_td]:px-6 [&_td]:py-4">
        {/* Header */}
        <thead>
          <tr className="bg-base-300">
            <th className="text-left font-semibold w-5/12">Description</th>
            <th className="text-left font-semibold w-3/12">Proposer</th>
            <th className="text-left font-semibold w-3/12">Disputer</th>
            <th className="text-left font-semibold w-1/12">{/* Icon column */}</th>
          </tr>
        </thead>

        <tbody>
          {assertions.length > 0 ? (
            assertions.map(assertion => (
              <DisputedRow key={assertion.assertionId} assertionId={assertion.assertionId} state={assertion.state} />
            ))
          ) : (
            <EmptyRow colspan={4} />
          )}
        </tbody>
      </table>
    </div>
  );
};
