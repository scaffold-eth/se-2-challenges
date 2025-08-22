"use client";

import { OOTableProps } from "../types";
import { AssertedRow } from "./AssertedRow";
import { EmptyRow } from "./EmptyRow";

export const AssertedTable = ({ assertions }: OOTableProps) => {
  return (
    <div className="bg-base-100 rounded-lg shadow-lg overflow-x-auto">
      <table className="w-full table-auto [&_th]:px-6 [&_th]:py-4 [&_td]:px-6 [&_td]:py-4">
        {/* Header */}
        <thead>
          <tr className="bg-base-300">
            <th className="text-left font-semibold w-5/12">Description</th>
            <th className="text-left font-semibold w-2/12">Bond</th>
            <th className="text-left font-semibold w-2/12">Reward</th>
            <th className="text-left font-semibold w-2/12">Time Left</th>
            <th className="text-left font-semibold w-1/12">{/* Icon column */}</th>
          </tr>
        </thead>

        <tbody>
          {assertions.length > 0 ? (
            assertions.map(assertion => (
              <AssertedRow key={assertion.assertionId} assertionId={assertion.assertionId} state={assertion.state} />
            ))
          ) : (
            <EmptyRow colspan={5} />
          )}
        </tbody>
      </table>
    </div>
  );
};
