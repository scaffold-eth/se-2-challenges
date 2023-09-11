import React from "react";
import { Amount } from "./Amount";
import { Address } from "./scaffold-eth";
import { formatEther } from "viem";

export type Winner = {
  address: string;
  amount: bigint;
};

export type WinnerEventsProps = {
  winners: Winner[];
};

export const WinnerEvents = ({ winners }: WinnerEventsProps) => {
  return (
    <div className="mx-10">
      <div className="flex w-auto justify-center h-10">
        <p className="flex justify-center text-lg font-bold">Winner Events</p>
      </div>

      <table className="mt-4 p-2 bg-base-100 table table-zebra shadow-lg w-full overflow-hidden">
        <thead className="text-accent text-lg">
          <tr>
            <th className="bg-primary" colSpan={3}>
              Address
            </th>
            <th className="bg-primary" colSpan={2}>
              Won
            </th>
          </tr>
        </thead>
        <tbody>
          {winners.map(({ address, amount }, i) => (
            <tr key={i}>
              <td colSpan={3}>
                <Address address={address} size="lg" />
              </td>
              <td colSpan={2}>
                <Amount showUsdPrice={true} amount={Number(formatEther(amount))} className="text-lg" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
