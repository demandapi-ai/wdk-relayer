// ============================================================================
// BCH Intents SDK — Common Types
// ============================================================================
// Shared type definitions used across all @bch-intents/* packages.
// These are extracted from the cashtoken-relayer and standardized.

// --- Network ---

/** Supported BCH networks */
export type Network = 'mainnet' | 'chipnet';

// --- Intent Types ---

/** The type of swap order */
export type IntentType = 'LIMIT_ORDER' | 'DUTCH_AUCTION';

/** Lifecycle status of an intent */
export type IntentStatus = 'pending' | 'funded' | 'filled' | 'cancelled' | 'expired';

/** A fully constructed intent with all metadata */
export interface Intent {
    /** Unique intent identifier (e.g. `intent_1709500000_a1b2c3`) */
    id: string;
    /** Order type */
    type: IntentType;
    /** Maker's BCH cashaddr */
    makerAddress: string;
    /** CashScript contract address (where tokens are locked) */
    contractAddress: string;
    /** CashScript token-aware address */
    tokenAddress: string;
    /** Sell token — category ID hex or 'BCH' */
    sellToken: string;
    /** Buy token — category ID hex or 'BCH' */
    buyToken: string;
    /** Amount of sell tokens locked (string for BigInt serialization) */
    sellAmount: string;
    /** Buy amount required (string for BigInt serialization) */
    buyAmount: string;
    /** Current lifecycle status */
    status: IntentStatus;
    /** Funding transaction ID (once funded) */
    fundingTxid?: string;
    /** Fill transaction ID (once filled by a solver) */
    fillTxid?: string;
    /** Block explorer URL */
    explorerUrl?: string;
    /** Unix timestamp (ms) when the intent was created */
    createdAt: number;
    /** Unix timestamp (seconds) when the intent expires */
    expiryTime?: number;
    /** Duration in seconds (for Dutch Auctions) */
    duration?: number;
    /** Dutch Auction: starting (maximum) buy price */
    startBuyAmount?: string;
    /** Dutch Auction: ending (minimum) buy price */
    endBuyAmount?: string;
}

// --- Swap Parameters ---

/** Parameters for creating a Limit Order intent */
export interface LimitOrderParams {
    /** Maker's BCH cashaddr (recipient of buy tokens) */
    makerAddress: string;
    /** Sell token — category ID hex (no 0x prefix) or 'BCH' */
    sellToken: string;
    /** Buy token — category ID hex (no 0x prefix) or 'BCH' */
    buyToken: string;
    /** Amount of sell tokens to lock */
    sellAmount: bigint;
    /** Fixed buy amount required */
    buyAmount: bigint;
    /** Unix timestamp (seconds) when the order expires. Default: 1 hour from now */
    expiryTime?: bigint;
}

/** Parameters for creating a Dutch Auction intent */
export interface DutchAuctionParams {
    /** Maker's BCH cashaddr (recipient of buy tokens) */
    makerAddress: string;
    /** Sell token — category ID hex (no 0x prefix) or 'BCH' */
    sellToken: string;
    /** Buy token — category ID hex (no 0x prefix) or 'BCH' */
    buyToken: string;
    /** Amount of sell tokens to lock */
    sellAmount: bigint;
    /** Dutch Auction: starting (maximum) buy price */
    startBuyAmount: bigint;
    /** Dutch Auction: ending (minimum) buy price */
    endBuyAmount: bigint;
    /** Duration of the auction in seconds. Default: 3600 (1 hour) */
    duration?: bigint;
}

/** Parameters for creating a cross-chain swap */
export interface CrossChainParams {
    /** Source chain identifier */
    sourceChain: 'bch';
    /** Destination chain identifier */
    destChain: 'solana' | 'movement';
    /** Sell token on source chain — category ID hex or 'BCH' */
    sellToken: string;
    /** Buy token on destination chain */
    buyToken: string;
    /** Amount of sell tokens */
    sellAmount: bigint;
    /** Expected buy amount */
    buyAmount: bigint;
    /** Destination address on the target chain */
    destAddress: string;
    /** Timelock in seconds. Default: varies by chain pair */
    timelock?: number;
}

// --- UTXO Types ---

/** A scanned UTXO from the blockchain */
export interface ScannedUtxo {
    /** BCH address that holds this UTXO */
    address: string;
    /** Transaction ID */
    txid: string;
    /** Output index */
    vout: number;
    /** Satoshi value */
    satoshis: bigint;
    /** CashToken data (if present) */
    token?: {
        amount: bigint;
        category: string;
        nft?: {
            capability: 'none' | 'mutable' | 'minting';
            commitment: string;
        };
    };
}

// --- SDK Config ---

/** Configuration for the BCH Intents SDK client */
export interface BCHIntentsConfig {
    /** BCH network to connect to */
    network: Network;
    /** URL of the relayer API (optional — for relayer-backed mode) */
    relayerUrl?: string;
}
