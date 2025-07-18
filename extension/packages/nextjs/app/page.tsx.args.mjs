export const preContent = `import Image from "next/image";`;

export const description = `
  <div className="flex items-center flex-col flex-grow mt-4">
    <div className="px-5 w-[90%]">
      <h1 className="text-center mb-6">
        <span className="block text-4xl font-bold">Challenge: Simple NFT</span>
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
            🎫 Create a simple NFT to learn basics of 🏗️ Scaffold-ETH 2. You'll use 👷‍♀️
            <a href="https://hardhat.org/getting-started/" target="_blank" rel="noreferrer" className="underline">
              HardHat
            </a>{" "}
            to compile and deploy smart contracts. Then, you'll use a template React app full of important
            Ethereum components and hooks. Finally, you'll deploy an NFT to a public network to share with
            friends! 🚀
          </p>
          <p className="text-center text-lg">
            🌟 The final deliverable is an app that lets users purchase and transfer NFTs. Deploy your contracts to a
            testnet then build and upload your app to a public web server. Submit the url on{" "}
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

export const externalExtensionName =
  "SpeedRunEthereum Challenge: Simple NFT Example";
