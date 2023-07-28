import { useState } from "react";
import { BigNumber, utils } from "ethers";
import humanizeDuration from "humanize-duration";
import { NextPage } from "next";
import { Address as AddressType, useAccount, useContractWrite } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { CashOutVoucherButton } from "~~/components/streamer/CashOutVoucherButton";
import { useScaffoldContractRead, useScaffoldContractWrite, useScaffoldEventSubscriber } from "~~/hooks/scaffold-eth";

export type Voucher = { updatedBalance: BigNumber; signature: string };

/**
 * sends the provided wisdom across the application channel
 * with user at `clientAddress`.
 * @param {string} clientAddress
 */

const Streamer: NextPage = () => {
  const { address: userAddress } = useAccount();
  const { data: ownerAddress } = useScaffoldContractRead({ contractName: "Streamer", functionName: "owner" });
  const { data: timeLeft } = useScaffoldContractRead({
    contractName: "Streamer",
    functionName: "timeLeft",
    args: [userAddress],
  });

  const userIsOwner = ownerAddress === userAddress;
  const [autoPay, setAutoPay] = useState(true);

  const [opened, setOpened] = useState<AddressType[]>([]);

  useScaffoldEventSubscriber({
    contractName: "Streamer",
    eventName: "Opened",
    listener: (addr, _) => {
      setOpened([...opened, addr]);
    },
  });

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
  const [channels, setChannels] = useState<{ [key: AddressType]: BroadcastChannel }>({});

  const provideWisdom = (client: AddressType, wisdom: string) => {
    setWisdoms({ ...wisdoms, [client]: wisdom });
    channels[client].postMessage(wisdom);
  };

  const [vouchers, setVouchers] = useState<{ [key: AddressType]: Voucher }>({});

  const { writeAsync: fundChannel } = useScaffoldContractWrite({
    contractName: "Streamer",
    functionName: "fundChannel",
    value: "0.5",
  });

  const { writeAsync: challengeChannel } = useScaffoldContractWrite({
    contractName: "Streamer",
    functionName: "challengeChannel",
  });

  const { writeAsync: defundChannel } = useScaffoldContractWrite({
    contractName: "Streamer",
    functionName: "defundChannel",
  });

  /**
   * reimburseService prepares, signs, and delivers a voucher for the service provider
   * that pays for the recieved wisdom.
   *
   * @param {string} wisdom
   */
  async function reimburseService(wisdom: string) {
    const initialBalance = utils.parseEther("0.5");
    const costPerCharacter = utils.parseEther("0.001");
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

    const signature = await userSigner.signMessage(arrayified);

    channel.postMessage({
      updatedBalance: updatedBalance.toHexString(),
      signature,
    });
  }

  /**
   * Handle incoming service data from the service provider.
   *
   * If autoPay is turned on, instantly recalculate due payment
   * and return to the service provider.
   *
   * @param {MessageEvent<string>} e
   */
  channel.onmessage = e => {
    if (typeof e.data != "string") {
      console.warn(`recieved unexpected channel data: ${JSON.stringify(e.data)}`);
      return;
    }

    console.log("Received: %s", e.data);
    recievedWisdom = e.data;
    document.getElementById("recievedWisdom-" + userAddress).innerText = recievedWisdom;

    if (autoPay) {
      reimburseService(recievedWisdom);
    }
  };

  return (
    <div>
      {userIsOwner ? (
        // UI for the service provider
        <div>
          <h1>Hello Guru!</h1>
          <h2>
            You have {opened.length} channel{opened.length == 1 ? "" : "s"} open.
          </h2>
          Channels with <button className="btn btn-sm btn-error">RED</button> withdrawal buttons are under challenge
          on-chain, and should be redeemed ASAP.
          <div>
            {opened.map(addr => (
              <div key={addr}>
                <Address address={addr} />
              </div>
            ))}
          </div>
          {opened.map(clientAddress => (
            <div key={clientAddress}>
              <Address address={clientAddress} />
              <textarea
                className="m-1.5"
                rows={3}
                placeholder="Provide your wisdom here..."
                // id={"input-" + clientAddress}
                onChange={e => {
                  e.stopPropagation();
                  // provideService(clientAddress);
                  const updatedWisdom = e.target.value;
                  provideWisdom(clientAddress, updatedWisdom);
                  // channels[clientAddress].postMessage(updatedWisdom);
                }}
                value={wisdoms[clientAddress]}
              ></textarea>

              <div className="m-2" id={`status-${clientAddress}`}>
                <div>
                  Served: <strong>{wisdoms[clientAddress]?.length || 0}</strong>&nbsp;chars
                </div>
                <div>
                  Recieved: <strong id={`claimable-${clientAddress}`}>0</strong>&nbsp;ETH
                </div>
              </div>

              {/* Checkpoint 5: */}
              <CashOutVoucherButton
                key={clientAddress}
                clientAddress={clientAddress}
                challenged={challenged}
                closed={closed}
                voucher={vouchers[clientAddress]}
              />
            </div>
          ))}
          <div className="p-2">
            <div>Total ETH locked:</div>
            {/* add contract balance */}
          </div>
        </div>
      ) : (
        //
        // UI for the service consumer
        //
        <div>
          <h1>Hello Rube!</h1>

          {userAddress && opened.includes(userAddress) ? (
            <div className="p-2">
              <div className="items-center">
                <div className="flex flex-col items-center">
                  <input
                    type="checkbox"
                    defaultChecked={autoPay}
                    onChange={e => {
                      setAutoPay(e.target.checked);

                      if (autoPay) {
                        const wisdom = document.getElementById(`recievedWisdom-${userAddress}`).innerText;
                        reimburseService(wisdom);
                      }
                    }}
                  >
                    AutoPay
                  </input>
                </div>

                <div>
                  <p className="text-xl">Received Wisdom</p>
                  <span id={"recievedWisdom-" + userAddress}></span>
                </div>

                {/* Checkpoint 6: challenge & closure */}

                <div className="gap-3">
                  <button
                    disabled={closed.includes(userAddress)}
                    className="btn btn-primary"
                    onClick={() => {
                      // disable the production of further voucher signatures
                      setAutoPay(false);
                      challengeChannel();
                      try {
                        // ensure a 'ticking clock' for the UI without having
                        // to send new transactions & mine new blocks
                        // TODO do we need it?
                        // localProvider.send("evm_setIntervalMining", [5000]);
                      } catch (e) {}
                    }}
                  >
                    Challenge this channel!
                  </button>

                  <div className="p-2 mt-8">
                    <div>Timeleft:</div>
                    {timeLeft && humanizeDuration(timeLeft.toNumber() * 1000)}
                  </div>
                  <button
                    className="btn btn-primary m-1.5 p-1.5"
                    disabled={timeLeft && timeLeft.toNumber() != 0}
                    onClick={() => defundChannel()}
                  >
                    Close and withdraw funds
                  </button>
                </div>
              </div>
            </div>
          ) : userAddress && closed.includes(userAddress) ? (
            <div>
              <p>Thanks for stopping by - we hope you have enjoyed the guru&apos;s advice.</p>
              <p> This UI obstructs you from opening a second channel. Why? Is it safe to open another channel?</p>
            </div>
          ) : (
            <div className="p-2">
              <button onClick={() => fundChannel()}>Open a 0.5 ETH channel for advice from the Guru.</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Streamer;
