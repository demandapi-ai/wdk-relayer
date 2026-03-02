// ============================================================================
// BCH Intents SDK — Error Classes
// ============================================================================
// Typed error classes for clear, actionable error handling.
// Replaces generic `catch (e: any)` with `instanceof` checks.

/** Base error for all BCH Intents SDK errors */
export class IntentError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'IntentError';
    }
}

/** The relayer API is unreachable */
export class RelayerUnreachableError extends IntentError {
    readonly url: string;
    readonly retryAfter: number;

    constructor(url: string, retryAfter: number = 5000) {
        super(`Relayer unreachable at ${url}. Retry after ${retryAfter}ms.`);
        this.name = 'RelayerUnreachableError';
        this.url = url;
        this.retryAfter = retryAfter;
    }
}

/** An intent with the specified ID was not found */
export class IntentNotFoundError extends IntentError {
    readonly intentId: string;

    constructor(intentId: string) {
        super(`Intent not found: ${intentId}`);
        this.name = 'IntentNotFoundError';
        this.intentId = intentId;
    }
}

/** The provided token category hex is invalid */
export class InvalidTokenCategoryError extends IntentError {
    readonly category: string;

    constructor(category: string) {
        super(`Invalid token category: ${category}. Expected 64-character hex string or 'BCH'.`);
        this.name = 'InvalidTokenCategoryError';
        this.category = category;
    }
}

/** Not enough funds to complete the operation */
export class InsufficientFundsError extends IntentError {
    readonly required: bigint;
    readonly available: bigint;

    constructor(required: bigint, available: bigint) {
        super(`Insufficient funds: need ${required}, have ${available}`);
        this.name = 'InsufficientFundsError';
        this.required = required;
        this.available = available;
    }
}

/** CashScript covenant compilation failed */
export class CovenantCompilationError extends IntentError {
    readonly contractName: string;
    readonly cause: unknown;

    constructor(contractName: string, cause: unknown) {
        const msg = cause instanceof Error ? cause.message : String(cause);
        super(`Failed to compile ${contractName}: ${msg}`);
        this.name = 'CovenantCompilationError';
        this.contractName = contractName;
        this.cause = cause;
    }
}

/** The intent has expired and can no longer be filled */
export class IntentExpiredError extends IntentError {
    readonly intentId: string;
    readonly expiryTime: number;

    constructor(intentId: string, expiryTime: number) {
        super(`Intent ${intentId} expired at ${new Date(expiryTime * 1000).toISOString()}`);
        this.name = 'IntentExpiredError';
        this.intentId = intentId;
        this.expiryTime = expiryTime;
    }
}

/** Required parameter is missing */
export class MissingParameterError extends IntentError {
    readonly paramName: string;

    constructor(paramName: string) {
        super(`Missing required parameter: ${paramName}`);
        this.name = 'MissingParameterError';
        this.paramName = paramName;
    }
}
