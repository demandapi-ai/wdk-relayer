import { ethers } from 'ethers';
import chalk from 'chalk';
import { relayerConfig } from '../config.js';
import WDK from '@tetherto/wdk';
import WalletManagerEvm, { WalletAccountEvm } from '@tetherto/wdk-wallet-evm';

const HTLC_ABI = [
    "function createEscrow(bytes32 hashlock, address recipient, uint256 timelockDuration, address tokenAddress, uint256 tokenAmount) external payable returns (uint256)",
    "function fillEscrow(bytes32 hashlock, address recipient, uint256 timelockDuration, address tokenAddress, uint256 tokenAmount, uint256 auctionStartAmount, uint256 auctionEndAmount, uint256 auctionStartTime, uint256 auctionEndTime) external payable returns (uint256)",
    "function claim(uint256 escrowId, bytes32 secret) external",
    "function refund(uint256 escrowId) external",
    "function getEscrowDetails(uint256 escrowId) external view returns (bytes32 hashlock, uint256 timelock, address sender, address recipient, uint256 amount, address tokenAddress, bool claimed, bool refunded, uint256 createdAt)",
    "event EscrowCreated(uint256 indexed escrowId, bytes32 hashlock, address indexed sender, address indexed recipient, uint256 amount, address tokenAddress, uint256 timelock, uint256 createdAt)",
    "event EscrowClaimed(uint256 indexed escrowId, address indexed claimer, bytes32 secret, uint256 amount)"
];

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function allowance(address owner, address spender) public view returns (uint256)"
];

export class EthereumService {
    public provider: ethers.JsonRpcProvider;
    public contractInterface: ethers.Interface;
    public contract: ethers.Contract;
    
    // WDK State
    private wdk?: WDK;
    public wdkAccount?: WalletAccountEvm;
    public walletAddress: string = '';

    constructor() {
        this.provider = new ethers.JsonRpcProvider(relayerConfig.ethereum.rpcUrl);
        this.contractInterface = new ethers.Interface(HTLC_ABI);
        
        this.contract = new ethers.Contract(relayerConfig.ethereum.htlcAddress, HTLC_ABI, this.provider);
        
        if (!relayerConfig.ethereum.htlcAddress) {
            console.warn(chalk.yellow('⚠️  Missing ETH_HTLC_ADDRESS — Ethereum HTLC features disabled until configured'));
        }

        this.init().catch(console.error);
    }

    private async init() {
        try {
            console.log(chalk.cyan(`⚙️ Initializing WDK for Ethereum Relayer...`));
            
            let seed: Uint8Array | string;
            if (relayerConfig.ethereum.privateKey) {
                const hashBuf = ethers.sha256(ethers.toUtf8Bytes(relayerConfig.ethereum.privateKey));
                seed = ethers.getBytes(hashBuf);
            } else {
                seed = WDK.getRandomSeedPhrase();
            }

            this.wdk = new WDK(seed);
            this.wdk.registerWallet('evm', WalletManagerEvm, {
                provider: relayerConfig.ethereum.rpcUrl
            });

            this.wdkAccount = (await this.wdk.getAccount('evm', 0)) as unknown as WalletAccountEvm;
            this.walletAddress = this.wdkAccount.address;

            console.log(chalk.green(`🟢 Ethereum Service Initialized via WDK (EVM)`));
            console.log(chalk.gray(`   Address: ${this.walletAddress}`));
            
            const balance = await this.provider.getBalance(this.walletAddress);
            console.log(chalk.gray(`   Balance: ${ethers.formatEther(balance)} ETH`));
            
            this.setupClaimListener();
        } catch (error) {
            console.error(chalk.red('Failed to initialize Ethereum service via WDK:'), error);
        }
    }

