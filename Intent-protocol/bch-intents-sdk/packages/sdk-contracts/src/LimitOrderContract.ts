import { Contract, NetworkProvider, ElectrumNetworkProvider } from 'cashscript';
import {
    derivePkhFromAddress,
    formatCategoryForContract,
    LimitOrderParams,
    CovenantCompilationError
} from '@bch-intents/sdk-common';

import artifacts from '../artifacts/LimitOrderSwap.json' with { type: 'json' };

/**
 * Wrapper for the LimitOrderSwap.cash covenant.
 * Handles type-safe compilation and native PKH derivation.
 */
export class LimitOrderContract {
    /**
     * Compile a CashScript Contract instance for a Limit Order intent.
     * 
     * @param params - The Limit Order parameters
     * @param provider - CashScript NetworkProvider (Electrum, Mock, etc.)
     * @returns A compiled CashScript Contract instance
     * @throws {CovenantCompilationError} If compilation fails (e.g. invalid arguments)
     */
    static compile(params: LimitOrderParams, provider?: NetworkProvider): Contract {
        try {
            const makerPkh = derivePkhFromAddress(params.makerAddress);
            const sellCatLE = formatCategoryForContract(params.sellToken);
            const buyCatLE = formatCategoryForContract(params.buyToken);

            // Default expiry to 1 hour from now
            const expiryTime = params.expiryTime ?? BigInt(Math.floor(Date.now() / 1000) + 3600);
            const activeProvider = provider ?? new ElectrumNetworkProvider('mainnet');

            return new Contract(artifacts, [
                makerPkh,
                sellCatLE,
                buyCatLE,
                params.sellAmount,
                params.buyAmount,
                expiryTime,
            ], { provider: activeProvider });
        } catch (error) {
            throw new CovenantCompilationError('LimitOrderSwap', error);
        }
    }
}
