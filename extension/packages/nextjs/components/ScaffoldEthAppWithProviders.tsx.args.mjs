// Reference the example args file: https://github.com/scaffold-eth/create-eth-extensions/blob/example/extension/packages/nextjs/components/ScaffoldEthAppWithProviders.tsx.args.mjs
// Reference the template file that will use this file: https://github.com/scaffold-eth/create-eth/blob/main/templates/base/packages/nextjs/components/ScaffoldEthAppWithProviders.tsx.template.mjs

// Default args:
export const preContent = `import { MonitorAndTriggerTx } from "./MonitorAndTriggerTx";`;
export const globalClassNames = "";
export const extraProviders = {
    "MonitorAndTriggerTx": {},
};
export const overrideProviders = {};
