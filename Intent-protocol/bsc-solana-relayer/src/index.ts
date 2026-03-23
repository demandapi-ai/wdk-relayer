import Fastify from 'fastify';
import cors from '@fastify/cors';
import chalk from 'chalk';
import { relayerConfig } from './config.js';
import { BSCSolanaRelayerCore } from './services/BSCSolanaRelayerCore.js';
import { BSCService } from './services/BSCService.js';
import { EthereumService } from './services/EthereumService.js';
import { SolanaService } from './services/SolanaService.js';

const fastify = Fastify({ logger: false });

(async () => {
    await fastify.register(cors, { origin: '*' });

    const relayerCore = new BSCSolanaRelayerCore();

    fastify.get('/health', async () => {
        return { status: 'ok', chains: ['bsc', 'ethereum', 'solana'] };
    });

    fastify.get('/solver', async (request, reply) => {
        try {
            const bscService = (relayerCore as any).bscService as BSCService;
            const ethService = (relayerCore as any).ethService as EthereumService;
            const solanaService = (relayerCore as any).solanaService as SolanaService;
            
            const bscAddress = bscService.walletAddress;
            const bscBalance = await bscService.provider.getBalance(bscAddress);
            
            const ethAddress = ethService.walletAddress;
            let ethBalance = '0';
            try { ethBalance = (await ethService.provider.getBalance(ethAddress)).toString(); } catch(e) {}
            
            const solAddress = solanaService.publicKey.toBase58();
            const solBalance = await solanaService.connection.getBalance(solanaService.publicKey);

            return {
                address: {
                    bsc: bscAddress,
                    ethereum: ethAddress,
                    solana: solAddress
                },
                balances: {
                    bsc: bscBalance.toString(),
                    ethereum: ethBalance,
                    solana: solBalance.toString()
                },
                activeOrders: relayerCore.getActiveIntents().length,
                completedOrders: relayerCore.getCompletedIntents().length
            };
        } catch (e: any) {
            return reply.status(500).send({ error: e.message });
        }
    });

    fastify.post('/swap/bsc-to-solana', async (request, reply) => {
        try {
            const body = request.body as any;
            if (!body.makerAddress || !body.recipientAddress || !body.sellAmount || !body.buyAmount || !body.hashlock || !body.bscEscrowId) {
                return reply.status(400).send({ error: 'Missing required parameters' });
            }

            const intent = await relayerCore.handleBSCToSolana({
                makerAddress: body.makerAddress,
                recipientAddress: body.recipientAddress,
                sellAmount: body.sellAmount,
                buyAmount: body.buyAmount,
                hashlock: body.hashlock,
                bscEscrowId: body.bscEscrowId
            });

            return { success: true, intent };
        } catch (e: any) {
            console.error(chalk.red('API Error (/swap/bsc-to-solana):'), e.message);
            return reply.status(500).send({ error: e.message });
        }
    });

    fastify.post('/swap/solana-to-bsc', async (request, reply) => {
        try {
            const body = request.body as any;
            if (!body.makerAddress || !body.recipientAddress || !body.sellAmount || !body.buyAmount || !body.hashlock || !body.solanaEscrowPda) {
                return reply.status(400).send({ error: 'Missing required parameters' });
            }

            const intent = await relayerCore.handleSolanaToBSC({
                makerAddress: body.makerAddress,
                recipientAddress: body.recipientAddress,
                sellAmount: body.sellAmount,
                buyAmount: body.buyAmount,
                hashlock: body.hashlock,
                solanaEscrowPda: body.solanaEscrowPda
            });

            return { success: true, intent };
        } catch (e: any) {
            console.error(chalk.red('API Error (/swap/solana-to-bsc):'), e.message);
            return reply.status(500).send({ error: e.message });
        }
    });

    // =========================================
    // Ethereum Swap Routes
    // =========================================

    fastify.post('/swap/eth-to-solana', async (request, reply) => {
        try {
            const body = request.body as any;
            if (!body.makerAddress || !body.recipientAddress || !body.sellAmount || !body.buyAmount || !body.hashlock || !body.ethEscrowId) {
                return reply.status(400).send({ error: 'Missing required parameters' });
            }

            const intent = await relayerCore.handleETHToSolana({
                makerAddress: body.makerAddress,
                recipientAddress: body.recipientAddress,
                sellAmount: body.sellAmount,
                buyAmount: body.buyAmount,
                hashlock: body.hashlock,
                ethEscrowId: body.ethEscrowId
            });

            return { success: true, intent };
        } catch (e: any) {
            console.error(chalk.red('API Error (/swap/eth-to-solana):'), e.message);
            return reply.status(500).send({ error: e.message });
        }
    });

    fastify.post('/swap/solana-to-eth', async (request, reply) => {
        try {
            const body = request.body as any;
            if (!body.makerAddress || !body.recipientAddress || !body.sellAmount || !body.buyAmount || !body.hashlock || !body.solanaEscrowPda) {
                return reply.status(400).send({ error: 'Missing required parameters' });
            }

            const intent = await relayerCore.handleSolanaToETH({
                makerAddress: body.makerAddress,
                recipientAddress: body.recipientAddress,
                sellAmount: body.sellAmount,
                buyAmount: body.buyAmount,
                hashlock: body.hashlock,
                solanaEscrowPda: body.solanaEscrowPda
            });

            return { success: true, intent };
        } catch (e: any) {
            console.error(chalk.red('API Error (/swap/solana-to-eth):'), e.message);
            return reply.status(500).send({ error: e.message });
        }
    });

    fastify.post('/claim', async (request, reply) => {
        try {
            const body = request.body as any;
            if (!body.intentId || !body.secret) {
                return reply.status(400).send({ error: 'Missing intentId or secret' });
            }

            await relayerCore.processSecretRevelation(body.intentId, body.secret);
            return { success: true };
        } catch (e: any) {
            console.error(chalk.red('API Error (/claim):'), e.message);
            return reply.status(500).send({ error: e.message });
        }
    });

    fastify.get('/orders/:id', async (request, reply) => {
        const { id } = request.params as any;
        const intent = relayerCore.getIntent(id);
        if (!intent) return reply.status(404).send({ error: 'Intent not found' });
        return { intent };
    });

    fastify.get('/orders', async () => {
        return {
            active: relayerCore.getActiveIntents(),
            completed: relayerCore.getCompletedIntents()
        };
    });

    const start = async () => {
        try {
            await fastify.listen({ port: relayerConfig.port, host: '0.0.0.0' });
            console.log(chalk.yellow(`\n🚀 Universal Intent Relayer listening on port ${relayerConfig.port}`));
            console.log(chalk.gray(`   http://localhost:${relayerConfig.port}/solver`));
            console.log(chalk.gray(`   Chains: BSC + Ethereum + Solana`));
        } catch (err) {
            console.error(err);
            process.exit(1);
        }
    };

    start();
})();
