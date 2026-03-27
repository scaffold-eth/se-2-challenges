export const preContent = `import { DeployWhitelist } from "./DeployWhitelist.s.sol";
import { DeployStaking } from "./DeployStaking.s.sol";
import { DeployOptimistic } from "./DeployOptimistic.s.sol";`;
export const deploymentsLogic = `
    DeployWhitelist deployWhitelist = new DeployWhitelist();
    deployWhitelist.run();

    DeployStaking deployStaking = new DeployStaking();
    deployStaking.run();

    DeployOptimistic deployOptimistic = new DeployOptimistic();
    deployOptimistic.run();
`;
