import test from 'node:test';
import assert from 'node:assert';
import { IntentBuilder } from '../src/IntentBuilder.js';
import { TokenId, MissingParameterError, Duration } from '@bch-intents/sdk-common';

test('@bch-intents/sdk-cashtokens IntentBuilder', async (t) => {

    await t.test('LimitOrderBuilder successfully constructs valid params', () => {
        const params = IntentBuilder.limitOrder()
            .makerAddress('bitcoincash:qp...')
            .sellToken(TokenId.BCH)
            .buyToken('abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd')
            .sellAmount(1000n)
            .buyAmount(500n)
            .build();

        assert.strictEqual(params.makerAddress, 'bitcoincash:qp...');
        assert.strictEqual(params.sellToken, 'BCH');
        assert.strictEqual(params.buyAmount, 500n);
    });

    await t.test('LimitOrderBuilder throws on missing required param', () => {
        const builder = IntentBuilder.limitOrder()
            .makerAddress('bitcoincash:qp...')
            .sellToken(TokenId.BCH);

        assert.throws(() => {
            builder.build();
        }, MissingParameterError);
    });

    await t.test('DutchAuctionBuilder constructs with decaying price properties', () => {
        const params = IntentBuilder.dutchAuction()
            .makerAddress('bitcoincash:qp...')
            .sellToken(TokenId.BCH)
            .buyToken('abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd')
            .sellAmount(1000n)
            .startBuyAmount(100n)
            .endBuyAmount(50n)
            .duration(Duration.hours(1))
            .build();

        assert.strictEqual(params.duration, 3600n);
        assert.strictEqual(params.startBuyAmount, 100n);
        assert.strictEqual(params.endBuyAmount, 50n);
    });
});
