// CHALLENGE-TODO: Update the title, description, and challengeDeliverable to reflect your challenge
export const description = `
  <div className="flex items-center flex-col flex-grow mt-4">
    <div className="px-5 w-[90%]">
      <h1 className="text-center mb-6">
        <span className="block text-4xl font-bold">{challengeTitle}</span>
      </h1>
      <div className="flex flex-col items-center justify-center">
        <div className="max-w-3xl">
          <p className="text-center text-lg mt-8">
            {challengeDescription}
          </p>
          <p className="text-center text-lg">
            🌟 The final deliverable is an app that {challengeDeliverable}. Deploy your contracts to a
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
// CHALLENGE-TODO: Update the externalExtensionName to reflect your challenge
export const externalExtensionName = "SpeedRunEthereum YOUR CHALLENGE TITLE";
