export const preContent = `import { DeployMyUSD } from "./DeployMyUSD.s.sol";`;
export const deploymentsLogic = `
    DeployMyUSD deployMyUSD = new DeployMyUSD();
    deployMyUSD.run();
`;
