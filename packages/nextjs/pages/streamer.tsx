import { useMemo, useState } from "react";
import { BigNumber, utils } from "ethers";
import humanizeDuration from "humanize-duration";
import { NextPage } from "next";
import { Address as AddressType, useAccount, useSigner } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { CashOutVoucherButton } from "~~/components/streamer/CashOutVoucherButton";
import {
  useAccountBalance,
  useDeployedContractInfo,
  useScaffoldContractRead,
  useScaffoldContractWrite,
  useScaffoldEventSubscriber,
} from "~~/hooks/scaffold-eth";
import { getLocalProvider, getTargetNetwork } from "~~/utils/scaffold-eth";

export type Voucher = { updatedBalance: BigNumber; signature: string };

const STREAM_ETH_VALUE = "0.5";
const ETH_PER_CHARACTER = "0.01";

/**
 * sends the provided wisdom across the application channel
 * with user at `clientAddress`.
 * @param {string} clientAddress
 */

const Streamer: NextPage = () => {
  const { address: userAddress } = useAccount();
  const { data: userSigner } = useSigner();
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

  useScaffoldEventSubscriber({
    contractName: "Streamer",
    eventName: "Opened",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    listener: (addr, _) => {
      setOpened([...opened, addr]);
      if (userIsOwner) {
        setChannels({ ...channels, [addr]: new BroadcastChannel(addr) });
      }
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
    return processVoucher;

    /**
     * Handle incoming payments from the given client.
     */
    function processVoucher({ data }: { data: Pick<Voucher, "signature"> & { updatedBalance: string } }) {
      // recreate a BigNumber object from the message. v.data.updatedBalance is
      // a string representation of the BigNumber for transit over the network
      let updatedBalance = BigNumber.from(data.updatedBalance);

      /*
       *  Checkpoint 4:
       *
       *  currently, this function recieves and stores vouchers uncritically.
       *
       *  recreate the packed, hashed, and arrayified message from reimburseService (above),
       *  and then use utils.verifyMessage() to confirm that voucher signer was
       *  `clientAddress`. (If it wasn't, log some error message and return).
       */

      // TODO: Checkpoint 4. Remove
      if (updatedBalance.lt(BigNumber.from(0))) {
        updatedBalance = BigNumber.from(0);
      }

      const packed = utils.solidityPack(["uint256"], [updatedBalance]);
      const hashed = utils.keccak256(packed);
      const arrayified = utils.arrayify(hashed);

      const senderAddress = utils.verifyMessage(arrayified, data.signature);

      if (senderAddress !== clientAddress) {
        return;
      }
      // TODO: end of remove block

      const existingVoucher = vouchers[clientAddress];

      // update our stored voucher if this new one is more valuable
      if (existingVoucher === undefined || updatedBalance.lt(existingVoucher.updatedBalance)) {
        setVouchers({ ...vouchers, [clientAddress]: { ...data, updatedBalance } });
        // updateClaimable(clientAddress);
        // logvouchers;
      }
    }
  }

  const [challenged, setChallenged] = useState<AddressType[]>([]);

  useScaffoldEventSubscriber({
    contractName: "Streamer",
    eventName: "Challenged",
    listener: addr => {
      setChallenged([...challenged, addr]);
    },
  });

  const [closed, setClosed] = useState<AddressType[]>([]);

  useScaffoldEventSubscriber({
    contractName: "Streamer",
    eventName: "Closed",
    listener: addr => {
      setClosed([...closed, addr]);
      setOpened(opened.filter(openedAddr => openedAddr !== addr));
      setChallenged(challenged.filter(challengedAddr => challengedAddr !== addr));
    },
  });

  const [wisdoms, setWisdoms] = useState<{ [key: AddressType]: string }>({});

  const userChannel = useMemo(() => {
    try {
      return new BroadcastChannel(userAddress || "");
    } catch (err) {
      // ssr fix
      return { postMessage: () => null, onmessage: () => null };
    }
  }, [userAddress]);

  const provideWisdom = (client: AddressType, wisdom: string) => {
    setWisdoms({ ...wisdoms, [client]: wisdom });
    channels[client].postMessage(wisdom);
  };

  const [vouchers, setVouchers] = useState<{ [key: AddressType]: Voucher }>({});

  const { writeAsync: fundChannel } = useScaffoldContractWrite({
    contractName: "Streamer",
    functionName: "fundChannel",
    value: STREAM_ETH_VALUE,
  });

  const { writeAsync: challengeChannel } = useScaffoldContractWrite({
    contractName: "Streamer",
    functionName: "challengeChannel",
  });

  const { writeAsync: defundChannel } = useScaffoldContractWrite({
    contractName: "Streamer",
    functionName: "defundChannel",
  });

  const [recievedWisdom, setReceivedWisdom] = useState("");

  /**
   * reimburseService prepares, signs, and delivers a voucher for the service provider
   * that pays for the recieved wisdom.
   */
  async function reimburseService(wisdom: string) {
    const initialBalance = utils.parseEther(STREAM_ETH_VALUE);
    const costPerCharacter = utils.parseEther(ETH_PER_CHARACTER);
    const duePayment = costPerCharacter.mul(BigNumber.from(wisdom.length));

    let updatedBalance = initialBalance.sub(duePayment);

    if (updatedBalance.lt(BigNumber.from(0))) {
      updatedBalance = BigNumber.from(0);
    }

    const packed = utils.solidityPack(["uint256"], [updatedBalance]);
    const hashed = utils.keccak256(packed);
    const arrayified = utils.arrayify(hashed);

    // Why not just sign the updatedBalance string directly?
    //
    // Two considerations:
    // 1) This signature is going to verified both off-chain (by the service provider)
    //    and on-chain (by the Streamer contract). These are distinct runtime environments, so
    //    care needs to be taken that signatures are applied to specific data encodings.
    //
    //    the arrayify call below encodes this data in an EVM compatible way
    //
    //    see: https://blog.ricmoo.com/verifying-messages-in-solidity-50a94f82b2ca for some
    //         more on EVM verification of messages signed off-chain
    // 2) Because of (1), it's useful to apply signatures to the hash of any given message
    //    rather than to arbitrary messages themselves. This way the encoding strategy for
    //    the fixed-length hash can be reused for any message format.

    // TODO: sometimes userSigner is undefinded here, it causes a bug that last sybols doesn't count
    const signature = await userSigner?.signMessage(arrayified);

    const hexBalance = updatedBalance.toHexString();

    if (hexBalance && signature) {
      userChannel.postMessage({
        updatedBalance: hexBalance,
        signature,
      });
    }
  }

  /**
   * Handle incoming service data from the service provider.
   *
   * If autoPay is turned on, instantly recalculate due payment
   * and return to the service provider.
   *
   * @param {MessageEvent<string>} e
   */
  userChannel.onmessage = e => {
    if (typeof e.data != "string") {
      // TODO: fix warning for clients
      console.warn(`recieved unexpected channel data: ${JSON.stringify(e.data)}`);
      return;
    }

    setReceivedWisdom(e.data);

    if (autoPay) {
      reimburseService(e.data);
    }
  };

  return (
    <div className="flex items-center flex-col flex-grow w-full px-4">
      <div className="flex flex-col items-center bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 mt-24 w-full max-w-lg">
        {userIsOwner ? (
          // UI for the service provider
          <>
            <p className="block text-2xl mt-0 mb-2 font-semibold">Hello Guru!</p>
            <p className="block text-xl mt-0 mb-1 font-semibold">
              You have {opened.length} channel{opened.length == 1 ? "" : "s"} open
            </p>
            <p className="mt-0 text-lg text-center font-semibold">Total ETH locked: {balance?.toFixed(4) || 0} ETH</p>

            <div className="mt-4 text-lg">
              Channels with <button className="btn btn-sm btn-error">RED</button> withdrawal buttons are under challenge
              on-chain, and should be redeemed ASAP.
            </div>
            <div className="mt-4 w-full flex flex-col">
              {opened.map(clientAddress => (
                <div key={clientAddress} className="w-full flex flex-col border-primary border-t py-6">
                  <Address address={clientAddress} size="xl" />
                  <textarea
                    className="mt-3 bg-base-200"
                    rows={3}
                    placeholder="Provide your wisdom here..."
                    onChange={e => {
                      e.stopPropagation();
                      const updatedWisdom = e.target.value;
                      provideWisdom(clientAddress, updatedWisdom);
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
                          ? utils.formatEther(
                              utils.parseEther(STREAM_ETH_VALUE).sub(vouchers[clientAddress].updatedBalance),
                            )
                          : 0}
                      </strong>
                      &nbsp;ETH
                    </div>
                  </div>

                  {/* Checkpoint 5: */}
                  {vouchers[clientAddress]?.signature && (
                    <CashOutVoucherButton
                      key={clientAddress}
                      clientAddress={clientAddress}
                      challenged={challenged}
                      closed={closed}
                      voucher={vouchers[clientAddress]}
                    />
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          // UI for the service consumer
          <>
            <p className="block text-2xl mt-0 mb-2 font-semibold">Hello Rube!</p>

            {userAddress && opened.includes(userAddress) ? (
              <div className="w-full flex flex-col items-center">
                <div className="flex items-center mt-8">
                  <input
                    type="checkbox"
                    className="toggle toggle-primary bg-primary mr-2"
                    defaultChecked={autoPay}
                    onChange={e => {
                      const updatedAutoPay = e.target.checked;
                      setAutoPay(updatedAutoPay);

                      if (updatedAutoPay) {
                        reimburseService(recievedWisdom);
                      }
                    }}
                  />
                  AutoPay
                </div>

                <div className="text-center w-full">
                  <p className="text-xl font-semibold">Received Wisdom</p>
                  <p className="mb-3 text-lg min-h-[1.75rem] border-2 border-primary rounded">{recievedWisdom}</p>
                </div>

                {/* Checkpoint 6: challenge & closure */}

                <div className="flex flex-col items-center">
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
                        getLocalProvider(getTargetNetwork())?.send("evm_setIntervalMining", [5000]);
                      } catch (e) {}
                    }}
                  >
                    Challenge this channel
                  </button>

                  <div className="p-2 mt-6 h-10">
                    {challenged.includes(userAddress) && (
                      <>
                        <span>Time left:</span> {timeLeft && humanizeDuration(timeLeft.toNumber() * 1000)}
                      </>
                    )}
                  </div>
                  <button
                    className="btn btn-primary"
                    disabled={!challenged.includes(userAddress) || timeLeft?.toNumber() !== 0}
                    onClick={() => defundChannel()}
                  >
                    Close and withdraw funds
                  </button>
                </div>
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
  );
};

export default Streamer;
