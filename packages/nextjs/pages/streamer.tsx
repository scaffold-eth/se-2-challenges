import { useEffect, useRef, useState } from "react";
import humanizeDuration from "humanize-duration";
import { NextPage } from "next";
import { createTestClient, encodePacked, formatEther, http, keccak256, parseEther, toBytes, verifyMessage } from "viem";
import { hardhat } from "viem/chains";
import { Address as AddressType, useAccount, useWalletClient } from "wagmi";
import { MetaHeader } from "~~/components/MetaHeader";
import { Address } from "~~/components/scaffold-eth";
import { CashOutVoucherButton } from "~~/components/streamer/CashOutVoucherButton";
import {
  useAccountBalance,
  useDeployedContractInfo,
  useScaffoldContractRead,
  useScaffoldContractWrite,
  useScaffoldEventHistory,
  useScaffoldEventSubscriber,
} from "~~/hooks/scaffold-eth";

export type Voucher = { updatedBalance: bigint; signature: `0x${string}}` };

const STREAM_ETH_VALUE = "0.5";
const ETH_PER_CHARACTER = "0.01";

/**
 * sends the provided wisdom across the application channel
 * with user at `clientAddress`.
 * @param {string} clientAddress
 */

const Streamer: NextPage = () => {
  const { address: userAddress } = useAccount();
  const { data: userSigner } = useWalletClient();
  const { data: ownerAddress } = useScaffoldContractRead({
    contractName: "Streamer",
    functionName: "owner",
  });

  const { data: deployedContractData } = useDeployedContractInfo("Streamer");
  const { balance } = useAccountBalance(deployedContractData?.address);

  const { data: timeLeft } = useScaffoldContractRead({
    contractName: "Streamer",
    functionName: "timeLeft",
    args: [userAddress],
    watch: true,
  });

  const userIsOwner = !!ownerAddress && ownerAddress === userAddress;
  const [autoPay, setAutoPay] = useState(true);

  const [channels, setChannels] = useState<{ [key: AddressType]: BroadcastChannel }>({});

  const [opened, setOpened] = useState<AddressType[]>([]);

  const { data: openedHistoryData, isLoading: isOpenedHistoryLoading } = useScaffoldEventHistory({
    contractName: "Streamer",
    eventName: "Opened",
    fromBlock: 0n,
  });

  useEffect(() => {
    if (openedHistoryData?.length && !isOpenedHistoryLoading && !Object.keys(channels).length) {
      const openedChannelsAddresses = openedHistoryData?.map(event => event.args[0]).reverse();
      setOpened(openedChannelsAddresses);
      if (userIsOwner) {
        setChannels(
          openedChannelsAddresses.reduce((acc, curr) => {
            return { ...acc, [curr]: new BroadcastChannel(curr) };
          }, {}),
        );
      }
    }
  }, [openedHistoryData, isOpenedHistoryLoading, userIsOwner, channels]);

  useScaffoldEventSubscriber({
    contractName: "Streamer",
    eventName: "Opened",
    listener: logs => {
      logs.map(log => {
        const addr = log.args[0] as string;
        const bc = new BroadcastChannel(addr);

        setOpened(opened => {
          if (!opened.includes(addr)) {
            return [...opened, addr];
          }
          return opened;
        });

        setChannels(channels => {
          if (channels[addr]) {
            return channels;
          }
          return { ...channels, [addr]: bc };
        });
      });
    },
  });

  if (userIsOwner) {
    Object.keys(channels)?.forEach(clientAddress => {
      channels[clientAddress].onmessage = recieveVoucher(clientAddress);
    });
  }

  /**
   * wraps a voucher processing function for each client.
   */
  function recieveVoucher(clientAddress: string) {
    /**
     * Handle incoming payments from the given client.
     */
    async function processVoucher({ data }: { data: Pick<Voucher, "signature"> & { updatedBalance: string } }) {
      // recreate a bigint object from the message. v.data.updatedBalance is
      // a string representation of the bigint for transit over the network
      if (!data.updatedBalance) {
        return;
      }
      const updatedBalance = BigInt(`0x${data.updatedBalance}`);

      /*
       *  Checkpoint 3:
       *
       *  currently, this function recieves and stores vouchers uncritically.
       *
       *  recreate the packed, hashed, and arrayified message from reimburseService (above),
       *  and then use verifyMessage() to confirm that voucher signer was
       *  `clientAddress`. (If it wasn't, log some error message and return).
       */
      const existingVoucher = vouchers[clientAddress];

      // update our stored voucher if this new one is more valuable
      if (existingVoucher === undefined || updatedBalance < existingVoucher.updatedBalance) {
        setVouchers(vouchers => ({ ...vouchers, [clientAddress]: { ...data, updatedBalance } }));
      }
    }

    return processVoucher;
  }

  const [challenged, setChallenged] = useState<AddressType[]>([]);

  const { data: challengedHistoryData, isLoading: isChallengedHistoryLoading } = useScaffoldEventHistory({
    contractName: "Streamer",
    eventName: "Challenged",
    fromBlock: 0n,
  });

  useEffect(() => {
    if (challengedHistoryData?.length && !isChallengedHistoryLoading) {
      const challengedChannelsAddresses = challengedHistoryData?.map(event => event.args[0]);
      setChallenged(challengedChannelsAddresses);
    }
  }, [challengedHistoryData, isChallengedHistoryLoading]);

  useScaffoldEventSubscriber({
    contractName: "Streamer",
    eventName: "Challenged",
    listener: logs => {
      logs.map(log => {
        setChallenged(challenged => [...challenged, log.args[0] as string]);
      });
    },
  });

  const [closed, setClosed] = useState<AddressType[]>([]);

  const { data: closedHistoryData, isLoading: isClosedHistoryLoading } = useScaffoldEventHistory({
    contractName: "Streamer",
    eventName: "Closed",
    fromBlock: 0n,
  });

  useEffect(() => {
    if (closedHistoryData?.length && !isClosedHistoryLoading) {
      const closedChannelsAddresses = closedHistoryData?.map(event => event.args[0]);
      setClosed(closedChannelsAddresses);
    }
  }, [closedHistoryData, isClosedHistoryLoading]);

  useScaffoldEventSubscriber({
    contractName: "Streamer",
    eventName: "Closed",
    listener: logs => {
      logs.map(log => {
        setClosed(closed => [...closed, log.args[0] as string]);
      });
    },
  });

  const [wisdoms, setWisdoms] = useState<{ [key: AddressType]: string }>({});

  const userChannel = useRef<BroadcastChannel>();

  useEffect(() => {
    if (userAddress) {
      userChannel.current = new BroadcastChannel(userAddress);
    }
  }, [userAddress]);

  const provideService = (client: AddressType, wisdom: string) => {
    setWisdoms({ ...wisdoms, [client]: wisdom });
    channels[client]?.postMessage(wisdom);
  };

  const [vouchers, setVouchers] = useState<{ [key: AddressType]: Voucher }>({});

  const { writeAsync: fundChannel } = useScaffoldContractWrite({
    contractName: "Streamer",
    functionName: "fundChannel",
    value: STREAM_ETH_VALUE,
  });

  // Checkpoint 5
  // const { writeAsync: challengeChannel } = useScaffoldContractWrite({
  //   contractName: "Streamer",
  //   functionName: "challengeChannel",
  // });

  // const { writeAsync: defundChannel } = useScaffoldContractWrite({
  //   contractName: "Streamer",
  //   functionName: "defundChannel",
  // });

  const [recievedWisdom, setReceivedWisdom] = useState("");

  /**
   * reimburseService prepares, signs, and delivers a voucher that pays for the recieved wisdom
   * to the service provider
   */
  async function reimburseService(wisdom: string) {
    const initialBalance = parseEther(STREAM_ETH_VALUE);
    const costPerCharacter = parseEther(ETH_PER_CHARACTER);
    const duePayment = costPerCharacter * BigInt(wisdom.length);

    let updatedBalance = initialBalance - duePayment;

    if (updatedBalance < 0n) {
      updatedBalance = 0n;
    }

    const packed = encodePacked(["uint256"], [updatedBalance]);
    const hashed = keccak256(packed);
    const arrayified = toBytes(hashed);

    // Why not just sign the updatedBalance string directly?
    //
    // Two considerations:
    // 1) This signature is going to verified both off-chain (by the service provider)
    //    and on-chain (by the Streamer contract). These are distinct runtime environments, so
    //    care needs to be taken that signatures are applied to specific data encodings.
    //
    //    the toBytes call below encodes this data in an EVM compatible way
    //
    //    see: https://blog.ricmoo.com/verifying-messages-in-solidity-50a94f82b2ca for some
    //         more on EVM verification of messages signed off-chain
    // 2) Because of (1), it's useful to apply signatures to the hash of any given message
    //    rather than to arbitrary messages themselves. This way the encoding strategy for
    //    the fixed-length hash can be reused for any message format.

    // TODO: sometimes userSigner is undefinded here, it causes a bug that last sybols doesn't count
    const signature = await userSigner?.signMessage({ message: { raw: arrayified } });

    const hexBalance = updatedBalance.toString(16);

    if (hexBalance && signature) {
      userChannel.current?.postMessage({
        updatedBalance: hexBalance,
        signature,
      });
    }
  }

  if (userChannel.current) {
    /**
     * Handle incoming service data from the service provider.
     *
     * If autoPay is turned on, instantly recalculate due payment
     * and return to the service provider.
     *
     * @param {MessageEvent<string>} e
     */
    userChannel.current.onmessage = e => {
      if (typeof e.data != "string") {
        console.warn(`recieved unexpected channel data: ${JSON.stringify(e.data)}`);
        return;
      }

      setReceivedWisdom(e.data);

      if (autoPay) {
        reimburseService(e.data);
      }
    };
  }

  const writableChannels = opened.filter(addr => !closed.includes(addr));

  return (
    <>
      <MetaHeader />
      <div className="flex items-center flex-col flex-grow w-full px-4">
        <div className="flex flex-col items-center bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 mt-24 w-full max-w-lg">
          {userIsOwner ? (
            // UI for the service provider
            <>
              <p className="block text-2xl mt-0 mb-2 font-semibold">Hello Guru!</p>
              <p className="block text-xl mt-0 mb-1 font-semibold">
                You have {writableChannels.length} channel{writableChannels.length == 1 ? "" : "s"} open
              </p>
              <p className="mt-0 text-lg text-center font-semibold">Total ETH locked: {balance?.toFixed(4) || 0} ETH</p>

              <div className="mt-4 text-lg">
                Channels with <button className="btn btn-sm btn-error">RED</button> withdrawal buttons are under
                challenge on-chain, and should be redeemed ASAP.
              </div>
              <div className="mt-4 w-full flex flex-col">
                {writableChannels.map(clientAddress => (
                  <div key={clientAddress} className="w-full flex flex-col border-primary border-t py-6">
                    <Address address={clientAddress} size="xl" />
                    <textarea
                      className="mt-3 bg-base-200"
                      rows={3}
                      placeholder="Provide your wisdom here..."
                      onChange={e => {
                        e.stopPropagation();
                        const updatedWisdom = e.target.value;
                        provideService(clientAddress, updatedWisdom);
                      }}
                      value={wisdoms[clientAddress]}
                    />

                    <div className="mt-2 flex justify-between">
                      <div>
                        Served: <strong>{wisdoms[clientAddress]?.length || 0}</strong>&nbsp;chars
                      </div>
                      <div>
                        Recieved:{" "}
                        <strong id={`claimable-${clientAddress}`}>
                          {vouchers[clientAddress]
                            ? formatEther(parseEther(STREAM_ETH_VALUE) - vouchers[clientAddress].updatedBalance)
                            : 0}
                        </strong>
                        &nbsp;ETH
                      </div>
                    </div>

                    {/* Checkpoint 4: */}
                    {/* <CashOutVoucherButton
                      key={clientAddress}
                      clientAddress={clientAddress}
                      challenged={challenged}
                      closed={closed}
                      voucher={vouchers[clientAddress]}
                    /> */}
                  </div>
                ))}
              </div>
            </>
          ) : (
            // UI for the service consumer
            <>
              <p className="block text-2xl mt-0 mb-2 font-semibold">Hello Rube!</p>

              {userAddress && writableChannels.includes(userAddress) ? (
                <div className="w-full flex flex-col items-center">
                  <span className="mt-6 text-lg font-semibold">Autopay</span>
                  <div className="flex items-center mt-2 gap-2">
                    <span>Off</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-secondary bg-secondary"
                      defaultChecked={autoPay}
                      onChange={e => {
                        const updatedAutoPay = e.target.checked;
                        setAutoPay(updatedAutoPay);

                        if (updatedAutoPay) {
                          reimburseService(recievedWisdom);
                        }
                      }}
                    />
                    <span>On</span>
                  </div>

                  <div className="text-center w-full mt-4">
                    <p className="text-xl font-semibold">Received Wisdom</p>
                    <p className="mb-3 text-lg min-h-[1.75rem] border-2 border-primary rounded">{recievedWisdom}</p>
                  </div>

                  {/* Checkpoint 5: challenge & closure */}
                  {/* <div className="flex flex-col items-center pb-6">
                    <button
                      disabled={challenged.includes(userAddress)}
                      className="btn btn-primary"
                      onClick={() => {
                        // disable the production of further voucher signatures
                        setAutoPay(false);
                        challengeChannel();
                        try {
                          // ensure a 'ticking clock' for the UI without having
                          // to send new transactions & mine new blocks
                          createTestClient({
                            chain: hardhat,
                            mode: "hardhat",
                            transport: http(),
                          })?.setIntervalMining({
                            interval: 5,
                          });
                        } catch (e) {}
                      }}
                    >
                      Challenge this channel
                    </button>

                    <div className="p-2 mt-6 h-10">
                      {challenged.includes(userAddress) && !!timeLeft && (
                        <>
                          <span>Time left:</span> {humanizeDuration(Number(timeLeft) * 1000)}
                        </>
                      )}
                    </div>
                    <button
                      className="btn btn-primary"
                      disabled={!challenged.includes(userAddress) || !!timeLeft}
                      onClick={() => defundChannel()}
                    >
                      Close and withdraw funds
                    </button>
                  </div> */}
                </div>
              ) : userAddress && closed.includes(userAddress) ? (
                <div className="text-lg">
                  <p>Thanks for stopping by - we hope you have enjoyed the guru&apos;s advice.</p>
                  <p className="mt-8">
                    This UI obstructs you from opening a second channel. Why? Is it safe to open another channel?
                  </p>
                </div>
              ) : (
                <div className="p-2">
                  <button className="btn btn-primary" onClick={() => fundChannel()}>
                    Open a 0.5 ETH channel for advice from the Guru
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Streamer;
