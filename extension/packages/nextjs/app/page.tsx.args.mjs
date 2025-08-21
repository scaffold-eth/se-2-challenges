export const preContent = `import Image from "next/image";`;

export const description = `
  <div className="flex items-center flex-col flex-grow mt-4">
    <div className="px-5 w-[90%]">
      <h1 className="text-center mb-6">
        <span className="block text-4xl font-bold">Oracles</span>
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
            🔮 Build your own decentralized oracle network! In this challenge, you&apos;ll explore different
            oracle architectures and implementations. You&apos;ll dive deep into concepts like staking
            mechanisms, consensus algorithms, slashing conditions, and dispute resolution – all crucial
            components of a robust oracle system.
          </p>
          <p className="text-center text-lg">
            🌟 The final deliverable is a comprehensive understanding of oracle architectures through exploration 
            and hands-on implementation. You&apos;ll explore two existing oracle systems (Whitelist and Staking) to 
            understand their mechanics, then implement the Optimistic Oracle from scratch. Deploy your optimistic 
            oracle to a testnet and demonstrate how it handles assertions, proposals, disputes, and settlements. 
            Then build and upload your app to a public web server. Submit the url on{" "}
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

export const externalExtensionName = "SpeedRunEthereum Oracles";
