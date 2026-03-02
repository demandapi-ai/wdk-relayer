import {
    DutchAuctionParams,
    LimitOrderParams,
    TokenId,
    MissingParameterError,
    Duration
} from '@bch-intents/sdk-common';

/**
 * Type-safe builder for Limit Order Intents.
 */
export class LimitOrderBuilder {
    private params: Partial<LimitOrderParams> = {};

    sellToken(token: TokenId | string): this {
        this.params.sellToken = token instanceof TokenId ? token.category : token;
        return this;
    }

    buyToken(token: TokenId | string): this {
        this.params.buyToken = token instanceof TokenId ? token.category : token;
        return this;
    }

    sellAmount(amount: bigint): this {
        this.params.sellAmount = amount;
        return this;
    }

    buyAmount(amount: bigint): this {
        this.params.buyAmount = amount;
        return this;
    }

    makerAddress(address: string): this {
        this.params.makerAddress = address;
        return this;
    }

    expiryTime(timestampUnixSeconds: bigint): this {
        this.params.expiryTime = timestampUnixSeconds;
        return this;
    }

    build(): LimitOrderParams {
        if (!this.params.makerAddress) throw new MissingParameterError('makerAddress');
        if (this.params.sellToken === undefined) throw new MissingParameterError('sellToken');
        if (this.params.buyToken === undefined) throw new MissingParameterError('buyToken');
        if (this.params.sellAmount === undefined) throw new MissingParameterError('sellAmount');
        if (this.params.buyAmount === undefined) throw new MissingParameterError('buyAmount');

        return this.params as LimitOrderParams;
    }
}

/**
 * Type-safe builder for Dutch Auction Intents.
 */
export class DutchAuctionBuilder {
    private params: Partial<DutchAuctionParams> = {};

    sellToken(token: TokenId | string): this {
        this.params.sellToken = token instanceof TokenId ? token.category : token;
        return this;
    }

    buyToken(token: TokenId | string): this {
        this.params.buyToken = token instanceof TokenId ? token.category : token;
        return this;
    }

    sellAmount(amount: bigint): this {
        this.params.sellAmount = amount;
        return this;
    }

    startBuyAmount(amount: bigint): this {
        this.params.startBuyAmount = amount;
        return this;
    }

    endBuyAmount(amount: bigint): this {
        this.params.endBuyAmount = amount;
        return this;
    }

    duration(seconds: bigint): this {
        this.params.duration = seconds;
        return this;
    }

    makerAddress(address: string): this {
        this.params.makerAddress = address;
        return this;
    }

    build(): DutchAuctionParams {
        if (!this.params.makerAddress) throw new MissingParameterError('makerAddress');
        if (this.params.sellToken === undefined) throw new MissingParameterError('sellToken');
        if (this.params.buyToken === undefined) throw new MissingParameterError('buyToken');
        if (this.params.sellAmount === undefined) throw new MissingParameterError('sellAmount');
        if (this.params.startBuyAmount === undefined) throw new MissingParameterError('startBuyAmount');
        if (this.params.endBuyAmount === undefined) throw new MissingParameterError('endBuyAmount');

        return this.params as DutchAuctionParams;
    }
}

/**
 * Factory for creating intent builders.
 * 
 * @example
 * const params = IntentBuilder.dutchAuction()
 *     .makerAddress('bitcoincash:qp...')
 *     .sellToken(TokenId.BCH)
 *     .buyToken(TokenId.fromCategory('abcd...'))
 *     .sellAmount(10000n)
 *     .startBuyAmount(500n)
 *     .endBuyAmount(400n)
 *     .duration(Duration.hours(1))
 *     .build();
 */
export const IntentBuilder = {
    limitOrder: () => new LimitOrderBuilder(),
    dutchAuction: () => new DutchAuctionBuilder(),
};
