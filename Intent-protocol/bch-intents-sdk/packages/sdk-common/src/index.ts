// ============================================================================
// @bch-intents/sdk-common — Public API
// ============================================================================

// Types
export type {
    Network,
    IntentType,
    IntentStatus,
    Intent,
    LimitOrderParams,
    DutchAuctionParams,
    CrossChainParams,
    ScannedUtxo,
    BCHIntentsConfig,
} from './types.js';

// Utils
export {
    reverseHex,
    stripHex,
    derivePkhFromAddress,
    formatCategoryForContract,
    formatCategoryForRegistry,
    generateIntentId,
} from './utils.js';

// Duration helpers
export { Duration } from './duration.js';

// Token ID
export { TokenId } from './token.js';

// Errors
export {
    IntentError,
    RelayerUnreachableError,
    IntentNotFoundError,
    InvalidTokenCategoryError,
    InsufficientFundsError,
    CovenantCompilationError,
    IntentExpiredError,
    MissingParameterError,
} from './errors.js';
