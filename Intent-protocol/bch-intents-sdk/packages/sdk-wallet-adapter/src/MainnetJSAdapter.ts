import { BCHSigner } from './BCHSigner.js';
import { Wallet, TestNetWallet } from 'mainnet-js';
import { derivePkhFromAddress, stripHex } from '@bch-intents/sdk-common';

/**
 * Adapter wrapper for `mainnet-js` wallet instances.
 * Implements the `BCHSigner` interface so dapps using mainnet-js
 * can easily plug into the SDK.
 */
export class MainnetJSAdapter implements BCHSigner {
    constructor(private wallet: Wallet | TestNetWallet) { }

    async getAddress(): Promise<string> {
        // Handle API differences in mainnet-js versions
        if ('cashaddr' in this.wallet) {
            return (this.wallet as any).cashaddr;
        }
        return this.wallet.getDepositAddress();
    }

    async getPkh(): Promise<Uint8Array> {
        const address = await this.getAddress();
        return derivePkhFromAddress(address);
    }

    async getPublicKey(): Promise<Uint8Array> {
        return this.wallet.publicKeyCompressed;
    }

    async send(toAddress: string, satoshis: bigint, token?: { category: string; amount: bigint }): Promise<string> {
        const sendReq: any = {
            cashaddr: toAddress,
            value: Number(satoshis),
            unit: 'sat',
        };

        if (token) {
            sendReq.tokenId = stripHex(token.category);
            sendReq.tokenAmount = Number(token.amount);
        }

        const { txId } = await this.wallet.send([sendReq]);
        if (!txId) {
            throw new Error('Failed to broadcast transaction via mainnet-js');
        }
        return txId;
    }
}
