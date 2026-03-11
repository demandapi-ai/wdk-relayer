// ============================================================================
// @bch-intents/sdk-contracts — Public API
// ============================================================================

// Contract Compilers
export { DutchAuctionContract } from './DutchAuctionContract.js';
export { LimitOrderContract } from './LimitOrderContract.js';
export { CrossChainHTLCContract } from './CrossChainHTLCContract.js';
export type { HTLCParams } from './CrossChainHTLCContract.js';

export { XmrAdaptorSwapContract } from './XmrAdaptorSwapContract.js';
export type { XmrAdaptorSwapParams } from './XmrAdaptorSwapContract.js';

// Solver — Fill & Cancel logic for third-party solver bots
export { DutchAuctionSolver } from './DutchAuctionSolver.js';
export type { DutchAuctionFillOptions, DutchAuctionCancelOptions } from './DutchAuctionSolver.js';

export { LimitOrderSolver } from './LimitOrderSolver.js';
export type { LimitOrderFillOptions, LimitOrderCancelOptions } from './LimitOrderSolver.js';

export type { SolverResult } from './DutchAuctionSolver.js';

// Re-export type from cashscript that consumers might need
export type { Contract, NetworkProvider } from 'cashscript';

