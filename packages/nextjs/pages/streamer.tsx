import { useState } from "react";
import { BigNumber, utils } from "ethers";
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
  const userIsOwner = ownerAddress === userAddress;

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

  const [channels, setChannels] = useState<{ [key: AddressType]: string }>({});

  const setClientChannel = (client: AddressType, wisdom: string) => {
    setChannels({ ...channels, [client]: wisdom });
  };

  const [vouchers, setVouchers] = useState<{ [key: AddressType]: Voucher }>({});

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
                  setClientChannel(clientAddress, updatedWisdom);
                  // channels[clientAddress].postMessage(updatedWisdom);
                }}
                value={channels[clientAddress]}
              ></textarea>

              <div className="m-2" id={`status-${clientAddress}`}>
                <div>
                  Served: <strong>{channels[clientAddress]?.length || 0}</strong>&nbsp;chars
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
          {/* <List
            const
            dataSource={opened}
            renderItem={clientAddress => (
              <List.Item key={clientAddress}>
                <Address value={clientAddress} ensProvider={mainnetProvider} fontSize={12} />
                <TextArea
                  style={{ margin: 5 }}
                  rows={3}
                  placeholder="Provide your wisdom here..."
                  id={"input-" + clientAddress}
                  onChange={e => {
                    e.stopPropagation();
                    provideService(clientAddress);
                  }}
                ></TextArea>

                <Card style={{ margin: 5 }} id={`status-${clientAddress}`}>
                  <div>
                    Served: <strong id={`provided-${clientAddress}`}>0</strong>&nbsp;chars
                  </div>
                  <div>
                    Recieved: <strong id={`claimable-${clientAddress}`}>0</strong>&nbsp;ETH
                  </div>
                </Card>

                {/* Checkpoint 5: 
                <Button
                  style={{ margin: 5 }}
                  type="primary"
                  danger={challenged.includes(clientAddress)}
                  disabled={closed.includes(clientAddress)}
                  onClick={() => {
                    claimPaymentOnChain(clientAddress);
                  }}
                >
                  Cash out latest voucher
                </Button>
              </List.Item>
            )}
          ></List> */}
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

          {hasOpenChannel() ? (
            <div style={{ padding: 8 }}>
              <Row align="middle">
                <Col span={3}>
                  <Checkbox
                    defaultChecked={autoPay}
                    onChange={e => {
                      autoPay = e.target.checked;
                      console.log("AutoPay: " + autoPay);

                      if (autoPay) {
                        const wisdom = document.getElementById(`recievedWisdom-${userAddress}`).innerText;
                        reimburseService(wisdom);
                      }
                    }}
                  >
                    AutoPay
                  </Checkbox>
                </Col>

                <Col span={16}>
                  <Card title="Received Wisdom">
                    <span id={"recievedWisdom-" + userAddress}></span>
                  </Card>
                </Col>

                {/* Checkpoint 6: challenge & closure */}

                <Col span={5}>
                  <Button
                    disabled={hasClosingChannel()}
                    type="primary"
                    onClick={() => {
                      // disable the production of further voucher signatures
                      autoPay = false;
                      tx(writeContracts.Streamer.challengeChannel());
                      try {
                        // ensure a 'ticking clock' for the UI without having
                        // to send new transactions & mine new blocks
                        localProvider.send("evm_setIntervalMining", [5000]);
                      } catch (e) {}
                    }}
                  >
                    Challenge this channel!
                  </Button>

                  <div style={{ padding: 8, marginTop: 32 }}>
                    <div>Timeleft:</div>
                    {timeLeft && humanizeDuration(timeLeft.toNumber() * 1000)}
                  </div>
                  <Button
                    style={{ padding: 5, margin: 5 }}
                    disabled={timeLeft && timeLeft.toNumber() != 0}
                    type="primary"
                    onClick={() => {
                      tx(writeContracts.Streamer.defundChannel());
                    }}
                  >
                    Close and withdraw funds
                  </Button>
                </Col>
              </Row>
            </div>
          ) : hasClosedChannel() ? (
            <div>
              <p>Thanks for stopping by - we hope you have enjoyed the guru's advice.</p>
              <p> This UI obstructs you from opening a second channel. Why? Is it safe to open another channel?</p>
            </div>
          ) : (
            <div style={{ padding: 8 }}>
              <Button
                type="primary"
                onClick={() => {
                  tx(writeContracts.Streamer.fundChannel({ value: ethers.utils.parseEther("0.5") }));
                }}
              >
                Open a 0.5 ETH channel for advice from the Guru.
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Streamer;
