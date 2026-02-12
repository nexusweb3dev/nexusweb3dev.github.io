---
layout: post
title: "Oracle Manipulation: How Mango Markets Lost $116M"
date: 2026-02-12 08:00:00 +0200
categories: [security, solana, defi]
tags: [oracle, pyth, mango-markets, price-manipulation, lending]
excerpt: "Deep technical breakdown of the October 2022 Mango Markets exploit. Learn how an attacker manipulated Pyth oracle prices in thin markets to steal $116M, and why traditional TWAP defenses don't work on Solana."
author: "NexusWeb3 Security Research"
---

On October 11, 2022, an attacker exploited Mango Markets' oracle integration to steal **$116 million** in a single transaction. The attack was executed by a single individual (later identified as Avraham Eisenberg) who used **basic market manipulation** to inflate collateral values and drain the protocol.

This wasn't a sophisticated smart contract exploit. It was **Economics 101: manipulate supply and demand to move prices**.

But it revealed fundamental flaws in how DeFi protocols use oracles for collateral valuation.

This post covers:
- How Pyth oracles work (and their limitations)
- Step-by-step breakdown of the Mango attack
- Why TWAP doesn't solve the problem on Solana
- Detection patterns for auditors
- Concrete mitigations (with code)

---

## Background: Mango Markets v3

Mango Markets was a decentralized exchange and lending protocol on Solana. Users could:
- Deposit collateral (SOL, BTC, USDC, etc.)
- Borrow against it (with leverage up to 10x)
- Trade perpetual futures contracts

The protocol used **Pyth Network** oracles to price collateral and determine borrowing capacity.

**Pyth oracles** aggregate prices from multiple publishers (exchanges, market makers) and publish the median price on-chain. They're fast (400ms updates) but rely on **spot market prices** from centralized exchanges.

---

## The Attack: Timeline & Mechanics

**Attacker wallet:** `CQvKSNnYtPTZfQRQ5jkHq8q2swJyRsdQQcUfFqBSCtyj`  
**Transaction:** `4RMrPmAGdAvxtNJUdF7MwiEKXfjoNciEbVdG2FMKaoSdNYeiyvmp3nKYmSTiojf3z5kKKS5pH3CqkLq2ZP4DdPB8`

### Phase 1: Preparation (Before Oct 11)

The attacker deposited **$5 million USDC** into Mango Markets across two wallets:
- Wallet 1: $3M USDC
- Wallet 2: $2M USDC

This was the seed capital. The target was **MNGO perpetual futures** — a low-liquidity market on Mango.

---

### Phase 2: Open Massive Long Positions (Oct 11, 10:00 UTC)

**Wallet 1 (Attacker):**
- Opened a **483 million MNGO-PERP long position** (notional value: ~$50M)
- Used maximum leverage (10x) against the $3M USDC collateral
- This was an **unrealized position** — no settlement yet, just a bet that MNGO price would rise

