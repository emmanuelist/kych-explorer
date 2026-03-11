import type { Transaction, BIP329Label, CytoscapeGraph } from "@/types";

// Fake but realistic-looking 64-char hex txids
export const DEMO_TXIDS = {
  coinbase: "000000a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8",
  txA: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
  txB: "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  txC: "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
  txD: "d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
  txE: "e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5",
  txF: "f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6",
  txG: "a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7",
} as const;

const DEMO_ADDRESSES = {
  miner: "bc1qminerxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  alice: "bc1qalicexxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  bob: "bc1qbobxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  exchange: "bc1qexchangexxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  dave: "bc1qdavexxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  carol: "bc1qcarolxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  mixer: "bc1qmixerxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
};

export const DEMO_TRANSACTIONS: Record<string, Transaction> = {
  [DEMO_TXIDS.coinbase]: {
    txid: DEMO_TXIDS.coinbase,
    confirmations: 52000,
    total_value: 6.25,
    timestamp: 1700000000,
    is_coinbase: true,
    inputs: [{ txid: "0".repeat(64), vout: 0 }],
    outputs: [
      { n: 0, address: DEMO_ADDRESSES.miner, value: 6.25 },
    ],
  },
  [DEMO_TXIDS.txA]: {
    txid: DEMO_TXIDS.txA,
    confirmations: 51990,
    total_value: 6.24,
    timestamp: 1700003600,
    is_coinbase: false,
    inputs: [
      { txid: DEMO_TXIDS.coinbase, vout: 0, address: DEMO_ADDRESSES.miner, value: 6.25 },
    ],
    outputs: [
      { n: 0, address: DEMO_ADDRESSES.alice, value: 3.5, spent_by: DEMO_TXIDS.txC },
      { n: 1, address: DEMO_ADDRESSES.bob, value: 2.74, spent_by: DEMO_TXIDS.txB },
    ],
  },
  [DEMO_TXIDS.txB]: {
    txid: DEMO_TXIDS.txB,
    confirmations: 51980,
    total_value: 2.73,
    timestamp: 1700007200,
    is_coinbase: false,
    inputs: [
      { txid: DEMO_TXIDS.txA, vout: 1, address: DEMO_ADDRESSES.bob, value: 2.74 },
    ],
    outputs: [
      { n: 0, address: DEMO_ADDRESSES.exchange, value: 2.5, spent_by: DEMO_TXIDS.txG },
      { n: 1, address: DEMO_ADDRESSES.bob, value: 0.23, spent_by: DEMO_TXIDS.txE },
    ],
  },
  [DEMO_TXIDS.txC]: {
    txid: DEMO_TXIDS.txC,
    confirmations: 51975,
    total_value: 3.49,
    timestamp: 1700010800,
    is_coinbase: false,
    inputs: [
      { txid: DEMO_TXIDS.txA, vout: 0, address: DEMO_ADDRESSES.alice, value: 3.5 },
    ],
    outputs: [
      { n: 0, address: DEMO_ADDRESSES.dave, value: 2.0, spent_by: DEMO_TXIDS.txF },
      { n: 1, address: DEMO_ADDRESSES.alice, value: 1.49 },
    ],
  },
  [DEMO_TXIDS.txD]: {
    txid: DEMO_TXIDS.txD,
    confirmations: 52100,
    total_value: 1.5,
    timestamp: 1699990000,
    is_coinbase: false,
    inputs: [
      { txid: "1".repeat(64), vout: 0 },
    ],
    outputs: [
      { n: 0, address: DEMO_ADDRESSES.carol, value: 1.5, spent_by: DEMO_TXIDS.txE },
    ],
  },
  [DEMO_TXIDS.txE]: {
    txid: DEMO_TXIDS.txE,
    confirmations: 51970,
    total_value: 1.72,
    timestamp: 1700014400,
    is_coinbase: false,
    inputs: [
      { txid: DEMO_TXIDS.txB, vout: 1, address: DEMO_ADDRESSES.bob, value: 0.23 },
      { txid: DEMO_TXIDS.txD, vout: 0, address: DEMO_ADDRESSES.carol, value: 1.5 },
    ],
    outputs: [
      { n: 0, address: DEMO_ADDRESSES.bob, value: 1.72 },
    ],
  },
  [DEMO_TXIDS.txF]: {
    txid: DEMO_TXIDS.txF,
    confirmations: 51965,
    total_value: 1.99,
    timestamp: 1700018000,
    is_coinbase: false,
    inputs: [
      { txid: DEMO_TXIDS.txC, vout: 0, address: DEMO_ADDRESSES.dave, value: 2.0 },
    ],
    outputs: [
      { n: 0, address: DEMO_ADDRESSES.mixer, value: 1.8 },
      { n: 1, address: DEMO_ADDRESSES.dave, value: 0.19 },
    ],
  },
  [DEMO_TXIDS.txG]: {
    txid: DEMO_TXIDS.txG,
    confirmations: 51960,
    total_value: 2.49,
    timestamp: 1700021600,
    is_coinbase: false,
    inputs: [
      { txid: DEMO_TXIDS.txB, vout: 0, address: DEMO_ADDRESSES.exchange, value: 2.5 },
    ],
    outputs: [
      { n: 0, address: DEMO_ADDRESSES.exchange, value: 2.49 },
    ],
  },
};

