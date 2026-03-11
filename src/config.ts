import { config } from 'dotenv';
config();

export const relayerConfig = {
    port: parseInt(process.env.PORT || '3002'),
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '5000'),
    
    bsc: {
        rpcUrl: process.env.BSC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/',
        privateKey: process.env.BSC_PRIVATE_KEY || '',
        htlcAddress: process.env.INTENT_HTLC_ADDRESS || ''
    },
    
    solana: {
        rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        privateKey: process.env.SOLANA_PRIVATE_KEY || '', // Base58 or JSON array format
        programId: process.env.SOLANA_PROGRAM_ID || '5JAWumq5L4B8WrpF3CFox36SZ2bJF4xQvskLksmHRgs2'
    },
    
    timelocks: {
        source: parseInt(process.env.SOURCE_TIMELOCK || '7200'), // 2 hours
        dest: parseInt(process.env.DEST_TIMELOCK || '3600')      // 1 hour
    }
};
