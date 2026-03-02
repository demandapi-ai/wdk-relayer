// ============================================================================
// BCH Intents SDK — Token ID Helper
// ============================================================================
// Type-safe token identification for CashTokens and native BCH.

import { stripHex } from './utils.js';
import { IntentError } from './errors.js';

/**
 * Represents a token identifier — either native BCH or a CashToken category.
 *
 * CashTokens on BCH are protocol-level primitives identified by a 32-byte
 * category ID. Unlike ERC-20 tokens, there is no per-token contract logic.
 * If a swap works with any one CashToken category, it works with ALL of them.
 *
 * @example
 * const bch = TokenId.BCH;
 * const musd = TokenId.fromCategory('abcd1234...');
 */
export class TokenId {
    /** Native BCH (no CashToken) */
    static readonly BCH = new TokenId('BCH');

    /** The raw category hex string, or 'BCH' for native */
    readonly category: string;

    private constructor(category: string) {
        this.category = category;
    }

    /**
     * Create a TokenId from a CashToken category ID (32-byte hex).
     * Accepts with or without '0x' prefix.
     *
     * @example
     * TokenId.fromCategory('abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234')
     */
    static fromCategory(categoryHex: string): TokenId {
        const raw = stripHex(categoryHex);
        if (raw.length === 0) return TokenId.BCH;
        if (!/^[0-9a-fA-F]+$/.test(raw)) {
            throw new IntentError(`Invalid token category hex: ${categoryHex}`);
        }
        if (raw.length !== 64) {
            throw new IntentError(`Token category must be exactly 32 bytes (64 hex characters), got ${raw.length}`);
        }
        return new TokenId(raw);
    }

    /** Whether this is native BCH (not a CashToken) */
    get isBch(): boolean {
        return this.category === 'BCH';
    }

    /** Get the raw category string for API/contract use */
    toString(): string {
        return this.category;
    }
}
