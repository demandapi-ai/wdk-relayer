import { computeAdaptorPoint, extractXmrKey, bigintToBytes32 } from './AdaptorSignature.js';
import { generateSecp256k1Keypair } from './crypto/secp256k1.js';
import { generateEd25519Keypair } from './crypto/ed25519.js';

export class XmrSwapOrchestrator {
    /**
     * Maker Flow (BCH -> XMR):
     * The Maker locks BCH, giving the Solver a PTLC. 
     * To do this, the Maker needs an Adaptor Point (T) which is based on the Maker's XMR spend key.
     */
    static lockBchFundAndGenerateT(xmrSpendKeyPrivate: Uint8Array) {
        // T_nonce = s * G
        const tPoint = computeAdaptorPoint(xmrSpendKeyPrivate);

        return {
            adaptorPointHex: Buffer.from(tPoint).toString('hex'),
            adaptorPointBytes: tPoint
        };
    }

    /**
     * Taker Flow (XMR -> BCH):
     * The Solver provides XMR to the Maker's destination on the Monero stagenet.
     * The Maker releases the BCH by broadcasting the PTLC claim, which accidentally reveals their XMR key.
     * 
     * The Solver extracts the key from the BCH transaction signature.
     */
    static discoverXmrSpendKeyFromBchSignature(bchSignatureScalarHex: string, adaptorNonceHex: string): Uint8Array {
        const sigScalar = BigInt(`0x${bchSignatureScalarHex}`);
        const nonceScalar = BigInt(`0x${adaptorNonceHex}`);

        // S_xmr = Sig_bch - T_nonce
        const extractedKeyBigInt = extractXmrKey(sigScalar, nonceScalar);

        // Convert the big integer back to the 32-byte Monero key
        return bigintToBytes32(extractedKeyBigInt);
    }
}
