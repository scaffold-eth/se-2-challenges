export const configOverrides = {
  solidity: {
    compilers: [
      {
        version: "0.8.27",
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
  npmFilesToBuild: ["poseidon-solidity/PoseidonT3.sol", "@zk-kit/lean-imt.sol/LeanIMT.sol"],
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
  },
};
