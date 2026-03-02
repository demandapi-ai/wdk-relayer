import { IntentBuilder, TokenId, Duration, RelayerClient } from '@bch-intents/sdk';
import { EmbeddedWalletAdapter } from '@bch-intents/sdk-wallet-adapter';

/**
 * Example 1: Embedded DEX UI Integration
 * 
 * This shows how a frontend developer uses the SDK to integrate BCH Intents Swap
 * directly into their dApp using an embedded wallet.
 */
async function placeDutchAuctionSwap() {
    // 1. Initialize the Relayer Client
    const relayer = new RelayerClient({ network: 'mainnet' });

    // 2. Wrap the dapp's embedded wallet in the standard BCHSigner interface
    // (walletManager is provided by the hypothetical bch-wallet-sdk Privy alternative)
    const walletManager = {} as any; // Mock
    const userId = "telegram_user_123";
    const signer = new EmbeddedWalletAdapter(walletManager, userId);

    console.log(`Connecting wallet: ${await signer.getAddress()}`);

    // 3. Build the Intent
    console.log('Building Dutch Auction intent...');
    const params = IntentBuilder.dutchAuction()
        .makerAddress(await signer.getAddress())
        .sellToken(TokenId.BCH)
        .buyToken(TokenId.fromCategory('1c29...')) // Category ID of the token they want
        .sellAmount(5_000_000n)          // 0.05 BCH
        .startBuyAmount(1000n)           // Will accept 1000 tokens immediately
        .endBuyAmount(800n)              // Price decays down to 800 tokens over time
        .duration(Duration.hours(1))     // 1 hour auction
        .build();

    // 4. Submit to Relayer (Computes contract address and stores in DB)
    const { intentId, contractAddress } = await relayer.createDutchAuction(params);
    console.log(`Intent ID: ${intentId}`);
    console.log(`Contract Address: ${contractAddress}`);

    // 5. Fund the Intent
    // This sends the user's funds into the covenant, activating the intent for solvers
    console.log('Funding intent contract...');
    const txid = await signer.send(contractAddress, params.sellAmount);
    console.log(`Funding TXID: ${txid}`);

    // 6. Listen for completion
    // Subscribe to the WebSocket to update the UI when a solver fills the order
    console.log('Waiting for solver...');
    const unsubscribe = relayer.listen((event) => {
        if (event.type === 'intent:filled' && event.data.intentId === intentId) {
            console.log(`🎉 Success! Solver filled your intent.`);
            console.log(`Fill TXID: ${event.data.txid}`);
            unsubscribe(); // Clean up WebSocket
        }
    });
}
