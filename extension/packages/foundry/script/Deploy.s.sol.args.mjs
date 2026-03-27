export const preContent = `import { DeployDEX } from "./DeployDEX.s.sol";`;
export const deploymentsLogic = `
    DeployDEX deployDEX = new DeployDEX();
    deployDEX.run();
`;
