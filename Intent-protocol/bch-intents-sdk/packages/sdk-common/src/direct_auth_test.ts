import test from 'node:test';
import { cashAddressToLockingBytecode } from '@bitauth/libauth';
import assert from 'node:assert';

test('libauth direct mapping', () => {
    // Valid test vectors directly from libauth examples
    const result1 = cashAddressToLockingBytecode('bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0q9b8dqc');
    assert.strictEqual(typeof result1 !== 'string', true);

    const result2 = cashAddressToLockingBytecode('bchtest:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y9pnhp5y3');
    assert.strictEqual(typeof result2 !== 'string', true);
});
