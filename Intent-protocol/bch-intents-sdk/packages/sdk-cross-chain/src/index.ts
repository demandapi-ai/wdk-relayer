// ============================================================================
// @bch-intents/sdk-cross-chain — Public API
// ============================================================================

export {
    generateSecret,
    hashSecret,
    HTLCTimelocks
} from './htlc.js';

// The CrossChainHTLCContract is already exported from sdk-contracts,
// but we might want high-level abstractions here eventually.
