// ============================================================================
// BCH Intents SDK — Utility Functions
// ============================================================================
// Extracted from cashtoken-relayer/src/index.ts and standardized.
// These are pure functions with no side effects.

import { cashAddressToLockingBytecode } from '@bitauth/libauth';

/**
 * Reverse the byte order of a hex string.
 * Used to convert between big-endian (display) and little-endian (CashScript contract) formats.
 *
 * @example
 * reverseHex('0102030405') // → '0504030201'
 */
export function reverseHex(hex: string): string {
    const cleanHex = stripHex(hex);
    const matched = cleanHex.match(/.{2}/g);
    if (!matched) throw new Error(`Invalid hex string: ${cleanHex}`);
    return matched.reverse().join('');
}

/**
 * Strip the '0x' prefix from a hex string if present.
 *
 * @example
 * stripHex('0xabcd1234') // → 'abcd1234'
 * stripHex('abcd1234')   // → 'abcd1234'
 */
export function stripHex(s: string): string {
    return s.startsWith('0x') ? s.slice(2) : s;
}

/**
 * Derive the 20-byte public key hash (PKH) from a BCH cashaddr.
 * Works for both `bchtest:qp...` and `bitcoincash:qp...` formats.
 *
 * Uses libauth to decode the address and extract the P2PKH hash.
 *
 * @throws Error if the address is invalid or not a standard P2PKH address
 */
export function derivePkhFromAddress(address: string): Uint8Array {
    const result = cashAddressToLockingBytecode(address);
    if (typeof result === 'string') {
        throw new Error(`Invalid BCH address (${address}): ${result}`);
    }
    const bytecode = result.bytecode;
    // P2PKH locking bytecode: OP_DUP OP_HASH160 OP_PUSHBYTES_20 <20-byte-hash> OP_EQUALVERIFY OP_CHECKSIG
    // Hex:                     76     a9          14              <hash>          88              ac
    if (bytecode.length === 25 && bytecode[0] === 0x76 && bytecode[1] === 0xa9 && bytecode[2] === 0x14) {
        return bytecode.slice(3, 23);
    }
    throw new Error(`Not a standard P2PKH address (bytecode length=${bytecode.length})`);
}

/**
 * Format a token category ID for use in CashScript contract constructors.
 * Converts raw big-endian hex to little-endian with '0x' prefix.
 * Returns '0x' for native BCH (empty category).
 *
 * @example
 * formatCategoryForContract('abcd1234...') // → '0x...4321dcba' (LE)
 * formatCategoryForContract('BCH')         // → '0x'
 * formatCategoryForContract('')            // → '0x'
 */
export function formatCategoryForContract(category: string): string {
    const raw = (category === 'BCH' || category === '') ? '' : stripHex(category);
    return raw ? `0x${reverseHex(raw)}` : '0x';
}

/**
 * Format a token category ID for use in the solver registry.
 * Returns raw big-endian hex with '0x' prefix.
 * This matches the format returned by UTXO scanners (utxo.token.category).
 *
 * @example
 * formatCategoryForRegistry('abcd1234')  // → '0xabcd1234'
 * formatCategoryForRegistry('BCH')       // → '0x'
 */
export function formatCategoryForRegistry(category: string): string {
    const raw = (category === 'BCH' || category === '') ? '' : stripHex(category);
    return raw ? `0x${raw}` : '0x';
}

/**
 * Generate a unique intent ID.
 *
 * @example
 * generateIntentId() // → 'intent_1709500000_a1b2c3'
 */
export function generateIntentId(): string {
    return `intent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
