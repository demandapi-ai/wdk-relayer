import chalk from 'chalk';
import { BSCService } from './BSCService.js';
import { EthereumService } from './EthereumService.js';
import { SolanaService } from './SolanaService.js';
import { BridgeRebalancer } from './BridgeRebalancer.js';
import { CrossChainIntent } from '../types/intent.js';
import { relayerConfig } from '../config.js';
import { PublicKey } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import { ethers } from 'ethers';

const BN = (anchor as any).BN || (anchor as any).default?.BN;

export class BSCSolanaRelayerCore {
    private bscService: BSCService;
    private ethService: EthereumService;
    private solanaService: SolanaService;
    private bridgeRebalancer: BridgeRebalancer;
    private activeIntents: Map<string, CrossChainIntent> = new Map();
    private completedIntents: CrossChainIntent[] = [];

    constructor() {
        this.bscService = new BSCService();
        this.ethService = new EthereumService();
        this.solanaService = new SolanaService();
        this.bridgeRebalancer = new BridgeRebalancer();

        console.log(chalk.green('🔗 Universal Intent Relayer Core Initialized (BSC + ETH + Solana)'));

        // Start Polling Loop
        setInterval(() => this.pollIntents(), relayerConfig.pollIntervalMs);
    }

    /**
     * Handle BSC → Solana swap request
     */
    async handleBSCToSolana(params: {
        makerAddress: string;       // User's BSC Address
        recipientAddress: string;   // User's Solana Address
        sellAmount: string;         // BSC Wei
        buyAmount: string;          // SOL Lamports
        hashlock: string;
        bscEscrowId: string;        // The ID on the BSC contract
    }): Promise<CrossChainIntent> {
        const intentId = `bsc_sol_${Date.now()}`;
        const now = Math.floor(Date.now() / 1000);

        console.log(chalk.blue(`\n📥 Processing BSC → Solana Swap`));
        console.log(chalk.gray(`   ID: ${intentId}`));

        const intent: CrossChainIntent = {
            id: intentId,
            direction: 'BSC_TO_SOL',
            makerAddress: params.makerAddress,
            takerAddress: this.solanaService.publicKey.toBase58(),
            recipientAddress: params.recipientAddress,
            sellAmount: params.sellAmount,
            buyAmount: params.buyAmount,
            hashlock: params.hashlock,
            sourceTimelock: now + relayerConfig.timelocks.source,
            destTimelock: now + relayerConfig.timelocks.dest,
            bscEscrowId: params.bscEscrowId,
            status: 'PENDING',
            createdAt: now,
            updatedAt: now,
        };

        this.activeIntents.set(intentId, intent);
        return intent;
    }

    /**
     * Handle Solana → BSC swap request
     */
    async handleSolanaToBSC(params: {
        makerAddress: string;       // User's Solana Address
        recipientAddress: string;   // User's BSC Address
        sellAmount: string;         // SOL Lamports
        buyAmount: string;          // BSC Wei
        hashlock: string;
        solanaEscrowPda: string;    // Escrow PDA on Solana
    }): Promise<CrossChainIntent> {
        const intentId = `sol_bsc_${Date.now()}`;
        const now = Math.floor(Date.now() / 1000);

        console.log(chalk.blue(`\n📥 Processing Solana → BSC Swap`));
        console.log(chalk.gray(`   ID: ${intentId}`));

        const intent: CrossChainIntent = {
            id: intentId,
            direction: 'SOL_TO_BSC',
            makerAddress: params.makerAddress,
            takerAddress: this.bscService.walletAddress || '',
            recipientAddress: params.recipientAddress,
            sellAmount: params.sellAmount,
            buyAmount: params.buyAmount,
            hashlock: params.hashlock,
            sourceTimelock: now + relayerConfig.timelocks.source,
            destTimelock: now + relayerConfig.timelocks.dest,
            solanaEscrowPda: params.solanaEscrowPda,
            status: 'PENDING',
            createdAt: now,
            updatedAt: now,
        };

        this.activeIntents.set(intentId, intent);
        return intent;
    }

