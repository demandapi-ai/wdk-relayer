import test from 'node:test';
import assert from 'node:assert';
import { generateSecret, hashSecret } from '../src/htlc.js';

test('@bch-intents/sdk-cross-chain HTLC cryptography', async (t) => {
    await t.test('generateSecret produces 32 bytes', () => {
        const secret = generateSecret();
        assert.strictEqual(secret.length, 32);
        assert.strictEqual(secret instanceof Uint8Array, true);
    });

    await t.test('hashSecret strictly generates unique sha256 output', () => {
        const secret1 = generateSecret();
        const secret2 = generateSecret();

        const hash1 = hashSecret(secret1);
        const hash2 = hashSecret(secret2);

        assert.strictEqual(hash1.length, 32);
        assert.notStrictEqual(
            Buffer.from(hash1).toString('hex'),
            Buffer.from(hash2).toString('hex')
        );
    });
});
