import test from 'node:test';
import assert from 'node:assert';
import {
    reverseHex,
    stripHex,
    derivePkhFromAddress,
    formatCategoryForContract
} from '../src/utils.js';
import { TokenId } from '../src/token.js';
import { IntentError } from '../src/errors.js';

test('@bch-intents/sdk-common utils', async (t) => {

    await t.test('stripHex removes 0x prefix', () => {
        assert.strictEqual(stripHex('0x1234abcd'), '1234abcd');
        assert.strictEqual(stripHex('1234abcd'), '1234abcd');
    });

    await t.test('reverseHex reverses byte pairs', () => {
        assert.strictEqual(reverseHex('1234abcd'), 'cdab3412');
        assert.strictEqual(reverseHex('0x1234abcd'), 'cdab3412'); // implicitly strips 0x
    });

    await t.test('derivePkhFromAddress handles mainnet addresses', () => {
        // Known valid mainnet P2PKH address
        const pkh = derivePkhFromAddress('bitcoincash:qzcsj9hau5r9q30syl9lyqp7v0zpxrtx9c0y980etu');
        assert.strictEqual(pkh.length, 20); // standard p2pkh length
    });

    await t.test('derivePkhFromAddress handles testnet addresses', () => {
        // Known valid testnet P2PKH address
        const pkh = derivePkhFromAddress('bchtest:qzjctv2czevahmejt5ryvrftflqlgrdwcyzc3cu6v8');
        assert.strictEqual(pkh.length, 20);
    });

    await t.test('formatCategoryForContract reverses and pads standard categories', () => {
        const token = TokenId.fromCategory('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
        const formatted = formatCategoryForContract(token.category);
        assert.strictEqual(formatted, '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'); // 64 chars of B reversed is still B, + 0x
    });
});

test('@bch-intents/sdk-common TokenId', async (t) => {
    await t.test('TokenId defaults parameterless config to BCH', () => {
        assert.strictEqual(TokenId.BCH.category, 'BCH');
        assert.strictEqual(TokenId.BCH.isBch, true);
    });

    await t.test('TokenId strictly requires 64 char hex categories', () => {
        assert.throws(() => {
            TokenId.fromCategory('123abc');
        }, IntentError);
        assert.throws(() => {
            TokenId.fromCategory('NOTBCH');
        }, IntentError);
    });
});