    /**
     * Handle ETH → Solana swap request
     */
    async handleETHToSolana(params: {
        makerAddress: string;
        recipientAddress: string;
        sellAmount: string;
        buyAmount: string;
        hashlock: string;
        ethEscrowId: string;
    }): Promise<CrossChainIntent> {
        const intentId = `eth_sol_${Date.now()}`;
        const now = Math.floor(Date.now() / 1000);

        console.log(chalk.blue(`\n📥 Processing ETH → Solana Swap`));
        console.log(chalk.gray(`   ID: ${intentId}`));

        const intent: CrossChainIntent = {
            id: intentId,
            direction: 'ETH_TO_SOL',
            makerAddress: params.makerAddress,
            takerAddress: this.solanaService.publicKey.toBase58(),
            recipientAddress: params.recipientAddress,
            sellAmount: params.sellAmount,
            buyAmount: params.buyAmount,
            hashlock: params.hashlock,
            sourceTimelock: now + relayerConfig.timelocks.source,
            destTimelock: now + relayerConfig.timelocks.dest,
            ethEscrowId: params.ethEscrowId,
            status: 'PENDING',
            createdAt: now,
            updatedAt: now,
        };

        this.activeIntents.set(intentId, intent);
        return intent;
    }

    /**
     * Handle Solana → ETH swap request
     */
    async handleSolanaToETH(params: {
        makerAddress: string;
        recipientAddress: string;
        sellAmount: string;
        buyAmount: string;
        hashlock: string;
        solanaEscrowPda: string;
    }): Promise<CrossChainIntent> {
        const intentId = `sol_eth_${Date.now()}`;
        const now = Math.floor(Date.now() / 1000);

        console.log(chalk.blue(`\n📥 Processing Solana → ETH Swap`));
        console.log(chalk.gray(`   ID: ${intentId}`));

        const intent: CrossChainIntent = {
            id: intentId,
            direction: 'SOL_TO_ETH',
            makerAddress: params.makerAddress,
            takerAddress: this.ethService.walletAddress || '',
            recipientAddress: params.recipientAddress,
            sellAmount: params.sellAmount,
            buyAmount: params.buyAmount,
            hashlock: params.hashlock,
            sourceTimelock: now + relayerConfig.timelocks.source,
            destTimelock: now + relayerConfig.timelocks.dest,
            solanaEscrowPda: params.solanaEscrowPda,
            status: 'PENDING',
            createdAt: now,
            updatedAt: now,
        };

        this.activeIntents.set(intentId, intent);
        return intent;
    }

    public async pollIntents() {
        for (const [id, intent] of this.activeIntents) {
            try {
                if (intent.direction === 'BSC_TO_SOL') {
                    await this.processBSCToSolana(intent);
                } else if (intent.direction === 'SOL_TO_BSC') {
                    await this.processSolanaToBSC(intent);
                } else if (intent.direction === 'ETH_TO_SOL') {
                    await this.processETHToSolana(intent);
                } else if (intent.direction === 'SOL_TO_ETH') {
                    await this.processSolanaToETH(intent);
                }
            } catch (e: any) {
                console.error(chalk.red(`Error processing intent ${id}:`), e.message);
            }
        }
    }

