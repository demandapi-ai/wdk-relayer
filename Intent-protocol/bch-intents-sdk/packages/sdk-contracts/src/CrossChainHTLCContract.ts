import { Contract, NetworkProvider } from 'cashscript';
import { CovenantCompilationError } from '@bch-intents/sdk-common';

import artifacts from '../artifacts/CrossChainHTLC.json' with { type: 'json' };

export interface HTLCParams {
    /** Maker's public key hash (bytes) */
    makerPkh: Uint8Array;
    /** Taker's public key hash (bytes) */
    takerPkh: Uint8Array;
    /** SHA-256 hash of the 32-byte secret */
    secretHash: Uint8Array;
    /** Sequence number for relative timelock (BIP68/112 blocks or seconds) */
    timelock: bigint;
}

/**
 * Wrapper for the CrossChainHTLC.cash covenant.
 */
export class CrossChainHTLCContract {
    /**
     * Compile an HTLC CashScript Contract instance.
     * 
     * @param params - The HTLC constructor parameters
     * @param provider - CashScript NetworkProvider
     */
    static compile(params: HTLCParams, provider?: NetworkProvider): Contract {
        try {
            return new Contract(artifacts, [
                params.makerPkh,
                params.takerPkh,
                params.secretHash,
                params.timelock,
            ], { provider });
        } catch (error) {
            throw new CovenantCompilationError('CrossChainHTLC', error);
        }
    }
}
