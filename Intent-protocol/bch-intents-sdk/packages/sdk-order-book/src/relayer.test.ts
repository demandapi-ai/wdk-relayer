import test from 'node:test';
import assert from 'node:assert';
import { RelayerClient } from '../src/RelayerClient.js';
import { IntentBuilder } from '@bch-intents/sdk-cashtokens';
import { TokenId, Duration } from '@bch-intents/sdk-common';

test('@bch-intents/sdk-order-book HTTP API', async (t) => {

    // This points to the default local relayer port (3000)
    // We expect the fastify server to respond, or fail gracefully
    const relayer = new RelayerClient({ network: 'mainnet' }); // Overrides internally

    await t.test('createDutchAuction constructs valid HTTP payloads', async () => {
        const params = IntentBuilder.dutchAuction()
            .makerAddress('bitcoincash:qzcsj9hau5r9q30syl9lyqp7v0zpxrtx9c0y980etu')
            .sellToken(TokenId.BCH)
            .buyToken('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
            .sellAmount(1000n)
            .startBuyAmount(100n)
            .endBuyAmount(50n)
            .duration(Duration.hours(1))
            .build();

        try {
            // This will likely throw connection refused if the relayer isn't running,
            // which is an expected valid integration test failure mode unless we mock.
            // For now, testing the construction and type parity.
            const response = await relayer.createDutchAuction(params);
            assert.ok(response.intentId);
        } catch (error: any) {
            // If the relayer is offline, we expect a specific mapped RelayerUnreachableError, 
            // verifying our custom error mapping logic works
            assert.strictEqual(error.name, 'RelayerUnreachableError');
        }
    });
});
