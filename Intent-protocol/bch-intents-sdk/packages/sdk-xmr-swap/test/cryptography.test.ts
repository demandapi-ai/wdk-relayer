import { generateEd25519Keypair } from '../src/crypto/ed25519.js';
import { generateSecp256k1Keypair } from '../src/crypto/secp256k1.js';
import { XmrSwapOrchestrator } from '../src/XmrSwapOrchestrator.js';

async function testAdaptorMath() {
    console.log('[===== XMR Adaptor Protocol Cryptography Test =====]');

    // --- Phase 1: Maker Setup (Locks BCH) ---
    console.log('\n--- Maker Setup ---');
    // 1. Maker creates a Monero Spend Key
    const makerXmrKeys = generateEd25519Keypair();
    const makerSpendKeyHex = Buffer.from(makerXmrKeys.privateKey).toString('hex');
    console.log('Maker Generated XMR Spend Key (Private):', makerSpendKeyHex);

    // 2. Maker derives the Adaptor Point (Tnonce) from their XMR key
    const { adaptorPointHex, adaptorPointBytes } = XmrSwapOrchestrator.lockBchFundAndGenerateT(makerXmrKeys.privateKey);
    console.log('Maker Computes Adaptor Point (Tnonce) for PTLC:', adaptorPointHex);


    // --- Phase 2: Taker Setup (Solver) ---
    console.log('\n--- Solver Setup ---');
    // Solver creates a BCH keypair to act as the eventual signer taking the BCH
    const solverBchKeys = generateSecp256k1Keypair();
    console.log('Solver Base BCH Key Generated');


    // --- Phase 3: The Swap ---
    console.log('\n--- The Reveal & Extraction ---');
    // For the PTLC to be claimed, a final signature must be broadcasted on BCH.
    // In our simplified math proof setup, the Solver (Taker) would create an incomplete signature (`s' = k + e * x`), 
    // and the Maker completes it by adding the hidden XMR secret scalar.

    // Let's mock a BCH Signature execution.
    // Let `s_bch` be the final fully valid Schnorr signature scalar broadcast by the Maker on BCH.
    // Mathematically in an Adaptor structure: s_bch = s_solver + s_maker_xmr

    // Thus, an extracted Monero secret is inherently just the subtraction of the solver's known scalar 
    // from the broadcast full scalar. Let's spoof the math directly using the curve library to prove scalar subtraction works.

    // Spoofing the signature scalars:
    const scalarXmr = BigInt(`0x${makerSpendKeyHex}`);
    const scalarSolverNonce = BigInt('123456789012345678901234567890'); // Random solver nonce

    // The final broadcast signature scalar would be (XmrScalar + SolverNonce) mod N
    // We compute this "broadcasted" scalar normally.
    const { secp256k1 } = await import('@noble/curves/secp256k1');
    const ORDER = secp256k1.CURVE.n;

    const broadcastSignatureScalar = (scalarXmr + scalarSolverNonce) % ORDER;
    const finalBroadcastHex = broadcastSignatureScalar.toString(16);
    console.log('Maker broadcasts final PTLC transaction. Signature Scalar reveals as:', finalBroadcastHex);

    // Now the Solver sees `finalBroadcastHex` on the BCH blockchain.
    // Solver extracts the XMR key: Extracted_XMR = BroadcastedSig - SolverNonce
    const solverNonceHex = scalarSolverNonce.toString(16);
    const extractedXmrKeyBytes = XmrSwapOrchestrator.discoverXmrSpendKeyFromBchSignature(finalBroadcastHex, solverNonceHex);

    const extractedXmrHex = Buffer.from(extractedXmrKeyBytes).toString('hex');
    console.log('\nSolver Extracted XMR Key:        ', extractedXmrHex);
    console.log('Original Maker XMR Spend Key:    ', makerSpendKeyHex);

    if (extractedXmrHex === makerSpendKeyHex) {
        console.log('\n✅ Extraction SUCCESS! Mathematics match.');
        process.exit(0);
    } else {
        console.error('\n❌ Extraction FAILED!');
        process.exit(1);
    }
}

testAdaptorMath().catch(console.error);
