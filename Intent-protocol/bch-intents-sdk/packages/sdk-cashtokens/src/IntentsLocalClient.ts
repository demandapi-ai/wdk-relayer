import {
    DutchAuctionParams,
    LimitOrderParams,
    IntentType
} from '@bch-intents/sdk-common';
import {
    DutchAuctionContract,
    LimitOrderContract,
    Contract,
    NetworkProvider
} from '@bch-intents/sdk-contracts';

/**
 * High-level client for resolving intents locally.
 * This class handles compiling the contract covenants on the client side.
 * It does NOT handle network communication (use `sdk-order-book` for relayer HTTP).
 */
export class IntentsLocalClient {
    constructor(private provider?: NetworkProvider) { }

    /**
     * Compile a Dutch Auction intent locally.
     * @param params The configured Dutch Auction parameters
     * @returns The compiled CashScript Contract instance
     */
    compileDutchAuction(params: DutchAuctionParams): Contract {
        return DutchAuctionContract.compile(params, this.provider);
    }

    /**
     * Compile a Limit Order intent locally.
     * @param params The configured Limit Order parameters
     * @returns The compiled CashScript Contract instance
     */
    compileLimitOrder(params: LimitOrderParams): Contract {
        return LimitOrderContract.compile(params, this.provider);
    }

    /**
     * Reconstruct an existing contract.
     */
    compileFromType(type: IntentType, params: any): Contract {
        if (type === 'DUTCH_AUCTION') {
            return this.compileDutchAuction(params as DutchAuctionParams);
        } else {
            return this.compileLimitOrder(params as LimitOrderParams);
        }
    }
}