    async createEscrow(
        hashlock: string,
        recipient: string,
        amountWei: string,
        timelockDurationSeconds: number,
        tokenAddress: string = ethers.ZeroAddress
    ): Promise<{ txHash: string, escrowId: string }> {
        console.log(chalk.cyan(`⚡ Creating Ethereum Escrow via WDK...`));
        if (!this.wdkAccount) throw new Error("WDK EVM Account not initialized");
        
        const hashBuf = hashlock.startsWith('0x') ? hashlock : `0x${hashlock}`;
        
        try {
            if (tokenAddress !== ethers.ZeroAddress) {
                const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
                const currentAllowance = await tokenContract.allowance(this.walletAddress, relayerConfig.ethereum.htlcAddress);
                
                if (BigInt(currentAllowance) < BigInt(amountWei)) {
                    console.log(chalk.yellow(`   Approving ${amountWei} tokens for IntentHTLC spending via WDK...`));
                    const iface = new ethers.Interface(ERC20_ABI);
                    const authCallData = iface.encodeFunctionData("approve", [relayerConfig.ethereum.htlcAddress, amountWei]);
                    
                    const authTx = await this.wdkAccount.sendTransaction({
                        to: tokenAddress,
                        value: 0n,
                        data: authCallData
                    });
                    
                    await this.provider.waitForTransaction(authTx.hash);
                    console.log(chalk.green(`   ✅ Token Approved: ${authTx.hash}`));
                }
            }

            const callData = this.contractInterface.encodeFunctionData("createEscrow", [
                hashBuf,
                recipient,
                timelockDurationSeconds,
                tokenAddress,
                tokenAddress === ethers.ZeroAddress ? 0 : amountWei
            ]);

            const txResult = await this.wdkAccount.sendTransaction({
                to: relayerConfig.ethereum.htlcAddress,
                value: tokenAddress === ethers.ZeroAddress ? BigInt(amountWei) : 0n,
                data: callData
            });
            
            console.log(chalk.blue(`   WDK Tx sent: ${txResult.hash}`));
            
            const receipt = await this.provider.waitForTransaction(txResult.hash);
            if (!receipt) throw new Error("Failed to get transaction receipt");
            
            const event = receipt.logs.find((log: any) => {
                try {
                    const parsed = this.contractInterface.parseLog(log);
                    return parsed?.name === 'EscrowCreated';
                } catch { return false; }
            });
            
            let escrowId = "0";
            if (event) {
                const parsedLog = this.contractInterface.parseLog(event);
                escrowId = parsedLog?.args.escrowId.toString() || "0";
            }
            
            console.log(chalk.green(`✅ Ethereum Escrow created (WDK): ID ${escrowId}`));
            return { txHash: receipt.hash, escrowId };
            
        } catch (error: any) {
            console.error(chalk.red('Failed to create Ethereum escrow via WDK:'), error.message);
            throw error;
        }
    }

    async claimEscrow(escrowId: string, secret: string): Promise<string> {
        console.log(chalk.cyan(`⚡ Claiming Ethereum Escrow ID ${escrowId} via WDK...`));
        if (!this.wdkAccount) throw new Error("WDK EVM Account not initialized");
        
        const secretHex = secret.startsWith('0x') ? secret : `0x${secret}`;
        
        try {
            const callData = this.contractInterface.encodeFunctionData("claim", [escrowId, secretHex]);

            const txResult = await this.wdkAccount.sendTransaction({
                to: relayerConfig.ethereum.htlcAddress,
                value: 0n,
                data: callData
            });
            
            await this.provider.waitForTransaction(txResult.hash);
            
            console.log(chalk.green(`✅ Ethereum Escrow Claimed (WDK): ${txResult.hash}`));
            return txResult.hash;
        } catch (error: any) {
            console.error(chalk.red('Failed to claim Ethereum escrow via WDK:'), error.message);
            throw error;
        }
    }

    async getEscrowDetails(escrowId: string): Promise<any> {
        try {
            const details = await this.contract.getEscrowDetails(escrowId);
            return {
                hashlock: details.hashlock,
                timelock: Number(details.timelock),
                sender: details.sender,
                recipient: details.recipient,
                amount: details.amount.toString(),
                tokenAddress: details.tokenAddress,
                claimed: details.claimed,
                refunded: details.refunded
            };
        } catch (error) {
            console.log(chalk.yellow(`Could not fetch details for Ethereum Escrow ID ${escrowId}`));
            return null;
        }
    }

    private detectedSecrets = new Map<string, string>();

    private setupClaimListener() {
        if (!relayerConfig.ethereum.htlcAddress) return;

        this.contract.on("EscrowClaimed", (escrowId, claimer, secret, amount, event) => {
            const idStr = escrowId.toString();
            const secretHex = secret.replace('0x', '');
            
            console.log(chalk.magenta(`🔔 [ETH Event] Escrow ${idStr} claimed by ${claimer}!`));
            console.log(chalk.magenta(`   Secret Revealed: ${secretHex}`));
            
            this.detectedSecrets.set(idStr, secretHex);
        });
    }

    public getDetectedSecret(escrowId: string): string | null {
        return this.detectedSecrets.get(escrowId) || null;
    }
}
