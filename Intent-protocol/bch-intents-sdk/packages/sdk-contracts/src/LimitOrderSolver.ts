import {
    Contract,
    TransactionBuilder,
    SignatureTemplate,
} from 'cashscript';
import type { Utxo } from 'cashscript';
import {
    LimitOrderParams,
    derivePkhFromAddress,
    stripHex,
    InsufficientFundsError,
} from '@bch-intents/sdk-common';
import { createHash } from 'crypto';

// ============================================================================
// LimitOrderSolver — Fill and Cancel logic for LimitOrderSwap covenants
// ============================================================================
// Fixed-price swap: resolver must pay exactly `buyAmount` to the maker.

/** Options for filling a Limit Order */
export interface LimitOrderFillOptions {
    /** Compiled CashScript Contract (from LimitOrderContract.compile()) */
    contract: Contract;
    /** The funded covenant UTXO holding the sell tokens */
    contractUtxo: Utxo;
    /** The original Limit Order parameters */
    params: LimitOrderParams;
    /** Solver's private key in WIF format */
    solverWif: string;
    /** Solver's BCH UTXOs for paying the buy price + fees */
    solverUtxos: Utxo[];
}

/** Options for cancelling a Limit Order */
export interface LimitOrderCancelOptions {
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
    txid: string;
    pricePaid?: bigint;
}

export class LimitOrderSolver {

    // =========================================================================
    // fill — Execute a fill transaction for a Limit Order
    // =========================================================================
    /**
     * Fill a Limit Order. Builds and broadcasts a transaction that:
     *   - Input 0: Covenant UTXO (unlocked via contract.unlock.fill)
     *   - Input 1: Solver's P2PKH UTXO
     *   - Output 0: Pays maker >= buyAmount
     *   - Output 1: Sends sellTokens to solver
     *   - Output 2: Change back to solver
     *
     * @param opts - Fill options
     * @returns SolverResult with txid and price paid
     * @throws {InsufficientFundsError} If solver doesn't have enough BCH
     */
    static async fill(opts: LimitOrderFillOptions): Promise<SolverResult> {
        const { contract, contractUtxo, params, solverWif, solverUtxos } = opts;

        const sigTemplate = new SignatureTemplate(solverWif);
        const solverPk = sigTemplate.getPublicKey();
        const price = params.buyAmount;

        // --- Build P2PKH locking bytecodes ---
        const makerPkh = derivePkhFromAddress(params.makerAddress);
        const makerLockingBytecode = buildP2PKH(makerPkh);

        const solverPkh = hash160(solverPk);
        const solverLockingBytecode = buildP2PKH(solverPkh);

        // --- Select solver UTXOs ---
        const bchUtxos = solverUtxos.filter(u => !u.token);
        const neededSats = price + 2000n;
        let totalSolverInput = 0n;
        const selectedUtxos: Utxo[] = [];

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

        // Input 0: Covenant
        tb.addInput(contractUtxo, contract.unlock.fill(solverPk, sigTemplate));

        // Input 1+: Solver funding
        const p2pkhUnlocker = sigTemplate.unlockP2PKH();
        for (const u of selectedUtxos) {
            tb.addInput(u, p2pkhUnlocker);
        }

        // Output 0: Pay maker >= buyAmount
        const isBuyBCH = params.buyToken === 'BCH' || params.buyToken === '';
        if (isBuyBCH) {
            tb.addOutput({ to: makerLockingBytecode, amount: price });
        } else {
            tb.addOutput({
                to: makerLockingBytecode,
                amount: 1000n,
                token: { amount: price, category: stripHex(params.buyToken) },
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
                token: { amount: params.sellAmount, category: stripHex(params.sellToken) },
            });
        }

        // Output 2: Change
        const totalIn = contractUtxo.satoshis + totalSolverInput;
        const makerOut = isBuyBCH ? price : 1000n;
        const tokenOut = isSellBCH ? params.sellAmount : 1000n;
        const fee = 1000n;
        const change = totalIn - makerOut - tokenOut - fee;
        if (change > 546n) {
            tb.addOutput({ to: solverLockingBytecode, amount: change });
        }

        // Locktime must be before expiryTime (contract enforces currentTime < expiryTime)
        const locktime = Math.floor(Date.now() / 1000);
        tb.setLocktime(locktime);

        const tx = await tb.send();
        return { txid: tx.txid, pricePaid: price };
    }

    // =========================================================================
    // cancel — Maker cancels the order and reclaims funds after expiry
    // =========================================================================
    /**
     * Cancel a Limit Order after the expiry time has passed.
     * The maker reclaims their sell tokens / BCH.
     *
     * The contract requires: tx.time >= expiryTime
     *
     * @param opts - Cancel options
     * @returns SolverResult with txid
     */
    static async cancel(opts: LimitOrderCancelOptions): Promise<SolverResult> {
        const { contract, contractUtxo, makerWif, makerAddress } = opts;

        const sigTemplate = new SignatureTemplate(makerWif);
        const makerPk = sigTemplate.getPublicKey();

        const provider = (contract as any).provider;
        const tb = new TransactionBuilder({ provider });

        // Input: Covenant UTXO
        tb.addInput(contractUtxo, contract.unlock.cancel(makerPk, sigTemplate));

        // Output: Return everything to maker
        const fee = 1000n;
        const outputAmount = contractUtxo.satoshis - fee;

        if (contractUtxo.token) {
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
            tb.addOutput({ to: makerAddress, amount: outputAmount });
        }

        // Set locktime >= expiryTime for the contract check
        tb.setLocktime(Math.floor(Date.now() / 1000));

        const tx = await tb.send();
        return { txid: tx.txid };
    }
}

// ============================================================================
// Internal Helpers
// ============================================================================

function buildP2PKH(pkh: Uint8Array): Uint8Array {
    return Uint8Array.from([
        0x76, 0xa9, 0x14, ...pkh, 0x88, 0xac,
    ]);
}

function hash160(publicKey: Uint8Array): Uint8Array {
    const sha256 = createHash('sha256').update(publicKey).digest();
    return createHash('ripemd160').update(sha256).digest();
}
