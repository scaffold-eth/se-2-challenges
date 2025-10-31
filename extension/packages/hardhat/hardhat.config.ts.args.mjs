export const preContent = `
import "@nomicfoundation/hardhat-viem";
`;

export const configOverrides = {
    networks: {
      hardhat: {
        mining: {
            auto: false,
            interval: 1000,
        }
      },
    },
  };
