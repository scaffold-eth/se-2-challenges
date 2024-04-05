// To be used in JSON.stringify when a field might be bigint
// https://wagmi.sh/react/faq#bigint-serialization
export const replacer = (_key: string, value: unknown) => (typeof value === "bigint" ? value.toString() : value);

export const wrapInTryCatch = (fn: () => Promise<any>) => async () => {
  try {
    await fn();
  } catch (error) {
    console.error(`Error calling ${fn.name} function`, error);
  }
};
