export const preContent = `import Image from "next/image";`;

export const description = `
  <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5">
        <h1 className="text-center mb-6">
          <span className="block text-2xl mb-2">SpeedRunEthereum</span>
          <span className="block text-4xl font-bold">Challenge: ⚖️ 🎁 SVG NFT</span>
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
            <p className="mt-8">
              🎨 Creating on-chain SVG NFTs is an exciting way to leverage the power of smart contracts for generating
              unique digital art. This challenge will have you build a contract that generates dynamic SVG images
              directly on the blockchain. Users will be able to mint their own unique NFTs with customizable SVG
              graphics and metadata.
            </p>
            <p>
              🌟 Use{" "}
              <Link href="/loogies" className="underline">
                Loogies
              </Link>{" "}
              as an example to guide your project. This will provide a solid foundation and inspiration for creating
              your own dynamic SVG NFTs.
            </p>
            <p className="mt-8">
              💬 Meet other builders working on this challenge and get help in the{" "}
              <a href="https://t.me/+mUeITJ5u7Ig0ZWJh" target="_blank" rel="noreferrer" className="underline">
                🎁 SVG NFT 🎫 Building Cohort
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
`;

export const externalExtensionName = "SpeedRunEthereum Challenge: Svg NFT";
