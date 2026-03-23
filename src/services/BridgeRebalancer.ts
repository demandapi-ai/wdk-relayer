import chalk from 'chalk';
import { relayerConfig } from '../config.js';
import { WalletAccountEvm } from '@tetherto/wdk-wallet-evm';
import Usdt0ProtocolEvm from '@tetherto/wdk-protocol-bridge-usdt0-evm';

/**
 * BridgeRebalancer — Autonomous Inventory Manager
 * 
 * Uses the Tether WDK USD₮0 Bridge Protocol to seamlessly move USDT
 * liquidity between Ethereum, BSC, and Solana based on balance thresholds.
 * 
 * This ensures the Relayer/Solver always has enough inventory on every
 * chain to fill incoming cross-chain intents without manual intervention.
 */
export class BridgeRebalancer {
    private bridgeProtocol?: Usdt0ProtocolEvm;
    private enabled: boolean;

    constructor(private wdkAccount?: WalletAccountEvm) {
        this.enabled = relayerConfig.bridge.enabled;

        if (!this.enabled) {
            console.log(chalk.gray('🔗 Bridge Rebalancer: Disabled (set BRIDGE_ENABLED=true to activate)'));
            return;
        }

        this.init().catch(console.error);
    }

    private async init() {
        if (!this.wdkAccount) {
            console.warn(chalk.yellow('⚠️  Bridge Rebalancer: No WDK account provided. Skipping initialization.'));
            return;
        }

        try {
            this.bridgeProtocol = new Usdt0ProtocolEvm(this.wdkAccount, {
                bridgeMaxFee: relayerConfig.bridge.bridgeMaxFee
            });

            console.log(chalk.green('🔗 Bridge Rebalancer: Initialized successfully'));
            console.log(chalk.gray(`   Max Bridge Fee: ${relayerConfig.bridge.bridgeMaxFee} wei`));
            console.log(chalk.gray(`   Rebalance Threshold: ${relayerConfig.bridge.rebalanceThreshold} (base units)`));
        } catch (error) {
            console.error(chalk.red('Bridge Rebalancer initialization failed:'), error);
        }
    }

    /**
     * Get a quote for bridging USDT from the current chain to a target chain.
     */
    async quoteBridge(targetChain: string, amount: bigint, usdtAddress: string): Promise<{ fee: bigint; bridgeFee: bigint } | null> {
        if (!this.bridgeProtocol || !this.wdkAccount) return null;

        try {
            const quote = await this.bridgeProtocol.quoteBridge({
                targetChain,
                recipient: this.wdkAccount.address,
                token: usdtAddress,
                amount
            });

            console.log(chalk.cyan(`💰 Bridge Quote (→ ${targetChain}):`));
            console.log(chalk.gray(`   Gas Fee: ${quote.fee} wei`));
            console.log(chalk.gray(`   Bridge Fee: ${quote.bridgeFee} wei`));

            return { fee: quote.fee, bridgeFee: quote.bridgeFee };
        } catch (error: any) {
            console.error(chalk.red(`Bridge quote failed for ${targetChain}:`), error.message);
            return null;
        }
    }

    /**
     * Execute a bridge transfer to move USDT inventory to a target chain.
     * Supports EVM→EVM and EVM→Solana routes.
     */
    async rebalanceTo(
        targetChain: string,
        recipientAddress: string,
        amount: bigint,
        usdtAddress: string
    ): Promise<string | null> {
        if (!this.bridgeProtocol) {
            console.warn(chalk.yellow('Bridge protocol not initialized'));
            return null;
        }

        try {
            console.log(chalk.cyan(`🔄 Rebalancing ${amount} USDT → ${targetChain}...`));

            const result = await this.bridgeProtocol.bridge({
                targetChain,
                recipient: recipientAddress,
                token: usdtAddress,
                amount
            });

            console.log(chalk.green(`✅ Bridge Complete!`));
            console.log(chalk.gray(`   Tx Hash: ${result.hash}`));
            console.log(chalk.gray(`   Gas Fee: ${result.fee} wei`));
            console.log(chalk.gray(`   Bridge Fee: ${result.bridgeFee} wei`));

            return result.hash;
        } catch (error: any) {
            console.error(chalk.red(`Bridge rebalance to ${targetChain} failed:`), error.message);
            return null;
        }
    }

    /**
     * Check if rebalancing is needed and execute if necessary.
     * Called periodically by the relayer core polling loop.
     */
    async checkAndRebalance(
        balances: { ethereum: bigint; bsc: bigint; solana: bigint },
        addresses: { ethereum: string; bsc: string; solana: string }
    ) {
        if (!this.enabled || !this.bridgeProtocol) return;

        const threshold = relayerConfig.bridge.rebalanceThreshold;

        // If BSC is low but Ethereum has excess, bridge ETH → BSC
        if (balances.bsc < threshold && balances.ethereum > threshold * 2n) {
            const bridgeAmount = threshold;
            console.log(chalk.yellow(`⚠️  BSC inventory low. Bridging ${bridgeAmount} from Ethereum...`));
            await this.rebalanceTo('bsc', addresses.bsc, bridgeAmount, relayerConfig.ethereum.usdtAddress);
        }

        // If Ethereum is low but BSC has excess, bridge BSC → Ethereum
        if (balances.ethereum < threshold && balances.bsc > threshold * 2n) {
            const bridgeAmount = threshold;
            console.log(chalk.yellow(`⚠️  Ethereum inventory low. Bridging ${bridgeAmount} from BSC...`));
            await this.rebalanceTo('ethereum', addresses.ethereum, bridgeAmount, relayerConfig.bsc.usdtAddress);
        }

        // If Solana is low and any EVM chain has excess, bridge to Solana
        if (balances.solana < threshold) {
            if (balances.ethereum > threshold * 2n) {
                const bridgeAmount = threshold;
                console.log(chalk.yellow(`⚠️  Solana inventory low. Bridging ${bridgeAmount} from Ethereum...`));
                await this.rebalanceTo('solana', addresses.solana, bridgeAmount, relayerConfig.ethereum.usdtAddress);
            } else if (balances.bsc > threshold * 2n) {
                const bridgeAmount = threshold;
                console.log(chalk.yellow(`⚠️  Solana inventory low. Bridging ${bridgeAmount} from BSC...`));
                await this.rebalanceTo('solana', addresses.solana, bridgeAmount, relayerConfig.bsc.usdtAddress);
            }
        }
    }
}