    /**
     * Process Logic: BSC -> Solana
     */
    private async processBSCToSolana(intent: CrossChainIntent) {
        // 1. PENDING -> SOURCE_LOCKED
        if (intent.status === 'PENDING' && intent.bscEscrowId) {
            const details = await this.bscService.getEscrowDetails(intent.bscEscrowId);
            if (details && !details.claimed && !details.refunded) {
                // Check if balance is correct
                if (BigInt(details.amount) >= BigInt(intent.sellAmount)) {
                    console.log(chalk.green(`✅ BSC Locked confirmed: ${details.amount} Wei`));
                    intent.status = 'SOURCE_LOCKED';
                    intent.updatedAt = Date.now();
                }
            }
        }

        // 2. SOURCE_LOCKED -> DEST_FILLED (Relayer fills Solana)
        if (intent.status === 'SOURCE_LOCKED' && !intent.destFillTx) {
            console.log(chalk.cyan(`⚡ Filling on Solana (Destination) natively using SPL USDC...`));
            try {
                const hashBuf = Buffer.from(intent.hashlock.replace('0x', ''), 'hex');
                // Use Standard Devnet USDC rather than NATIVE_MINT
                const devnetUsdcMint = new PublicKey("5Rya94T4npZ5vb938buez4HiiTa99wPt4sBPs6oqfuc5"); 
                
                const result = await this.solanaService.createEscrow(
                    new PublicKey(intent.recipientAddress),
                    hashBuf,
                    new BN(intent.buyAmount),
                    new BN(intent.destTimelock),
                    devnetUsdcMint
                );

                intent.destFillTx = result.tx;
                intent.solanaEscrowPda = result.escrowPda;
                intent.status = 'DEST_FILLED';
                intent.updatedAt = Date.now();
                console.log(chalk.green(`✅ Solana Filled. Waiting for User to claim...`));
            } catch (e: any) {
                console.error(chalk.red(`❌ Solana fill failed: ${e.message}`));
                intent.fillRetries = (intent.fillRetries || 0) + 1;
                if (intent.fillRetries >= 3) {
                    intent.status = 'FAILED';
                    intent.failReason = e.message;
                    this.activeIntents.delete(intent.id);
                    this.completedIntents.push(intent);
                }
            }
        }

        // 3. DEST_FILLED -> DEST_CLAIMED
        if (intent.status === 'DEST_FILLED' && intent.solanaEscrowPda) {
            const secret = intent.secret || await this.solanaService.watchForSecret(new PublicKey(intent.solanaEscrowPda));
            if (secret && !intent.destClaimTx) {
                console.log(chalk.green(`✅ Secret Revealed on Solana: ${secret}`));
                intent.secret = secret;
                intent.status = 'DEST_CLAIMED';
                await this.claimSourceBSC(intent);
            }
        }
    }

    /**
     * Process Logic: Solana -> BSC
     */
    private async processSolanaToBSC(intent: CrossChainIntent) {
        // 1. PENDING -> SOURCE_LOCKED
        if (intent.status === 'PENDING' && intent.solanaEscrowPda) {
            try {
                const escrowPda = new PublicKey(intent.solanaEscrowPda);
                const accountInfo = await this.solanaService.connection.getAccountInfo(escrowPda);
                if (accountInfo) {
                    intent.status = 'SOURCE_LOCKED';
                    intent.updatedAt = Date.now();
                    console.log(chalk.green(`✅ Solana Locked confirmed (${accountInfo.lamports} lamports)`));
                }
            } catch (e) { /* ignore until next poll */ }
        }

        // 2. SOURCE_LOCKED -> DEST_FILLED (Relayer fills BSC)
        if (intent.status === 'SOURCE_LOCKED' && !intent.destFillTx) {
            console.log(chalk.cyan(`⚡ Filling on BSC (Destination) natively using ERC-20 Tether...`));
            try {
                const mockUsdtAddress = process.env.MOCK_USDT_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // Dummy fallback
                const result = await this.bscService.createEscrow(
                    intent.hashlock,
                    intent.recipientAddress,
                    intent.buyAmount,
                    relayerConfig.timelocks.dest,
                    mockUsdtAddress
                );

                intent.destFillTx = result.txHash;
                intent.bscEscrowId = result.escrowId;
                intent.status = 'DEST_FILLED';
                intent.updatedAt = Date.now();
                console.log(chalk.green(`✅ BSC Filled. Waiting for User to claim...`));
            } catch (e: any) {
                console.error(chalk.red(`❌ BSC fill failed: ${e.message}`));
                intent.fillRetries = (intent.fillRetries || 0) + 1;
                if (intent.fillRetries >= 3) {
                    intent.status = 'FAILED';
                    intent.failReason = e.message;
                    this.activeIntents.delete(intent.id);
                    this.completedIntents.push(intent);
                }
            }
        }

        // 3. DEST_FILLED -> DEST_CLAIMED (using EVM Events!)
        if (intent.status === 'DEST_FILLED' && intent.bscEscrowId) {
            // Check if secret was revealed via API
            if (intent.secret) {
                console.log(chalk.green(`✅ Secret Revealed via API: ${intent.secret}`));
                intent.status = 'DEST_CLAIMED';
                await this.claimSourceSolana(intent);
                return;
            }

            // Check if BSCService caught the EscrowClaimed event!
            const detectedSecret = this.bscService.getDetectedSecret(intent.bscEscrowId);
            if (detectedSecret) {
                console.log(chalk.green(`✅ Secret Detected via BSC Event: ${detectedSecret}`));
                intent.secret = detectedSecret;
                intent.status = 'DEST_CLAIMED';
                await this.claimSourceSolana(intent);
            }
        }
    }

