import { TestNetWallet } from 'mainnet-js';
import {
    RelayerClient,
    MainnetJSAdapter,
    IntentBuilder,
    TokenId,
    Duration
} from '@bch-intents/sdk';

async function runE2E() {
    console.log('[E2E] Generating fresh Chipnet wallet...');
    const wallet = await TestNetWallet.newRandom();
    const adapter = new MainnetJSAdapter(wallet);
    const address = await adapter.getAddress();

    console.log(`[E2E] Maker Wallet Ready: ${address}`);
    console.log('[E2E] Connecting to local RelayerClient...');

    // Assumes relayer is running locally on :3000
    const relayer = new RelayerClient({ network: 'mainnet' });

    console.log('[E2E] Constructing Limit Order...');
    // Create a mock intent for testing
    // We will use dummy token categories but real BCH amounts
    const sellTokenCat = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const buyTokenCat = 'BCH';

    const intentParams = IntentBuilder.limitOrder()
        .makerAddress(address)
        .sellToken(sellTokenCat)
        .buyToken(buyTokenCat)
        .sellAmount(1000n)
        .buyAmount(5000n)
        .build();

    console.log('[E2E] Intent Built:');
    console.log(JSON.stringify(intentParams, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
        2));

    try {
        console.log('[E2E] Submitting to Relayer...');
        const response = await relayer.createLimitOrder(intentParams);
        console.log(`[E2E] Success! Relayer returned Intent ID: ${response.intentId}`);
        console.log(`[E2E] Covenant Address to fund: ${response.contractAddress}`);

        console.log('[E2E] Connecting to WebSocket for fill notifications...');
        relayer.listen((data: any) => {
            console.log(`[E2E] \u26A1 NOTIFICATION: Intent ${data.intentId} has been filled!`);
            console.log(`[E2E] TxId: ${data.txid}`);
        });

    } catch (error: any) {
        if (error.name === 'RelayerUnreachableError') {
            console.log('\n[E2E WARNING] Relayer is offline! E2E gracefully handled the disconnect.');
            console.log('[E2E] To run full end-to-end, start the relayer process first (`npm run dev` in cashtoken-relayer)');
        } else {
            console.error('[E2E ERORR]', error);
        }
    }
}

runE2E().catch(console.error);
