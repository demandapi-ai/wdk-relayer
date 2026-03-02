import test from 'node:test';
import assert from 'node:assert';
import { DutchAuctionContract, LimitOrderContract } from '../src/index.js';
import { TokenId, Duration } from '@bch-intents/sdk-common';

test('@bch-intents/sdk-contracts compilation', async (t) => {

    // Valid P2PKH address
    const dummyMaker = 'bitcoincash:qzcsj9hau5r9q30syl9lyqp7v0zpxrtx9c0y980etu';

    await t.test('DutchAuctionContract compiles successfully to a valid address', () => {
        const contract = DutchAuctionContract.compile({
            makerAddress: dummyMaker,
            sellToken: 'BCH',
            buyToken: TokenId.fromCategory('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb').category,
            sellAmount: 1000n,
            startBuyAmount: 100n,
            endBuyAmount: 50n,
            duration: Duration.hours(1)
        });

        // The artifact returns an address
        assert.ok(contract.address);
        assert.ok(contract.address.startsWith('bitcoincash:'));

        // Ensure tokenAddress exists for CashTokens targeting
        assert.ok(contract.tokenAddress);
    });

    await t.test('LimitOrderContract compiles successfully to a valid address', () => {
        const contract = LimitOrderContract.compile({
            makerAddress: dummyMaker,
            sellToken: TokenId.fromCategory('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa').category,
            buyToken: 'BCH',
            sellAmount: 500n,
            buyAmount: 10000n,
            expiryTime: BigInt(Math.floor(Date.now() / 1000)) + Duration.hours(24) // 24 hours from now
        });

        assert.ok(contract.address);
        assert.ok(contract.tokenAddress);
    });
});
