interface NodeConfig {
  PROBABILITY_OF_SKIPPING_REPORT: number;
  PRICE_VARIANCE: number; // Higher number means wider price range
}

export interface Config {
  PRICE: {
    CACHEDPRICE: number;
    TIMESTAMP: number;
  };
  INTERVALS: {
    PRICE_REPORT: number;
    VALIDATION: number;
  };
  NODE_CONFIGS: {
    [key: string]: NodeConfig;
    default: NodeConfig;
  };
}
