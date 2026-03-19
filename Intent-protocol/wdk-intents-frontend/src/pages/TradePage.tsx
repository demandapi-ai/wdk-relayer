import { useState } from 'react';
import { ArrowDownUp, ChevronDown, Zap, Lock, Info } from 'lucide-react';

const CHAINS = [
  { id: 'solana', name: 'Solana', symbol: 'SOL', icon: '◎', color: '#9945FF' },
  { id: 'bsc', name: 'BNB Chain', symbol: 'BNB', icon: '⬡', color: '#F0B90B' },
];

interface Token {
  symbol: string;
  name: string;
  icon: string;
  decimals: number;
}

const TOKEN_MAP: Record<string, Token[]> = {
  solana: [
    { symbol: 'USDC', name: 'USD Coin', icon: '💲', decimals: 6 },
    { symbol: 'SOL', name: 'Solana', icon: '◎', decimals: 9 },
  ],
  bsc: [
    { symbol: 'USDT', name: 'Tether USD', icon: '₮', decimals: 6 },
    { symbol: 'BNB', name: 'BNB', icon: '⬡', decimals: 18 },
  ],
};

export default function TradePage() {
  const [fromChain, setFromChain] = useState(CHAINS[0]);
  const [toChain, setToChain] = useState(CHAINS[1]);
  const [fromToken, setFromToken] = useState(TOKEN_MAP['solana'][0]);
  const [toToken, setToToken] = useState(TOKEN_MAP['bsc'][0]);
  const [amount, setAmount] = useState('');
  const [showFromChains, setShowFromChains] = useState(false);
  const [showToChains, setShowToChains] = useState(false);

  const outputAmount = amount ? (parseFloat(amount) * 0.999).toFixed(6) : '';

  const flipDirection = () => {
    const tmpChain = fromChain;
    const tmpToken = fromToken;
    setFromChain(toChain);
    setToChain(tmpChain);
    setFromToken(toToken);
    setToToken(tmpToken);
  };

  const selectFromChain = (chain: typeof CHAINS[0]) => {
    setFromChain(chain);
    setFromToken(TOKEN_MAP[chain.id][0]);
    setShowFromChains(false);
    // If same as toChain, swap them
    if (chain.id === toChain.id) {
      const other = CHAINS.find(c => c.id !== chain.id)!;
      setToChain(other);
      setToToken(TOKEN_MAP[other.id][0]);
    }
  };

  const selectToChain = (chain: typeof CHAINS[0]) => {
    setToChain(chain);
    setToToken(TOKEN_MAP[chain.id][0]);
    setShowToChains(false);
    if (chain.id === fromChain.id) {
      const other = CHAINS.find(c => c.id !== chain.id)!;
      setFromChain(other);
      setFromToken(TOKEN_MAP[other.id][0]);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 24, padding: '40px 24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

      {/* SWAP CARD */}
      <div className="glass-card" style={{ width: '100%', maxWidth: 480, padding: 0 }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-heading)' }}>Swap</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
            <Zap size={12} color="var(--color-accent-mint)" /> Cross-Chain
          </div>
        </div>

        <div style={{ padding: '20px 28px 28px' }}>
          {/* FROM */}
          <div className="swap-input-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>From</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Balance: —</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="number"
                className="swap-input"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{ flex: 1 }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                {/* Chain Picker */}
                <div style={{ position: 'relative' }}>
                  <button className="chain-selector" onClick={() => setShowFromChains(!showFromChains)}>
                    <span style={{ fontSize: 16 }}>{fromChain.icon}</span>
                    <span>{fromChain.symbol}</span>
                    <ChevronDown size={14} />
                  </button>
                  {showFromChains && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: 4,
                      background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
                      borderRadius: 12, padding: 6, minWidth: 160, zIndex: 20,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}>
                      {CHAINS.map(c => (
                        <button key={c.id} onClick={() => selectFromChain(c)} style={{
                          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                          padding: '10px 12px', border: 'none', borderRadius: 8,
                          background: c.id === fromChain.id ? 'rgba(0,147,147,0.15)' : 'transparent',
                          color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: 14,
                        }}>
                          <span style={{ fontSize: 18 }}>{c.icon}</span>
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Token */}
                <div className="chain-selector" style={{ cursor: 'default' }}>
                  <span>{fromToken.icon}</span>
                  <span>{fromToken.symbol}</span>
                </div>
              </div>
            </div>
          </div>

          {/* DIRECTION BUTTON */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '-12px 0', position: 'relative', zIndex: 5 }}>
            <button className="swap-direction-btn" onClick={flipDirection}>
              <ArrowDownUp size={18} />
            </button>
          </div>

          {/* TO */}
          <div className="swap-input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>To</span>
              <span style={{ fontSize: 12, color: 'var(--color-accent-mint)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Zap size={10} /> Instant Fill
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="text"
                className="swap-input"
                placeholder="0.00"
                value={outputAmount}
                readOnly
                style={{ flex: 1 }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ position: 'relative' }}>
                  <button className="chain-selector" onClick={() => setShowToChains(!showToChains)}>
                    <span style={{ fontSize: 16 }}>{toChain.icon}</span>
                    <span>{toChain.symbol}</span>
                    <ChevronDown size={14} />
                  </button>
                  {showToChains && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: 4,
                      background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
                      borderRadius: 12, padding: 6, minWidth: 160, zIndex: 20,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}>
                      {CHAINS.map(c => (
                        <button key={c.id} onClick={() => selectToChain(c)} style={{
                          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                          padding: '10px 12px', border: 'none', borderRadius: 8,
                          background: c.id === toChain.id ? 'rgba(0,147,147,0.15)' : 'transparent',
                          color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: 14,
                        }}>
                          <span style={{ fontSize: 18 }}>{c.icon}</span>
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="chain-selector" style={{ cursor: 'default' }}>
                  <span>{toToken.icon}</span>
                  <span>{toToken.symbol}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Route Info */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)',
            padding: '12px 0 16px', justifyContent: 'center',
          }}>
            <Info size={12} />
            {fromChain.symbol} → {toChain.symbol} via Intent Relayer • ~15s • 0.1% fee
          </div>

          {/* SWAP BUTTON */}
          <button className="btn-gradient" style={{ width: '100%', fontSize: 16, padding: '16px 0' }}>
            {amount ? 'Swap Now' : 'Enter Amount'}
          </button>

          {/* WDK Badge */}
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6,
            marginTop: 12, fontSize: 11, color: 'var(--color-text-muted)',
          }}>
            <Lock size={10} /> Self-Custodial via WDK Wallet
          </div>
        </div>
      </div>

      {/* SIDE PANEL */}
      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Live Rates */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            Live Rates
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block' }} />
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { pair: 'SOL / USD', price: '$148.50', color: '#9945FF' },
              { pair: 'BNB / USD', price: '$610.20', color: '#F0B90B' },
              { pair: 'USDT / USD', price: '$1.00', color: '#009393' },
            ].map(r => (
              <div key={r.pair} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{r.pair}</span>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: r.color }}>{r.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* How it Works */}
        <div className="glass-card" style={{ padding: 24, background: 'linear-gradient(135deg, rgba(0,147,147,0.08), rgba(108,92,231,0.05))' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>⚡ How it Works</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            <p>1. You sign an intent to swap tokens.</p>
            <p>2. Our <strong style={{ color: 'var(--color-text-primary)' }}>Intent Relayer</strong> detects your order.</p>
            <p>3. The Relayer <strong style={{ color: 'var(--color-accent-mint)' }}>instantly fills</strong> on the destination chain.</p>
            <p>4. Atomic & Trustless. No bridges.</p>
          </div>
        </div>

        {/* Supported Chains */}
        <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Chains:</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {CHAINS.map(c => (
              <span key={c.id} style={{
                fontSize: 20, width: 32, height: 32, display: 'flex',
                alignItems: 'center', justifyContent: 'center', borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
              }} title={c.name}>{c.icon}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
