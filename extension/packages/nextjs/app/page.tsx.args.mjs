export const preContent = `import Image from "next/image";`;

export const description = `
          <div className="flex items-center flex-col flex-grow pt-10">
            <div className="px-5">
              <h1 className="text-center mb-6">
                <span className="block text-2xl mb-2">Speedrun Ethereum</span>
                <span className="block text-4xl font-bold">Challenge: ⚖️ Build a DEX</span>
              </h1>
              <div className="flex flex-col items-center justify-center">
                <Image
                  src="/hero.png"
                  width="727"
                  height="231"
                  alt="challenge banner"
                  className="rounded-xl border-4 border-primary"
                />
                <div className="max-w-3xl">
                  <p className="text-center text-lg mt-8">
                    💵 Build an exchange that swaps ETH to tokens and tokens to ETH. 💰 This is possible because the
                    smart contract holds reserves of both assets and has a price function based on the ratio of the
                    reserves. Liquidity providers are issued a token that represents their share of the reserves and
                    fees.
                  </p>
                  <p className="text-center text-lg">
                    🌟 The final deliverable is an app that allows users to seamlessly trade ERC20 BALLOONS ($BAL) with
                    ETH in a decentralized manner. Users will be able to connect their wallets, view their token
                    balances, and buy or sell their tokens according to a price formula! Submit the url on{" "}
                    <a href="https://speedrunethereum.com/" target="_blank" rel="noreferrer" className="underline">
                      SpeedrunEthereum.com
                    </a>{" "}
                    !
                  </p>
                </div>
              </div>
            </div>
          </div>
`;

export const externalExtensionName = "Speedrun Ethereum Challenge: Dex";
