import {
    Contract,
    TransactionBuilder,
    SignatureTemplate,
} from 'cashscript';
import type { Utxo } from 'cashscript';
import {
    DutchAuctionParams,
    derivePkhFromAddress,
    stripHex,
    InsufficientFundsError,
} from '@bch-intents/sdk-common';
import { createHash } from 'crypto';

// ============================================================================
// DutchAuctionSolver — Fill and Cancel logic for DutchAuctionSwap covenants
// ============================================================================
// Enables third parties to build solver bots using just the SDK.
// Extracted from cashtoken-relayer/src/bot/DutchAuctionExecutor.ts.

/** Options for filling a Dutch Auction */
export interface DutchAuctionFillOptions {
    /** Compiled CashScript Contract (from DutchAuctionContract.compile()) */
    contract: Contract;
    /** The funded covenant UTXO holding the sell tokens */
    contractUtxo: Utxo;
    /** The original Dutch Auction parameters */
    params: DutchAuctionParams;
    /** Solver's private key in WIF format */
    solverWif: string;
    /** Solver's BCH UTXOs for paying the buy price + fees */
    solverUtxos: Utxo[];
}

/** Options for cancelling a Dutch Auction */
export interface DutchAuctionCancelOptions {
    /** Compiled CashScript Contract */
    contract: Contract;
    /** The funded covenant UTXO to reclaim */
    contractUtxo: Utxo;
    /** Maker's private key in WIF format */
    makerWif: string;
    /** Maker's BCH cashaddr to send reclaimed funds to */
    makerAddress: string;
}

/** Result of a fill or cancel operation */
export interface SolverResult {
    /** Transaction ID of the broadcast transaction */
    txid: string;
    /** Price paid by the solver (for fills) */
    pricePaid?: bigint;
}

export class DutchAuctionSolver {

    // =========================================================================
    // getCurrentPrice — Calculate the current Dutch Auction price
    // =========================================================================
    /**
     * Calculate the current price of a Dutch Auction based on the linear decay.
     *
     * @param params - The Dutch Auction parameters
     * @param atTime - Unix timestamp to calculate price at (defaults to now)
     * @returns The current buy price in the smallest unit
     */
    static getCurrentPrice(params: DutchAuctionParams, atTime?: number): bigint {
        const now = BigInt(atTime ?? Math.floor(Date.now() / 1000));
        const startTime = BigInt(Math.floor(Date.now() / 1000)); // compile() sets startTime to now
        const duration = params.duration ?? 3600n;

        let price = params.startBuyAmount;

        if (now >= startTime + duration) {
            price = params.endBuyAmount;
        } else if (now > startTime) {
            const elapsed = now - startTime;
            const priceDiff = params.startBuyAmount - params.endBuyAmount;
            const decay = (priceDiff * elapsed) / duration;
            price = params.startBuyAmount - decay;
        }

        if (price < params.endBuyAmount) price = params.endBuyAmount;
        return price;
    }

