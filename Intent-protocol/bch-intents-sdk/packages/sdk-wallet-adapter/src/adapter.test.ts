import test from 'node:test';
import assert from 'node:assert';
import { MainnetJSAdapter } from '../src/MainnetJSAdapter.js';
import { TestNetWallet } from 'mainnet-js';

test('@bch-intents/sdk-wallet-adapter integration bindings', async (t) => {

    // Create an ephemeral testnet wallet for testing
    const testWallet = await TestNetWallet.newRandom();
    const adapter = new MainnetJSAdapter(testWallet);

    await t.test('getAddress routes to the underlying wallet', async () => {
        const address = await adapter.getAddress();
        assert.ok(address.startsWith('bchtest:'));
        assert.strictEqual(address, testWallet.getDepositAddress()); // Ensure parity
    });

    await t.test('getPkh derives a 20-byte hash correctly', async () => {
        const pkh = await adapter.getPkh();
        // Since we tested the internal derivePkh logic in sdk-common, 
        // we just ensure the integration adapter surfaces a 20 byte array
        assert.strictEqual(pkh.length, 20);
        assert.strictEqual(pkh instanceof Uint8Array, true);
    });

    /**
     * NOTE: We bypass testing active `send()` here because it would require
     * hitting live Chipnet nodes and managing tBCH faucets inside the CI pipeline.
     */
});
