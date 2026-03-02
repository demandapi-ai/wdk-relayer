import { BCHSigner } from './BCHSigner.js';
import { derivePkhFromAddress, stripHex } from '@bch-intents/sdk-common';

/** 
 * Minimal interface expecting the methods available on the WalletManager
 * from the local `bch-wallet-sdk` (the Privy alternative).
 */
export interface EmbeddedWalletManager {
    getWalletInfo(id: string): Promise<{ address: string; publicKey: string }>;
    sendBCH(params: { userId: string; toAddress: string; amountSats: number }): Promise<{ txId: string }>;
    sendToken(params: { userId: string; toAddress: string; tokenId: string; amount: number }): Promise<{ txId: string }>;
}

/**
 * Adapter wrapper for the custom `bch-wallet-sdk` Embedded Wallet SDK.
 * Binds a specific user ID to the WalletManager to act as a signer.
 */
export class EmbeddedWalletAdapter implements BCHSigner {
    constructor(
        private walletManager: EmbeddedWalletManager,
        private userId: string
    ) { }

    async getAddress(): Promise<string> {
        const info = await this.walletManager.getWalletInfo(this.userId);
        return info.address;
    }

    async getPkh(): Promise<Uint8Array> {
        const address = await this.getAddress();
        return derivePkhFromAddress(address);
    }

    async getPublicKey(): Promise<Uint8Array> {
        const info = await this.walletManager.getWalletInfo(this.userId);
        // Assuming publicKey is returned as hex string, convert to Uint8Array:
        const hex = stripHex(info.publicKey || '');
        return new Uint8Array(hex.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || []);
    }

    async send(toAddress: string, satoshis: bigint, token?: { category: string; amount: bigint }): Promise<string> {
        if (token) {
            // Priority: send token (which usually carries nominal BCH dust too)
            const res = await this.walletManager.sendToken({
                userId: this.userId,
                toAddress,
                tokenId: stripHex(token.category),
                amount: Number(token.amount)
            });
            return res.txId;
        } else {
            // Send pure BCH
            const res = await this.walletManager.sendBCH({
                userId: this.userId,
                toAddress,
                amountSats: Number(satoshis)
            });
            return res.txId;
        }
    }
}