export const DEMO_GRAPH: CytoscapeGraph = {
  nodes: [
    {
      data: {
        id: DEMO_TXIDS.coinbase,
        label: "Coinbase\n6.25 BTC",
        txid: DEMO_TXIDS.coinbase,
        value: 6.25,
        is_coinbase: true,
        has_label: true,
      },
    },
    {
      data: {
        id: DEMO_TXIDS.txA,
        label: "Tx A\n6.24 BTC",
        txid: DEMO_TXIDS.txA,
        value: 6.24,
        is_coinbase: false,
        has_label: false,
      },
    },
    {
      data: {
        id: DEMO_TXIDS.txB,
        label: "Tx B\n2.73 BTC",
        txid: DEMO_TXIDS.txB,
        value: 2.73,
        is_coinbase: false,
        has_label: true,
      },
    },
    {
      data: {
        id: DEMO_TXIDS.txC,
        label: "Tx C\n3.49 BTC",
        txid: DEMO_TXIDS.txC,
        value: 3.49,
        is_coinbase: false,
        has_label: false,
      },
    },
    {
      data: {
        id: DEMO_TXIDS.txD,
        label: "Tx D\n1.5 BTC",
        txid: DEMO_TXIDS.txD,
        value: 1.5,
        is_coinbase: false,
        has_label: true,
      },
    },
    {
      data: {
        id: DEMO_TXIDS.txE,
        label: "Tx E\n1.72 BTC",
        txid: DEMO_TXIDS.txE,
        value: 1.72,
        is_coinbase: false,
        has_label: true,
      },
    },
    {
      data: {
        id: DEMO_TXIDS.txF,
        label: "Tx F\n1.99 BTC",
        txid: DEMO_TXIDS.txF,
        value: 1.99,
        is_coinbase: false,
        has_label: false,
      },
    },
    {
      data: {
        id: DEMO_TXIDS.txG,
        label: "Tx G\n2.49 BTC",
        txid: DEMO_TXIDS.txG,
        value: 2.49,
        is_coinbase: false,
        has_label: true,
      },
    },
  ],
  edges: [
    {
      data: {
        id: `${DEMO_TXIDS.coinbase}->${DEMO_TXIDS.txA}`,
        source: DEMO_TXIDS.coinbase,
        target: DEMO_TXIDS.txA,
        value: 6.25,
        label: "6.25 BTC",
      },
    },
    {
      data: {
        id: `${DEMO_TXIDS.txA}->${DEMO_TXIDS.txB}`,
        source: DEMO_TXIDS.txA,
        target: DEMO_TXIDS.txB,
        value: 2.74,
        label: "2.74 BTC",
      },
    },
    {
      data: {
        id: `${DEMO_TXIDS.txA}->${DEMO_TXIDS.txC}`,
        source: DEMO_TXIDS.txA,
        target: DEMO_TXIDS.txC,
        value: 3.5,
        label: "3.5 BTC",
      },
    },
    {
      data: {
        id: `${DEMO_TXIDS.txB}->${DEMO_TXIDS.txE}`,
        source: DEMO_TXIDS.txB,
        target: DEMO_TXIDS.txE,
        value: 0.23,
        label: "0.23 BTC",
      },
    },
    {
      data: {
        id: `${DEMO_TXIDS.txD}->${DEMO_TXIDS.txE}`,
        source: DEMO_TXIDS.txD,
        target: DEMO_TXIDS.txE,
        value: 1.5,
        label: "1.5 BTC",
      },
    },
    {
      data: {
        id: `${DEMO_TXIDS.txC}->${DEMO_TXIDS.txF}`,
        source: DEMO_TXIDS.txC,
        target: DEMO_TXIDS.txF,
        value: 2.0,
        label: "2.0 BTC",
      },
    },
    {
      data: {
        id: `${DEMO_TXIDS.txB}->${DEMO_TXIDS.txG}`,
        source: DEMO_TXIDS.txB,
        target: DEMO_TXIDS.txG,
        value: 2.5,
        label: "2.5 BTC",
      },
    },
  ],
};

export const DEMO_LABELS: BIP329Label[] = [
  {
    id: "demo-label-1",
    type: "tx",
    ref: DEMO_TXIDS.coinbase,
    label: "Mining reward",
    origin: "demo",
  },
  {
    id: "demo-label-2",
    type: "tx",
    ref: DEMO_TXIDS.txB,
    label: "Exchange deposit",
    origin: "demo",
  },
  {
    id: "demo-label-3",
    type: "tx",
    ref: DEMO_TXIDS.txD,
    label: "Carol's funding",
    origin: "demo",
  },
  {
    id: "demo-label-4",
    type: "tx",
    ref: DEMO_TXIDS.txE,
    label: "Consolidation",
    origin: "demo",
  },
  {
    id: "demo-label-5",
    type: "tx",
    ref: DEMO_TXIDS.txG,
    label: "Exchange internal",
    origin: "demo",
  },
];
