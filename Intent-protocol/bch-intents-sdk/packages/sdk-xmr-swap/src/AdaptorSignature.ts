import { scalarMultiplyBasePoint, scalarSubtract } from './crypto/secp256k1.js';
import { hashToEd25519Scalar } from './crypto/ed25519.js';

/**
 * Computes the Adaptor Point T on the Secp256k1 curve (for Bitcoin Cash).
 * T = s * G, where `s` is the XMR secret (which is on Ed25519, but treated as a plain integer here).
 * 
 * @param xmrSpendKeyPrivate The raw 32-byte Monero spend key (or secret scalar).
 * @returns The 33-byte compressed Secp256k1 public point (T).
 */
export function computeAdaptorPoint(xmrSpendKeyPrivate: Uint8Array): Uint8Array {
    // Convert the 32-byte Array to a BigInt (Little Endian format usually, but depending on noble-crypto's expectations)
    // For noble secp256k1, scalars are usually passed as BigInt.

    // We convert the byte array to a hex string, then to a BigInt (Big Endian standard for Secp256k1)
    const privHex = Buffer.from(xmrSpendKeyPrivate).toString('hex');
    const scalarInt = BigInt(`0x${privHex}`);

    // T = s * G
    return scalarMultiplyBasePoint(scalarInt, true);
}

/**
 * Extracts the hidden XMR secret from the revealed BCH signature.
 * S_xmr = Sig_bch - T_nonce  (simplified math wrapper)
 * 
 * @param signatureScalar The `s` value of the revealed ECDSA/Schnorr signature (BigInt).
 * @param adaptorScalar The original `t` nonce used to construct the adaptor (BigInt).
 * @returns The extracted Monero secret (BigInt).
 */
export function extractXmrKey(signatureScalar: bigint, adaptorScalar: bigint): bigint {
    return scalarSubtract(signatureScalar, adaptorScalar);
}

/**
 * Helper to convert BigInt back to a 32-byte Uint8Array.
 */
export function bigintToBytes32(val: bigint): Uint8Array {
    let hex = val.toString(16);
    if (hex.length % 2 !== 0) {
        hex = '0' + hex;
    }
    const buf = Buffer.from(hex, 'hex');
    const result = new Uint8Array(32);
    // Pad to 32 bytes (prepend zeros if needed)
    result.set(buf, 32 - buf.length);
    return result;
}
