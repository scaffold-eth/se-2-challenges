// Reference the example args file: https://github.com/scaffold-eth/create-eth-extensions/blob/example/extension/packages/nextjs/components/ScaffoldEthAppWithProviders.tsx.args.mjs

// Default args:
export const preContent = `import { MonitorAndTriggerTx } from "./MonitorAndTriggerTx";`;
export const globalClassNames = "font-space-grotesk";
export const extraProviders = {
    "MonitorAndTriggerTx": {},
};
export const overrideProviders = {};