    /**
     * Process Logic: ETH -> Solana
     */
    private async processETHToSolana(intent: CrossChainIntent) {
        if (intent.status === 'PENDING' && intent.ethEscrowId) {
            const details = await this.ethService.getEscrowDetails(intent.ethEscrowId);
            if (details && !details.claimed && !details.refunded) {
                if (BigInt(details.amount) >= BigInt(intent.sellAmount)) {
                    console.log(chalk.green(`✅ ETH Locked confirmed: ${details.amount} Wei`));
                    intent.status = 'SOURCE_LOCKED';
                    intent.updatedAt = Date.now();
                }
            }
        }

        if (intent.status === 'SOURCE_LOCKED' && !intent.destFillTx) {
            console.log(chalk.cyan(`⚡ Filling on Solana from Ethereum intent...`));
            try {
                const hashBuf = Buffer.from(intent.hashlock.replace('0x', ''), 'hex');
                const devnetUsdcMint = new PublicKey("5Rya94T4npZ5vb938buez4HiiTa99wPt4sBPs6oqfuc5");

                const result = await this.solanaService.createEscrow(
                    new PublicKey(intent.recipientAddress),
                    hashBuf,
                    new BN(intent.buyAmount),
                    new BN(intent.destTimelock),
                    devnetUsdcMint
                );

                intent.destFillTx = result.tx;
                intent.solanaEscrowPda = result.escrowPda;
                intent.status = 'DEST_FILLED';
                intent.updatedAt = Date.now();
                console.log(chalk.green(`✅ Solana Filled from ETH intent.`));
            } catch (e: any) {
                console.error(chalk.red(`❌ Solana fill (ETH→SOL) failed: ${e.message}`));
                intent.fillRetries = (intent.fillRetries || 0) + 1;
                if (intent.fillRetries >= 3) {
                    intent.status = 'FAILED';
                    intent.failReason = e.message;
                    this.activeIntents.delete(intent.id);
                    this.completedIntents.push(intent);
                }
            }
        }

        if (intent.status === 'DEST_FILLED' && intent.solanaEscrowPda) {
            const secret = intent.secret || await this.solanaService.watchForSecret(new PublicKey(intent.solanaEscrowPda));
            if (secret && !intent.destClaimTx) {
                console.log(chalk.green(`✅ Secret Revealed on Solana (ETH→SOL): ${secret}`));
                intent.secret = secret;
                intent.status = 'DEST_CLAIMED';
                await this.claimSourceETH(intent);
            }
        }
    }

    /**
     * Process Logic: Solana -> ETH
     */
    private async processSolanaToETH(intent: CrossChainIntent) {
        if (intent.status === 'PENDING' && intent.solanaEscrowPda) {
            try {
                const escrowPda = new PublicKey(intent.solanaEscrowPda);
                const accountInfo = await this.solanaService.connection.getAccountInfo(escrowPda);
                if (accountInfo) {
                    intent.status = 'SOURCE_LOCKED';
                    intent.updatedAt = Date.now();
                    console.log(chalk.green(`✅ Solana Locked confirmed for ETH dest (${accountInfo.lamports} lamports)`));
                }
            } catch (e) { /* retry next poll */ }
        }

        if (intent.status === 'SOURCE_LOCKED' && !intent.destFillTx) {
            console.log(chalk.cyan(`⚡ Filling on Ethereum (Destination) natively using ERC-20 USDT...`));
            try {
                const usdtAddress = relayerConfig.ethereum.usdtAddress;
                const result = await this.ethService.createEscrow(
                    intent.hashlock,
                    intent.recipientAddress,
                    intent.buyAmount,
                    relayerConfig.timelocks.dest,
                    usdtAddress
                );

                intent.destFillTx = result.txHash;
                intent.ethEscrowId = result.escrowId;
                intent.status = 'DEST_FILLED';
                intent.updatedAt = Date.now();
                console.log(chalk.green(`✅ Ethereum Filled. Waiting for User to claim...`));
            } catch (e: any) {
                console.error(chalk.red(`❌ ETH fill failed: ${e.message}`));
                intent.fillRetries = (intent.fillRetries || 0) + 1;
                if (intent.fillRetries >= 3) {
                    intent.status = 'FAILED';
                    intent.failReason = e.message;
                    this.activeIntents.delete(intent.id);
                    this.completedIntents.push(intent);
                }
            }
        }

        if (intent.status === 'DEST_FILLED' && intent.ethEscrowId) {
            if (intent.secret) {
                intent.status = 'DEST_CLAIMED';
                await this.claimSourceSolana(intent);
                return;
            }

            const detectedSecret = this.ethService.getDetectedSecret(intent.ethEscrowId);
            if (detectedSecret) {
                console.log(chalk.green(`✅ Secret Detected via ETH Event: ${detectedSecret}`));
                intent.secret = detectedSecret;
                intent.status = 'DEST_CLAIMED';
                await this.claimSourceSolana(intent);
            }
        }
    }