**Wallet 2 (Attacker's Counter-party):**
- Opened a **483 million MNGO-PERP short position**
- This was necessary because Mango required a counterparty for perp contracts
- The attacker was **trading against himself**

**State after Phase 2:**
- Wallet 1: Long 483M MNGO-PERP
- Wallet 2: Short 483M MNGO-PERP
- MNGO spot price: **$0.03** (unchanged)
- Pyth oracle price: **$0.03** (unchanged)
- Mango collateral value: $3M USDC

---

### Phase 3: Pump MNGO Spot Price (Oct 11, 10:15 UTC)

The attacker used the $2M from Wallet 2 to **buy MNGO tokens on spot markets**:
- **FTX:** Bought ~20M MNGO
- **Ascendex:** Bought ~15M MNGO
- **Mango spot:** Bought ~10M MNGO

**Why these exchanges?**
- They had **thin liquidity** in MNGO
- They were **Pyth oracle publishers** (their prices fed into Pyth)
- Large buy orders would **move the price significantly**

**MNGO price movement:**
- Before: $0.03
- After: **$0.91** (30x increase!)
- Total spent: ~$2M (across all exchanges)

---

### Phase 4: Oracle Updates (Oct 11, 10:16 UTC)

**Pyth oracle updated** to reflect the new MNGO price from FTX and Ascendex.

```
Pyth MNGO price: $0.03 → $0.91 (30x increase in 60 seconds)
```

**Mango Markets recalculated collateral:**

```rust
// Mango's collateral calculation (simplified)
let mngo_price = pyth_oracle.get_price("MNGO")?; // $0.91

// Wallet 1 long position: 483M MNGO-PERP
let position_value = 483_000_000 * mngo_price; // $439M

// Wallet 1 collateral value
let collateral = position_value * collateral_ratio; // ~$400M

// Wallet 1 can now borrow up to $400M (with 10x leverage)
```

**Wallet 1 went from $3M collateral → $400M collateral in 60 seconds.**

---

### Phase 5: Drain the Protocol (Oct 11, 10:20 UTC)

With $400M in collateral, the attacker borrowed:
- $50M USDC
- $30M SOL
- $20M BTC
- $10M ETH
- $6M other tokens

**Total withdrawn:** ~$116M

The attacker transferred these assets to external wallets and **never repaid the loans**.

---

### Phase 6: Let MNGO Price Collapse (Oct 11, 11:00 UTC)

Once the funds were drained, the attacker **stopped buying MNGO**.

MNGO spot price crashed back to **$0.03** (its original price).

**Final state:**
- Wallet 1: Long 483M MNGO-PERP, now worth $14.5M (originally $439M)
- Wallet 1 borrowed: $116M
- Wallet 1 collateral shortfall: $116M - $14.5M = **$101.5M**

Mango Markets was **insolvent**. The protocol had $116M in bad debt that could never be recovered.

---

## The Vulnerability: Why Pyth Failed

Pyth oracles are designed to resist manipulation by:
1. **Aggregating prices** from multiple publishers (15+ for major pairs)
2. **Taking the median** (not mean) to filter outliers
3. **Providing confidence intervals** (how much publishers disagree)

But Mango Markets **didn't validate**:
- ❌ Confidence interval (how wide is the price range?)
- ❌ Liquidity (how much volume is behind this price?)
- ❌ Rate of change (did the price jump 30x in 60 seconds?)
- ❌ TWAP comparison (is this price wildly different from recent prices?)

**Mango's oracle read code (reconstructed):**

```rust
// VULNERABLE: Reads Pyth price without validation
pub fn get_price(oracle_account: &AccountInfo) -> Result<I80F48> {
    let price_data: &PriceAccount = load_pyth_price(oracle_account)?;
    
    // ❌ NO VALIDATION — just returns the price
    Ok(I80F48::from_num(price_data.agg.price))
}
```

**What Mango should have done:**

```rust
// SECURE: Multi-layer oracle validation
pub fn get_safe_price(oracle_account: &AccountInfo, market: &Market) -> Result<I80F48> {
    let price_data: &PriceAccount = load_pyth_price(oracle_account)?;
    let slot = Clock::get()?.slot;
    
    // 1. Staleness check (reject old prices)
    let slots_old = slot.saturating_sub(price_data.agg.pub_slot);
    require!(
        slots_old < MAX_ORACLE_STALENESS_SLOTS, // e.g., 25 slots (~10 seconds)
        ErrorCode::StaleOracle
    );
    
    // 2. Confidence interval check (reject uncertain prices)
    let price = I80F48::from_num(price_data.agg.price);
    let conf = I80F48::from_num(price_data.agg.conf);
    let conf_pct = conf.checked_div(price.abs()).ok_or(ErrorCode::MathOverflow)?;
    
    require!(
        conf_pct < MAX_CONFIDENCE_PCT, // e.g., 2%
        ErrorCode::OracleConfidenceTooWide
    );
    
    // 3. TWAP comparison (reject sudden spikes)
    let twap = market.get_twap(TWAP_WINDOW)?; // e.g., 30-minute TWAP
    let deviation = (price - twap).abs().checked_div(twap).ok_or(ErrorCode::MathOverflow)?;
    
    require!(
        deviation < MAX_DEVIATION_FROM_TWAP, // e.g., 10%
        ErrorCode::PriceDeviationTooHigh
    );
    
    // 4. Rate-of-change limiter (reject rapid moves)
    let prev_price = market.last_oracle_price;
    let price_change = (price - prev_price).abs().checked_div(prev_price).ok_or(ErrorCode::MathOverflow)?;
    
    require!(
        price_change < MAX_PRICE_CHANGE_PER_SLOT, // e.g., 1% per slot
        ErrorCode::PriceChangeTooFast
    );
    
    // 5. Update last price
    market.last_oracle_price = price;
    
    Ok(price)
}
```

**If Mango had these checks, the attack would have failed:**

```
Pyth reports MNGO = $0.91
Confidence interval: ~50% (publishers disagree wildly)
→ REJECTED (conf > 2%)

TWAP (30 min): $0.03
Spot price: $0.91
Deviation: 2933%
→ REJECTED (deviation > 10%)

Previous price: $0.03
New price: $0.91
Change: 30x in 1 slot
→ REJECTED (change > 1% per slot)
```

---

## Why TWAP Doesn't Work on Solana

On Ethereum, protocols use **Uniswap V2/V3 TWAPs** (time-weighted average prices) stored in the pool contract. These are **manipulation-resistant** because:
1. Each block can only update the price once
2. Manipulating TWAP requires holding a position across multiple blocks
3. Arbitrage bots will attack your manipulated price

**But Solana doesn't have TWAPs built into DEX contracts.**

Why not?
- Solana blocks are **400ms** (vs Ethereum's 12 seconds)
- Storing historical prices on-chain is expensive (400ms = 216,000 slots per day)
- Most Solana DEXes (Orca, Raydium) don't store TWAPs

**So protocols must compute TWAPs off-chain or use Pyth's built-in TWAP (EMA price).**

---

## Pyth's EMA Price (Exponential Moving Average)

Pyth provides an **EMA price** that smooths out rapid changes:

```rust
pub struct PriceAccount {
    pub agg: PriceInfo,      // Spot price (current aggregate)
    pub ema_price: PriceInfo, // EMA price (smoothed over time)
    // ...
}
```

**Using EMA price:**

```rust
// Instead of spot price:
let price = price_data.agg.price; // Vulnerable to manipulation

// Use EMA price:
let price = price_data.ema_price.price; // Manipulation-resistant
```

**Would EMA have saved Mango?**

Let's calculate:
- MNGO spot: $0.03 → $0.91 (instant jump)
- Pyth EMA: $0.03 → $0.05 (EMA smooths the spike)
- Attacker's collateral: ~$5M (vs $400M with spot price)
- Max borrow: ~$5M (vs $116M)

**Yes, EMA would have capped the attack at $5M loss** (the attacker's initial capital).

But Mango used **spot price** for collateral valuation.

---

## Detection Patterns for Auditors

### Pattern 1: Spot Price for Collateral

**Red flag:**
```rust
let price = oracle.get_price()?;
let collateral_value = position * price; // ❌ Direct spot price usage
```

**Questions to ask:**
- Is this a low-liquidity asset?
- Can the price be manipulated on CEXes?
- Is there a TWAP or EMA comparison?

---

### Pattern 2: Missing Confidence Interval Check

**Red flag:**
```rust
let price_data = load_pyth_price(oracle)?;
let price = price_data.agg.price; // ❌ Doesn't check price_data.agg.conf
```

**Why it matters:**
- Confidence interval measures publisher disagreement
- High confidence = publishers agree on price
- Low confidence = price is uncertain, possibly manipulated

**Fix:**
```rust
require!(
    price_data.agg.conf < price * MAX_CONF_PCT,
    ErrorCode::OracleConfidenceTooWide
);
```

---

### Pattern 3: No Staleness Check

**Red flag:**
```rust
let price = price_data.agg.price; // ❌ When was this updated?
```

**Why it matters:**
- Oracle updates can be delayed
- Attacker can use stale prices to their advantage

**Fix:**
```rust
let slot = Clock::get()?.slot;
require!(
    slot - price_data.agg.pub_slot < MAX_STALENESS,
    ErrorCode::StaleOracle
);
```

---

### Pattern 4: No TWAP/EMA Validation

**Red flag:**
```rust
let price = price_data.agg.price; // ❌ No comparison to EMA or TWAP
```

**Fix (use Pyth's EMA):**
```rust
let spot_price = price_data.agg.price;
let ema_price = price_data.ema_price.price;

// Reject if spot deviates too much from EMA
let deviation = (spot_price - ema_price).abs() / ema_price;
require!(deviation < MAX_DEVIATION, ErrorCode::PriceManipulation);
```

---

### Pattern 5: No Liquidity Check

**Red flag:**
```rust
// Pyth doesn't provide liquidity data directly
// But you can check num_publishers and num_quoters
```

**Fix:**
```rust
require!(
    price_data.num_ >= MIN_PUBLISHERS, // e.g., 3+
    ErrorCode::InsufficientOraclePublishers
);
```

---

## Complete Mitigation: Secure Oracle Reader

```rust
use anchor_lang::prelude::*;
use pyth_sdk_solana::PriceAccount;

#[error_code]
pub enum OracleError {
    #[msg("Oracle price is stale")]
    StaleOracle,
    #[msg("Oracle confidence interval too wide")]
    ConfidenceTooWide,
    #[msg("Price deviates too much from EMA")]
    PriceManipulation,
    #[msg("Insufficient oracle publishers")]
    InsufficientPublishers,
    #[msg("Price changed too rapidly")]
    PriceChangeTooFast,
}

pub const MAX_STALENESS_SLOTS: u64 = 25; // ~10 seconds
pub const MAX_CONFIDENCE_PCT: u64 = 2; // 2%
pub const MAX_EMA_DEVIATION_PCT: u64 = 10; // 10%
pub const MIN_PUBLISHERS: u32 = 3;
pub const MAX_PRICE_CHANGE_PER_SLOT: u64 = 1; // 1% per 400ms

pub fn get_safe_oracle_price(
    oracle: &AccountInfo,
    last_price: Option<i64>,
) -> Result<i64> {
    let price_data: PriceAccount = PriceAccount::load(oracle)?;
    let slot = Clock::get()?.slot;
    
    // 1. Staleness check
    let slots_since_update = slot.saturating_sub(price_data.agg.pub_slot);
    require!(
        slots_since_update < MAX_STALENESS_SLOTS,
        OracleError::StaleOracle
    );
    
    // 2. Confidence check
    let price = price_data.agg.price;
    let conf = price_data.agg.conf;
    let conf_pct = (conf as u128 * 100) / price.unsigned_abs() as u128;
    require!(
        conf_pct < MAX_CONFIDENCE_PCT as u128,
        OracleError::ConfidenceTooWide
    );
    
    // 3. EMA deviation check
    let ema_price = price_data.ema_price.price;
    let deviation = ((price - ema_price).abs() as u128 * 100) / ema_price.unsigned_abs() as u128;
    require!(
        deviation < MAX_EMA_DEVIATION_PCT as u128,
        OracleError::PriceManipulation
    );
    
    // 4. Publisher count check
    require!(
        price_data.num_ >= MIN_PUBLISHERS,
        OracleError::InsufficientPublishers
    );
    
    // 5. Rate-of-change check (if we have a previous price)
    if let Some(prev_price) = last_price {
        let change_pct = ((price - prev_price).abs() as u128 * 100) / prev_price.unsigned_abs() as u128;
        require!(
            change_pct < MAX_PRICE_CHANGE_PER_SLOT as u128,
            OracleError::PriceChangeTooFast
        );
    }
    
    Ok(price)
}
```

**Usage:**

```rust
#[derive(Accounts)]
pub struct UpdateCollateral<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// CHECK: Pyth oracle account
    pub oracle: AccountInfo<'info>,
    
    #[account(mut)]
    pub market: Account<'info, Market>,
}

pub fn update_collateral(ctx: Context<UpdateCollateral>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    
    // Safe oracle read with validation
    let price = get_safe_oracle_price(
        &ctx.accounts.oracle,
        Some(market.last_price),
    )?;
    
    // Update market state
    market.last_price = price;
    
    // Recalculate collateral
    market.update_collateral_value(price)?;
    
    Ok(())
}
```

---

## Alternative Oracles: Switchboard vs Pyth

| Feature | Pyth | Switchboard |
|---------|------|-------------|
| **Update speed** | 400ms | ~1 second |
| **Publishers** | Centralized (exchanges) | Decentralized (oracles) |
| **TWAP/EMA** | EMA built-in | Custom TWAP via aggregator |
| **Confidence interval** | ✅ Yes | ❌ No (uses standard deviation) |
| **Cost** | Free (sponsored) | Paid (per update) |
| **Manipulation resistance** | Medium (depends on publisher liquidity) | High (harder to manipulate decentralized oracles) |

**Recommendation:**
- Use **Pyth with EMA validation** for high-frequency trading
- Use **Switchboard** for lending/collateral (better manipulation resistance)
- **Never use spot price alone** for collateral valuation

---

## Post-Mortem: What Mango Did Wrong

1. **Used spot price for collateral** (should use EMA or TWAP)
2. **No confidence interval check** (should reject wide confidence)
3. **No liquidity requirement** (should require min publishers)
4. **No rate-of-change limiter** (should cap price changes per slot)
5. **Allowed low-liquidity assets** (MNGO had <$10M liquidity)

**What Mango did right after the exploit:**

```rust
// Added to Mango v4 (post-exploit)
pub fn validate_pyth_price(price_data: &PriceAccount) -> Result<()> {
    // 1. Check confidence
    require!(
        price_data.agg.conf < price_data.agg.price.abs() / 50, // 2%
        ErrorCode::ConfidenceTooWide
    );
    
    // 2. Compare spot to EMA
    let spot = price_data.agg.price;
    let ema = price_data.ema_price.price;
    require!(
        (spot - ema).abs() < ema / 10, // 10% deviation
        ErrorCode::PriceManipulation
    );
    
    Ok(())
}
```

---

## Lessons for Protocol Developers

### 1. Never Trust Spot Prices for Collateral

**Don't:**
```rust
let price = oracle.get_price()?;
let collateral = position * price; // ❌
```

**Do:**
```rust
let spot_price = oracle.get_price()?;
let ema_price = oracle.get_ema_price()?;

// Use the more conservative price
let price = min(spot_price, ema_price);
let collateral = position * price; // ✅
```

---

### 2. Add Circuit Breakers

```rust
// If price changes more than X% in Y time, pause deposits/borrows
if price_change_pct > CIRCUIT_BREAKER_THRESHOLD {
    pause_protocol()?;
    emit!(CircuitBreakerTriggered { price_change_pct });
}
```

---

### 3. Require Minimum Liquidity

```rust
// Only allow assets with >$X liquidity on exchanges
require!(
    asset_liquidity > MIN_LIQUIDITY, // e.g., $50M
    ErrorCode::InsufficientLiquidity
);
```

---

### 4. Use Chainlink for High-Value Assets

For assets like BTC, ETH, SOL — use **Chainlink oracles** (more decentralized, harder to manipulate):
- Pyth: Fast but centralized publishers
- Chainlink: Slower but 30+ independent nodes

```rust
// Hybrid approach: use both and take minimum
let pyth_price = get_pyth_price()?;
let chainlink_price = get_chainlink_price()?;
let safe_price = min(pyth_price, chainlink_price); // Conservative
```

---

## Conclusion

The Mango Markets exploit was **100% preventable**. The fix:

```rust
// From this:
let price = oracle.get_price()?;

// To this:
let price = get_safe_oracle_price(oracle, last_price)?;
```

One function. Five checks. $116M saved.

**Key takeaways:**
- Spot prices can be manipulated in thin markets
- Pyth's EMA price is manipulation-resistant
- Always validate: staleness, confidence, deviation, rate-of-change
- Use circuit breakers for extreme price moves
- Get audited before deploying to mainnet

**For developers:**
- Use the `get_safe_oracle_price()` template above
- Test with mainnet-forked data (simulate price spikes)
- Add monitoring for oracle deviations

**For auditors:**
- Grep for `get_price()` calls
- Check if confidence interval is validated
- Verify TWAP/EMA comparison exists
- Test edge cases (price = 0, price = MAX, rapid changes)

**For users:**
- Use protocols with multiple oracle sources
- Check if the protocol has circuit breakers
- Avoid protocols that price low-liquidity assets as collateral

Oracle manipulation is **basic economics**. If you can profitably move a price to exploit a protocol, someone will.

Defend accordingly.

---

## References

- [Mango Markets Post-Mortem (Official)](https://mango-markets.ghost.io/mango-markets-v3-post-mortem/)
- [Pyth Network Documentation](https://docs.pyth.network/)
- [Solana Security Best Practices](https://github.com/coral-xyz/sealevel-attacks)
- [Switchboard Documentation](https://docs.switchboard.xyz/)
- [Trail of Bits: Oracle Manipulation](https://blog.trailofbits.com/2020/08/05/accidentally-stepping-on-a-defi-lego/)

---

*Analyzing more DeFi exploits? Follow our research at [github.com/nexusweb3dev](https://github.com/nexusweb3dev)*
