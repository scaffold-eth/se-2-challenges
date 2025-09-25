export const preContent = `import Image from "next/image";`;

export const description = `
  <div className="flex items-center flex-col flex-grow mt-4">
    <div className="px-5 w-[90%]">
      <h1 className="text-center mb-6">
        <span className="block text-4xl font-bold">🚩 Challenge: ZK Voting</span>
      </h1>
      <div className="flex flex-col items-center justify-center">
        <Image
          src="/readme-zk.png"
          width="727"
          height="231"
          alt="ZK Voting challenge banner"
          className="rounded-xl border-4 border-primary"
        />
        <div className="max-w-3xl">
          <p className="text-center text-lg mt-8">
            🗳️ Create a private, Sybil-resistant voting system where anyone can prove they’re eligible and vote
            exactly once, <strong>without revealing who they are</strong>.
          </p>
          <p className="text-center text-lg">
            🔐 You’ll use <strong>zero-knowledge proofs</strong> to keep votes unlinkable to identities while
            keeping results publicly verifiable on-chain. Registered voters generate commitments, produce proofs,
            and submit them to a Solidity verifier contract generated from your Noir circuits.
          </p>
          <p className="text-center text-lg">
            🌟 <strong>Final deliverable:</strong> an app where anyone can create a <em>Yes/No question</em>, and
            registered voters can cast their votes anonymously. Results remain fully transparent and visible live
            on-chain.
          </p>
          <p className="text-center text-lg">
            🚀 Deploy your contracts to a <strong>Sepolia</strong>, publish your app to a <strong>Vercel</strong>,
            and submit your URL on{" "}
            <a href="https://speedrunethereum.com/" target="_blank" rel="noreferrer" className="underline">
              SpeedRunEthereum.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  </div>
`;

export const externalExtensionName = "SpeedRunEthereum ZK Voting";
