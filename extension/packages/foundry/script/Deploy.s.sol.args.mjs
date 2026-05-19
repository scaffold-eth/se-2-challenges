export const preContent = `import { DeployLending } from "./DeployLending.s.sol";`;
export const deploymentsLogic = `
    DeployLending deployLending = new DeployLending();
    deployLending.run();
`;
