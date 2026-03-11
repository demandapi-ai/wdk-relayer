import { ed25519 } from '@noble/curves/ed25519';

/**
 * Generates a new random Ed25519 private key (Monero spend key equivalent).
 */
export function generateEd25519Keypair() {
    const privKey = ed25519.utils.randomPrivateKey();
    const pubKey = ed25519.getPublicKey(privKey);
    return {
        privateKey: privKey,
        publicKey: pubKey
    };
}

/**
 * Hashes an arbitrary payload into a valid scalar on the Ed25519 curve.
 */
export function hashToEd25519Scalar(data: Uint8Array): bigint {
    return ed25519.utils.hashToPrivateKey(data);
}