    // =========================================
    // Atomic Claims
    // =========================================

    private async claimSourceBSC(intent: CrossChainIntent) {
        if (!intent.secret || !intent.bscEscrowId) return;

        try {
            console.log(chalk.cyan(`⚡ Claiming Source BSC...`));
            const txHash = await this.bscService.claimEscrow(intent.bscEscrowId, intent.secret);

            intent.sourceClaimTx = txHash;
            intent.status = 'COMPLETED';
            console.log(chalk.green(`✅ Swap Complete! Claimed BSC: ${txHash}`));

            this.activeIntents.delete(intent.id);
            this.completedIntents.push(intent);
        } catch (e: any) {
            console.error(chalk.red('Failed to claim source BSC:'), e.message);
        }
    }

    private async claimSourceETH(intent: CrossChainIntent) {
        if (!intent.secret || !intent.ethEscrowId) return;

        try {
            console.log(chalk.cyan(`⚡ Claiming Source Ethereum...`));
            const txHash = await this.ethService.claimEscrow(intent.ethEscrowId, intent.secret);

            intent.sourceClaimTx = txHash;
            intent.status = 'COMPLETED';
            console.log(chalk.green(`✅ Swap Complete! Claimed ETH: ${txHash}`));

            this.activeIntents.delete(intent.id);
            this.completedIntents.push(intent);
        } catch (e: any) {
            console.error(chalk.red('Failed to claim source ETH:'), e.message);
        }
    }

    private async claimSourceSolana(intent: CrossChainIntent) {
        if (!intent.secret || !intent.solanaEscrowPda) return;

        try {
            console.log(chalk.cyan(`⚡ Claiming Source Solana...`));
            const hashBuf = Buffer.from(intent.hashlock.replace('0x', ''), 'hex');
            const secretBuf = Buffer.from(intent.secret.replace('0x', ''), 'hex');

            const tx = await this.solanaService.claimEscrow(
                new PublicKey(intent.makerAddress),
                hashBuf,
                secretBuf,
                new PublicKey(intent.solanaEscrowPda),
                NATIVE_MINT,
                undefined
            );

            intent.sourceClaimTx = tx;
            intent.status = 'COMPLETED';
            console.log(chalk.green(`✅ Swap Complete! Claimed SOL: ${tx}`));

            this.activeIntents.delete(intent.id);
            this.completedIntents.push(intent);
        } catch (e: any) {
            console.error(chalk.red('Failed to claim source SOL:'), e.message);
        }
    }

    // Getters
    getIntent(id: string) { return this.activeIntents.get(id) || this.completedIntents.find(i => i.id === id); }
    getActiveIntents() { return Array.from(this.activeIntents.values()); }
    getCompletedIntents() { return this.completedIntents; }
    getEthService() { return this.ethService; }
    
    async processSecretRevelation(intentId: string, secret: string) {
        const intent = this.activeIntents.get(intentId);
        if (!intent) return;
        intent.secret = secret.replace('0x', '');
        intent.status = 'DEST_CLAIMED';
        if (intent.direction === 'SOL_TO_BSC' || intent.direction === 'SOL_TO_ETH') {
            await this.claimSourceSolana(intent);
        } else if (intent.direction === 'BSC_TO_SOL') {
            await this.claimSourceBSC(intent);
        } else if (intent.direction === 'ETH_TO_SOL') {
            await this.claimSourceETH(intent);
        }
    }
}
