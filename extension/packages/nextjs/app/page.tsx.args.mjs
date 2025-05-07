export const imports = `import Image from "next/image";`;

export const description = `
  <div className="flex items-center flex-col flex-grow mt-4">
    <div className="px-5 w-[90%]">
      <h1 className="text-center mb-6">
        <span className="block text-4xl font-bold">Prediction Markets Challenge</span>
      </h1>
      <div className="flex flex-col items-center justify-center">
        <Image
          src="/hero-home.png"
          width="727"
          height="231"
          alt="challenge banner"
          className="rounded-xl border-4 border-primary"
        />
        <div className="max-w-3xl">
          <p className="text-center text-lg mt-8">
            🔮 This challenge will guide you through building and understanding a simple prediction market, where
            users can buy and sell ERC20 outcome shares based on the result of an event. You&apos;ll step into
            three roles: liquidity provider, oracle, and user. The event? A car race 🏎️🏁.
          </p>
          <p className="text-center text-lg">
            🌟 The final deliverable is an app where users can bet on the outcome of a race, trade outcome shares
            while the race is ongoing, and redeem their shares once it ends. Liquidity providers can add or remove
            liquidity, and an oracle reports the race result. Deploy your contracts to a testnet then build and
            upload your app to a public web server. Submit the url on{" "}
            <a href="https://speedrunethereum.com/" target="_blank" rel="noreferrer" className="underline">
              SpeedRunEthereum.com
            </a>{" "}
            !
          </p>
        </div>
      </div>
    </div>
  </div>
`;

export const externalExtensionName = "SpeedRunEthereum Prediction Markets";
