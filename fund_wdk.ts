import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { relayerConfig } from './src/config.js';

async function fundWDK() {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // Original Wallet from .env (which has funds)
    const privKeyArray = JSON.parse(relayerConfig.solana.privateKey);
    const originalKeypair = Keypair.fromSecretKey(Uint8Array.from(privKeyArray));
    console.log(`Original Address: ${originalKeypair.publicKey.toBase58()}`);
    
    const balance = await connection.getBalance(originalKeypair.publicKey);
    console.log(`Original Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    if (balance < 0.05 * LAMPORTS_PER_SOL) {
        console.error("Not enough funds in original wallet to transfer!");
        process.exit(1);
    }
    
    // WDK Address
    const wdkAddress = new PublicKey("EHC6QYT8ibbwQGR2ZVrqDHAd8oX5rCRE2qkZvhSRSDmx");
    
    const tx = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: originalKeypair.publicKey,
            toPubkey: wdkAddress,
            lamports: 0.1 * LAMPORTS_PER_SOL // Transfer 0.1 SOL
        })
    );
    
    console.log("Sending 0.1 SOL to WDK Address...");
    const sig = await sendAndConfirmTransaction(connection, tx, [originalKeypair]);
    console.log(`✅ Transfer successful! TX: ${sig}`);
}

fundWDK().catch(console.error);
