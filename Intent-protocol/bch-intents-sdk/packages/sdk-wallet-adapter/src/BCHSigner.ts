/**
 * Provider-agnostic interface for signing Bitcoin Cash transactions
 * and retrieving wallet addresses.
 * 
 * This allows the SDK to work with any wallet (e.g., mainnet-js, 
 * web3 injected wallets like Cashonize/Paytaca, or custom embedded wallets).
 */
export interface BCHSigner {
    /**
     * Get the currently connected wallet's cashaddr.
     * @returns The BCH locking address, e.g. `bitcoincash:qp...` or `bchtest:qq...`
     */
    getAddress(): Promise<string>;

    /**
     * Get the 20-byte public key hash (PKH) of the connected wallet.
     * This is required for constructing CashScript covenants.
     */
    getPkh(): Promise<Uint8Array>;

    /**
     * Get the full public key (for signing/verification).
     */
    getPublicKey(): Promise<Uint8Array>;

    /**
     * Send BCH/Tokens to an address.
     * Often used to fund constructed intent contracts.
     * 
     * @param toAddress - The destination (usually the compiled contract address)
     * @param satoshis - The amount of BCH to send
     * @param token - Optional CashToken to include in the transfer
     * @returns The transaction ID hash string
     */
    send(toAddress: string, satoshis: bigint, token?: { category: string; amount: bigint }): Promise<string>;

    // In the future, we will add signTransaction() for PSBT-like raw signing
    // signTransaction(tx: UnsignedTx): Promise<SignedTx>;
}
