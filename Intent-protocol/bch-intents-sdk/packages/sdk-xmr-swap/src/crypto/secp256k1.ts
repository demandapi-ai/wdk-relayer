import { secp256k1 } from '@noble/curves/secp256k1';

/**
 * Generates a new random Secp256k1 private key.
 */
export function generateSecp256k1Keypair() {
    const privKey = secp256k1.utils.randomPrivateKey();
    const pubKey = secp256k1.getPublicKey(privKey);
    return {
        privateKey: privKey,
        publicKey: pubKey
    };
}

/**
 * Multiplies the Secp256k1 base point (G) by a scalar value.
 * Assumes the scalar is a valid bigint within the curve order.
 * 
 * Returns the uncompressed public point (65 bytes) or compressed (33 bytes).
 */
export function scalarMultiplyBasePoint(scalar: bigint, compressed = true): Uint8Array {
    const point = secp256k1.ProjectivePoint.BASE.multiply(scalar);
    return point.toRawBytes(compressed);
}

/**
 * Subtracts Point B from Point A (A - B) on the Secp256k1 curve.
 */
export function pointSubtract(pointA: Uint8Array, pointB: Uint8Array, compressed = true): Uint8Array {
    const pA = secp256k1.ProjectivePoint.fromHex(pointA);
    const pB = secp256k1.ProjectivePoint.fromHex(pointB);

    const pResult = pA.subtract(pB);
    return pResult.toRawBytes(compressed);
}

/**
 * Subtracts Scalar B from Scalar A (A - B) modulo the Secp256k1 curve order.
 * This is used for extracting the hidden piece of the signature.
 */
export function scalarSubtract(scalarA: bigint, scalarB: bigint): bigint {
    const ORDER = secp256k1.CURVE.n;

    // (A - B) mod N
    let result = (scalarA - scalarB) % ORDER;
    if (result < 0n) {
        result += ORDER;
    }

    return result;
}
