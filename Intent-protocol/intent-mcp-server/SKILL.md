---
name: WDK Intent Swap Protocol
description: Teaches the agent to execute atomic cross-chain trades, tips, and automated purchases autonomously using the WDK Wallet and Intent MCP Server.
version: 1.0.0
---

# WDK Intent Swap Protocol Agent Skill

This skill provides the Agent with the ability to execute completely autonomous, self-custodial cross-chain transactions between EVM networks (BSC/Ethereum) and Solana. It leverages the Model Context Protocol (MCP) server `intent-mcp-server` which holds a headless WDK Wallet.

## Available Tools

- `create_intent_swap`: Creates the cryptographic hashlock Escrow across chains. The MCP server will automatically sign and broadcast the escrow locking transaction using the Agent's configured WDK wallet.
- `claim_dest_funds`: Retrieves funds on the destination chain once the Relayer fills the intent.

## How to use this skill

Always evaluate the user's prompt to see if it requires cross-chain movement, or if it is an automated payment condition (e.g. "tip X when Y happens").

### Use Case 1: The Cross-Chain Tipping Bot

Users may ask you to automatically tip creators across chains based on arbitrary logic or schedules.

**Example User Prompt:**
> "Tip this podcast creator 0.05 BNB (to their Solana address: `7Jd6dTbn...`) if Solana goes up 1% today."

**Agent Thought Process:**
1. Use default WDK Pricing tools (e.g., `getCurrentPrice`) to monitor the price of SOL.
2. If the condition is met (up 1%), recognize that the source asset (BNB) is on BSC, but the destination is Solana.
3. Call `create_intent_swap` with:
   - `sourceChain`: `bsc`
   - `destChain`: `solana`
   - `sellAmount`: `0.05`
   - `destRecipientAddress`: The podcast creator's Solana address.
4. The MCP server will autonomously generate the hashlock, sign the BNB Ethers transaction natively using the Agent's WDK wallet, and broadcast the tip intent.

### Use Case 2: The Pizza Automation ("Wen Price")

Users may ask you to execute real-world payments or cross-chain purchases when market conditions align.

**Example User Prompt:**
> "Buy me a pizza ($25 USDC) and send it to merchant address `0xABC...` on BSC when the price of Solana hits $200."

**Agent Thought Process:**
1. Monitor Solana price via WDK pricing tools.
2. When the price hits $200, initiate the payment. If the Agent's funds are currently held in USDC on Solana, but the merchant expects USDC on BSC, a cross-chain intent is required.
3. Call `create_intent_swap` targeting the merchant's EVM address. The autonomous WDK Wallet will sign the Anchor program escrow on Solana natively and emit the event to the Relayer.

### Security and Execution Rules
1. **Never** expose the `AGENT_SEED_PHRASE` in your chat output. The MCP Server manages the WDK instance securely.
2. **Always** summarize the executed Intent ID and the transaction hash to the user after calling `create_intent_swap`.
3. The Agent does not need to prompt the user to "sign" the transaction. The Intent MCP Server is operating an **Autonomous Agentic Wallet**; executing the tool executes the transaction on-chain via WDK.
