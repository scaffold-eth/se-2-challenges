export const preContent = `import { DeployVoting } from "./DeployVoting.s.sol";`;

export const deploymentsLogic = `
    DeployVoting deployVoting = new DeployVoting();
    deployVoting.run();
`;
