export const configOverrides = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            // https://docs.soliditylang.org/en/latest/using-the-compiler.html#optimizer-options
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      mining: {
        auto: true,
        interval: 1000,
      },
    },
  },
};
