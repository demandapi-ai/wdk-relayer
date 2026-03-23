import { config } from 'dotenv';
config();

export const relayerConfig = {
    port: parseInt(process.env.PORT || '3002'),
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '5000'),
    
    bsc: {
        rpcUrl: process.env.BSC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/',
        privateKey: process.env.BSC_PRIVATE_KEY || '',
        htlcAddress: process.env.INTENT_HTLC_ADDRESS || '',
        usdtAddress: process.env.BSC_USDT_ADDRESS || ''
    },

    ethereum: {
        rpcUrl: process.env.ETH_RPC_URL || 'https://ethereum-rpc.publicnode.com',
        privateKey: process.env.ETH_PRIVATE_KEY || process.env.BSC_PRIVATE_KEY || '',
        htlcAddress: process.env.ETH_HTLC_ADDRESS || '',
        usdtAddress: process.env.ETH_USDT_ADDRESS || '0xdac17f958d2ee523a2206206994597c13d831ec7'
    },
    
    solana: {
        rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        privateKey: process.env.SOLANA_PRIVATE_KEY || '',
        programId: process.env.SOLANA_PROGRAM_ID || '5JAWumq5L4B8WrpF3CFox36SZ2bJF4xQvskLksmHRgs2'
    },
    
    timelocks: {
        source: parseInt(process.env.SOURCE_TIMELOCK || '7200'),
        dest: parseInt(process.env.DEST_TIMELOCK || '3600')
    },

    bridge: {
        enabled: process.env.BRIDGE_ENABLED === 'true',
        rebalanceThreshold: BigInt(process.env.REBALANCE_THRESHOLD || '10000000'), // 10 USDT (6 decimals)
        bridgeMaxFee: BigInt(process.env.BRIDGE_MAX_FEE || '1000000000000000')     // 0.001 ETH max fee
    }
};
