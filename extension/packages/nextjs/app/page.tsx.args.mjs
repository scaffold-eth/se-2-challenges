export const imports = `import Image from "next/image";`;

export const description = `
  <div className="flex items-center flex-col flex-grow mt-4">
    <div className="px-5 w-[90%]">
      <h1 className="text-center mb-6">
        <span className="block text-4xl font-bold">💳🌽 Over-collateralized Lending</span>
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
            💳 Build your own lending and borrowing platform. Let&apos;s write a contract that takes collateral and lets you borrow other assets against the value of the collateral. What happens when the collateral changes in value? We will be able to borrow more if it is higher or if it is lower we will also build a system for liquidating the debt position.
          </p>
          <p className="text-center text-lg">
            🌟 The final deliverable is an app that allows anyone to take out a loan in CORN while making sure it is always backed by it&apos;s value in ETH.
            Deploy your contracts to a testnet then build and upload your app to a public web server. Submit the url on{" "}
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
// CHALLENGE-TODO: Update the externalExtensionName to reflect your challenge
export const externalExtensionName = "SpeedRunEthereum Over-collateralized Lending";
