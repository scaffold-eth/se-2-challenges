import { utils } from "ethers";
import type { NextPage } from "next";
import { MetaHeader } from "~~/components/MetaHeader";
import { Spinner } from "~~/components/Spinner";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

const Events: NextPage = () => {
  // BuyTokens Events
  const { data: buyTokenEvents, isLoading: isBuyEventsLoading } = useScaffoldEventHistory({
    contractName: "Vendor",
    eventName: "BuyTokens",
    fromBlock: 0n,
  });

  // SellTokens Events
  const { data: sellTokenEvents, isLoading: isSellEventsLoading } = useScaffoldEventHistory({
    contractName: "Vendor",
    eventName: "SellTokens",
    fromBlock: 0n,
  });

  return (
    <>
      <MetaHeader />
      <div className="flex items-center flex-col flex-grow pt-10">
        {/* BuyTokens Events */}
        <div>
          <div className="text-center mb-4">
            <span className="block text-2xl font-bold">Buy Token Events</span>
          </div>
          {isBuyEventsLoading ? (
            <div className="flex justify-center items-center mt-8">
              <Spinner width="65" height="65" />
            </div>
          ) : (
            <div className="overflow-x-auto shadow-lg">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th className="bg-primary">Buyer</th>
                    <th className="bg-primary">Amount of ETH</th>
                    <th className="bg-primary">Amount of Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {!buyTokenEvents || buyTokenEvents.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center">
                        No events found
                      </td>
                    </tr>
                  ) : (
                    buyTokenEvents?.map((event, index) => {
                      return (
                        <tr key={index}>
                          <td className="text-center">
                            <Address address={event.args.buyer} />
                          </td>
                          <td>{utils.formatEther(event.args.amountOfETH).toString()}</td>
                          <td>{utils.formatEther(event.args.amountOfTokens).toString()}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SellTokens Events */}
        <div className="mt-14">
          <div className="text-center mb-4">
            <span className="block text-2xl font-bold">Sell Token Events</span>
          </div>
          {isSellEventsLoading ? (
            <div className="flex justify-center items-center mt-8">
              <Spinner width="65" height="65" />
            </div>
          ) : (
            <div className="overflow-x-auto shadow-lg">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th className="bg-primary">Seller</th>
                    <th className="bg-primary">Amount of Tokens</th>
                    <th className="bg-primary">Amount of ETH</th>
                  </tr>
                </thead>
                <tbody>
                  {!sellTokenEvents || sellTokenEvents.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center">
                        No events found
                      </td>
                    </tr>
                  ) : (
                    sellTokenEvents?.map((event, index) => {
                      return (
                        <tr key={index}>
                          <td className="text-center">
                            <Address address={event.args.seller} />
                          </td>
                          <td>{utils.formatEther(event.args.amountOfTokens).toString()}</td>
                          <td>{utils.formatEther(event.args.amountOfETH).toString()}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Events;
