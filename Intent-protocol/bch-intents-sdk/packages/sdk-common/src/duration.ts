// ============================================================================
// BCH Intents SDK — Duration Helpers
// ============================================================================
// Convenience functions for expressing time durations as bigint seconds.

/** Duration helper — converts human-readable time to bigint seconds */
export const Duration = {
    /** Convert seconds to bigint */
    seconds: (n: number): bigint => BigInt(n),

    /** Convert minutes to bigint seconds */
    minutes: (n: number): bigint => BigInt(n * 60),

    /** Convert hours to bigint seconds */
    hours: (n: number): bigint => BigInt(n * 3600),

    /** Convert days to bigint seconds */
    days: (n: number): bigint => BigInt(n * 86400),
} as const;