    // =========================================================================
    // fill — Execute a fill transaction for a Dutch Auction
    // =========================================================================
    /**
     * Fill a Dutch Auction order. Builds and broadcasts a transaction that:
     *   - Input 0: Covenant UTXO (unlocked via contract.unlock.fill)
     *   - Input 1: Solver's P2PKH UTXO (for paying the buy price)
     *   - Output 0: Pays maker >= currentPrice in buyToken
     *   - Output 1: Sends sellTokens to solver
     *   - Output 2: Change back to solver (if any)
     *
     * @param opts - Fill options
     * @returns SolverResult with txid and price paid
     * @throws {InsufficientFundsError} If solver doesn't have enough BCH
     */
    static async fill(opts: DutchAuctionFillOptions): Promise<SolverResult> {
        const { contract, contractUtxo, params, solverWif, solverUtxos } = opts;

        const sigTemplate = new SignatureTemplate(solverWif);
        const solverPk = sigTemplate.getPublicKey();

        // --- Calculate current price ---
        const locktime = Math.floor(Date.now() / 1000);
        const startTime = BigInt(locktime); // Approximate — contract bakes in its own startTime
        const duration = params.duration ?? 3600n;

        // The actual price is computed on-chain. We need to pay >= currentPrice.
        // We calculate it here to know how much to send.
        let currentPrice = params.startBuyAmount;
        const elapsed = BigInt(locktime) - startTime;
        if (elapsed > 0n) {
            const clampedElapsed = elapsed < duration ? elapsed : duration;
            const priceDrop = params.startBuyAmount - params.endBuyAmount;
            const dropAmount = (priceDrop * clampedElapsed) / duration;
            currentPrice = params.startBuyAmount - dropAmount;
        }
        if (currentPrice < params.endBuyAmount) currentPrice = params.endBuyAmount;

        // --- Build the P2PKH locking bytecodes ---
        const makerPkh = derivePkhFromAddress(params.makerAddress);
        const makerLockingBytecode = buildP2PKH(makerPkh);

        const solverPkh = hash160(solverPk);
        const solverLockingBytecode = buildP2PKH(solverPkh);

        // --- Select solver UTXOs (BCH only, no tokens) ---
        const bchUtxos = solverUtxos.filter(u => !u.token);
        const neededSats = currentPrice + 2000n; // price + fees + dust
        let totalSolverInput = 0n;
        const selectedUtxos: Utxo[] = [];

        // Sort descending by satoshis for efficiency
        const sorted = [...bchUtxos].sort((a, b) => Number(b.satoshis - a.satoshis));
        for (const u of sorted) {
            if (totalSolverInput >= neededSats) break;
            selectedUtxos.push(u);
            totalSolverInput += u.satoshis;
        }

        if (totalSolverInput < neededSats) {
            throw new InsufficientFundsError(neededSats, totalSolverInput);
        }

        // --- Build Transaction ---
        const provider = (contract as any).provider;
        const tb = new TransactionBuilder({ provider });

        // Input 0: Covenant UTXO (unlock via fill)
        tb.addInput(contractUtxo, contract.unlock.fill(solverPk, sigTemplate));

        // Input 1+: Solver P2PKH UTXOs
        const p2pkhUnlocker = sigTemplate.unlockP2PKH();
        for (const u of selectedUtxos) {
            tb.addInput(u, p2pkhUnlocker);
        }

        // Output 0: Pay maker >= currentPrice
        const isBuyBCH = params.buyToken === 'BCH' || params.buyToken === '';
        if (isBuyBCH) {
            tb.addOutput({ to: makerLockingBytecode, amount: currentPrice });
        } else {
            tb.addOutput({
                to: makerLockingBytecode,
                amount: 1000n,
                token: {
                    amount: currentPrice,
                    category: stripHex(params.buyToken),
                },
            });
        }

        // Output 1: Send sell tokens to solver
        const isSellBCH = params.sellToken === 'BCH' || params.sellToken === '';
        if (isSellBCH) {
            tb.addOutput({ to: solverLockingBytecode, amount: params.sellAmount });
        } else {
            tb.addOutput({
                to: solverLockingBytecode,
                amount: 1000n,
                token: {
                    amount: params.sellAmount,
                    category: stripHex(params.sellToken),
                },
            });
        }

        // Output 2: Change back to solver
        const totalIn = contractUtxo.satoshis + totalSolverInput;
        const makerOut = isBuyBCH ? currentPrice : 1000n;
        const tokenOut = isSellBCH ? params.sellAmount : 1000n;
        const fee = 1000n;
        const change = totalIn - makerOut - tokenOut - fee;
        if (change > 546n) {
            tb.addOutput({ to: solverLockingBytecode, amount: change });
        }

        // Set locktime (required for Dutch Auction price calculation)
        tb.setLocktime(locktime);

        // Broadcast
        const tx = await tb.send();
        return { txid: tx.txid, pricePaid: currentPrice };
    }

    // =========================================================================
    // cancel — Maker cancels the auction and reclaims funds
    // =========================================================================
    /**
     * Cancel a Dutch Auction after the duration has elapsed.
     * The maker reclaims their sell tokens / BCH.
     *
     * The contract requires: tx.time >= startTime + duration
     *
     * @param opts - Cancel options
     * @returns SolverResult with txid
     */
    static async cancel(opts: DutchAuctionCancelOptions): Promise<SolverResult> {
        const { contract, contractUtxo, makerWif, makerAddress } = opts;

        const sigTemplate = new SignatureTemplate(makerWif);
        const makerPk = sigTemplate.getPublicKey();

        const provider = (contract as any).provider;
        const tb = new TransactionBuilder({ provider });

        // Input: Covenant UTXO (unlock via cancel)
        tb.addInput(contractUtxo, contract.unlock.cancel(makerPk, sigTemplate));

        // Output: Send everything back to maker (minus fee)
        const fee = 1000n;
        const outputAmount = contractUtxo.satoshis - fee;

        if (contractUtxo.token) {
            // Reclaim tokens
            const makerPkh = derivePkhFromAddress(makerAddress);
            const makerLocking = buildP2PKH(makerPkh);
            tb.addOutput({
                to: makerLocking,
                amount: outputAmount > 546n ? outputAmount : 1000n,
                token: {
                    amount: contractUtxo.token.amount,
                    category: contractUtxo.token.category,
                },
            });
        } else {
            // Reclaim BCH
            tb.addOutput({ to: makerAddress, amount: outputAmount });
        }

        // Set locktime to now (contract requires tx.time >= endTime)
        tb.setLocktime(Math.floor(Date.now() / 1000));

        const tx = await tb.send();
        return { txid: tx.txid };
    }
}

// ============================================================================
// Internal Helpers
// ============================================================================

/** Build a P2PKH locking bytecode from a 20-byte PKH */
function buildP2PKH(pkh: Uint8Array): Uint8Array {
    return Uint8Array.from([
        0x76, // OP_DUP
        0xa9, // OP_HASH160
        0x14, // Push 20 bytes
        ...pkh,
        0x88, // OP_EQUALVERIFY
        0xac, // OP_CHECKSIG
    ]);
}

/** Compute HASH160 (RIPEMD160(SHA256(data))) of a public key */
function hash160(publicKey: Uint8Array): Uint8Array {
    const sha256 = createHash('sha256').update(publicKey).digest();
    return createHash('ripemd160').update(sha256).digest();
}
