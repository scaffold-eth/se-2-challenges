export const preContent = `
import hardhatViem from "@nomicfoundation/hardhat-viem";
`;

export const configOverrides = {
    plugins: '$$[hardhatToolbox, hardhatViem, HardhatDeploy]$$',
    networks: {
      hardhat: {
        mining: {
            auto: false,
            interval: 1000,
        }
      },
    },
  };
