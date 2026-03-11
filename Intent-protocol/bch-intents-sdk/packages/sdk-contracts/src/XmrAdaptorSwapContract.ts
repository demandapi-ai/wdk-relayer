import { Contract, NetworkProvider } from 'cashscript';
import { CovenantCompilationError } from '@bch-intents/sdk-common';

// Note: Ensure the TS config allows importing JSON modules
import artifacts from '../artifacts/XmrAdaptorSwap.json' with { type: 'json' };

export interface XmrAdaptorSwapParams {
    /** Recipient's public key hash (who claims the funds and reveals the secret) */
    recipientPkh: Uint8Array;
    /** Sender's public key hash (who locks the funds & can refund) */
    senderPkh: Uint8Array;
    /** Unix timestamp when the swap expires and sender can refund */
    timelock: bigint;
}

/**
 * Wrapper for the XmrAdaptorSwap.cash covenant.
 */
export class XmrAdaptorSwapContract {
    /**
     * Compile an XMR-BCH Swap CashScript Contract instance.
     * 
     * @param params - The Adaptor Swap constructor parameters
     * @param provider - CashScript NetworkProvider
     */
    static compile(params: XmrAdaptorSwapParams, provider?: NetworkProvider): Contract {
        try {
            return new Contract(artifacts as any, [
                params.recipientPkh,
                params.senderPkh,
                params.timelock,
            ], { provider });
        } catch (error) {
            throw new CovenantCompilationError('XmrAdaptorSwap', error);
        }
    }
}
