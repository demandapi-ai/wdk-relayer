# BCH Intents SDK

The official TypeScript SDK for building trustless intent-based swaps on Bitcoin Cash. 

> [!NOTE]
> This SDK uses pure CashTokens and Hash Time-Locked Contracts (HTLCs) for execution. There are no trusted relayers, no multisig custody, and no wrapper tokens. If a solver fulfills your intent, you get paid. If not, you get an automatic refund.

## Packages

This monorepo contains the modular building blocks of the BCH Intents ecosystem:

| Package | Description |
|---|---|
| [`@bch-intents/sdk`](./packages/sdk) | **Meta-package** — Re-exports everything for easy installation. |
| [`@bch-intents/sdk-cashtokens`](./packages/sdk-cashtokens) | Type-safe intent creation (Dutch Auctions, Limit Orders). |
| [`@bch-intents/sdk-cross-chain`](./packages/sdk-cross-chain) | HTLC-based cross-chain flows (Solana, Movement). |
| [`@bch-intents/sdk-order-book`](./packages/sdk-order-book) | Relayer HTTP API and WebSocket event client. |
| [`@bch-intents/sdk-wallet-adapter`](./packages/sdk-wallet-adapter) | Integrations for embedded wallets and `mainnet-js`. |
| [`@bch-intents/sdk-contracts`](./packages/sdk-contracts) | Compiled CashScript covenants and wrappers. |
| [`@bch-intents/sdk-common`](./packages/sdk-common) | Shared types, utility functions, and typed errors. |

## Quickstart

### 1. Installation

```bash
npm install @bch-intents/sdk mainnet-js
```

### 2. Creating an Intent (Dutch Auction)

```typescript
import { IntentBuilder, TokenId, Duration } from '@bch-intents/sdk';
import { RelayerClient } from '@bch-intents/sdk';

const relayer = new RelayerClient({ network: 'mainnet' });

// 1. Build the intent parameters
const params = IntentBuilder.dutchAuction()
    .makerAddress('bitcoincash:qp...') // Where you receive the target token
    .sellToken(TokenId.BCH)            // What you are selling
    .buyToken('abcd1234abcd1234...')   // What you want to buy (category ID hex)
    .sellAmount(100_000n)              // Sell 100,000 sats
    .startBuyAmount(50n)               // Best price (max tokens you'll accept)
    .endBuyAmount(40n)                 // Worst price (min tokens you'll accept)
    .duration(Duration.hours(1))
    .build();

// 2. Submit to intent pool for solver competition
const { intentId, contractAddress } = await relayer.createDutchAuction(params);

console.log(`Fund this address to activate your intent: ${contractAddress}`);
```

### 3. Listening to Real-Time Updates

Listen to the solver network to know when your intent is filled via WebSocket:

```typescript
const unsubscribe = relayer.listen((event) => {
    switch(event.type) {
        case 'intent:created':
            console.log('New intent added to pool', event.data);
            break;
        case 'intent:filled':
            console.log(`Intent ${event.data.intentId} was filled! Tx: ${event.data.txid}`);
            break;
    }
});
```

## Advanced Uses

Check the `/examples` directory for advanced integrations:
* **Solver Bot (Cauldron DEX Aggregator)**: How to write a solver bot that sources liquidity from Cauldron AMMs to fill intents.
* **Aggregated UX**: How to use `@bch-intents/sdk-wallet-adapter` to build a seamless embedded DEX.

## Future Upgrades
The SDK natively targets **BCH 2023 primitives** (Introspection opcodes & CashTokens). When the **May 2026 CHIPs** (`OP_BEGIN`, `OP_UNTIL`, P2S) activate on mainnet, the `@bch-intents/sdk-contracts` core will be upgraded dynamically to provide smaller byte-costs and non-linear (exponential) auction curves, automatically enriching existing `@bch-intents/sdk-cashtokens` integrations.

### Zero-Knowledge Proof (ZKP) Settlement
As discussed with DevRel, our endgame architecture replaces current cross-chain HTLC liveness dependencies entirely with natively verified **Triton VM zk-STARKs**.
* **Triton VM vs. Miden:** While alternatives like Polygon Miden offer smaller proofs, they rely on recursive SNARKs which introduce "trusted setup" assumptions. We explicitly chose Triton VM for its transparent, post-quantum secure, and completely trustless cryptography, which perfectly aligns with the BCH ethos.
* **Current Feasibility:** A ~90KB Triton STARK proof fits natively inside the current 100KB BCH transaction limit. 
* **CashToken Aggregation:** By leveraging bitjson's "Quantumroot" cross-address aggregation, a single authorized CashToken allows a Solver to batch-sweep hundreds of intent UTXOs against ONE proof today.
* **The TxV5 Horizon:** When the proposed `TxV5` CHIP (Read-Only Inputs) activates, Solvers will post the STARK proof *once* as a read-only input. Hundreds of Intent Covenants can then verify that same proof simultaneously with practically **zero byte overhead** per-intent, solving the ZKP size constraint forever.
