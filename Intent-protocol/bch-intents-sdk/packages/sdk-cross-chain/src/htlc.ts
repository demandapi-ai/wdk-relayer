import crypto from 'crypto';

/**
 * Generate a cryptographically secure 32-byte secret for HTLCs.
 */
export function generateSecret(): Uint8Array {
    return new Uint8Array(crypto.randomBytes(32));
}

/**
 * Hash a secret using SHA-256 for HTLC commitments.
 */
export function hashSecret(secret: Uint8Array): Uint8Array {
    return new Uint8Array(crypto.createHash('sha256').update(secret).digest());
}

/**
 * Recommends safe relative timelocks based on standard block times.
 */
export const HTLCTimelocks = {
    /** 
     * Target chain: Solana or Movement. 
     * Source chain: BCH execution.
     * We give the solver wide margins on Solana since block times are instant.
     */
    bchToSolana: {
        /** Sender locks BCH for 10 blocks (~1.6 hours) */
        senderLockBlocks: 10n,
        /** Solver locks SOL for 45 minutes on Solana */
        solverLockSeconds: 2700n,
    }
};
