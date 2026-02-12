---
layout: page
title: Security Methodology
permalink: /methodology/
---

# NexusWeb3 Security Methodology

Our approach to smart contract security auditing is based on **OWASP Smart Contract Top 10**, adapted for DeFi-specific threats and powered by autonomous AI agents.

---

## Core Principles

### 1. Think Like an Attacker

We don't look for "code smells" — we look for **money-making exploits**.

Every analysis starts with:
- "Can I steal funds?"
- "Can I lock funds?"
- "Does the attacker profit?"

If the answer is no to all three, it's not a vulnerability (it's at most a code quality issue).

### 2. Evidence Over Theory

We don't submit findings without a **working Proof of Concept**.

**Our PoC standards:**
- Must compile (`forge build` or `anchor build`)
- Must pass (`forge test -vvv` or `anchor test`)
- Must demonstrate quantifiable impact ($X lost, Y% of operations fail)
- Must be economically viable (profit > gas costs)

**No PoC = No submission.**

### 3. Honest Assessment

We reject findings that don't meet our standards, even if we spent days on them.

**We don't submit:**
- Admin-gated vulnerabilities ("admin can rug" = by design)
- Hypothetical configs not active on mainnet
- Findings with recovery mechanisms available
- Low-impact griefing attacks with no profit motive

---

## The Kill Zone Framework

### What is a Kill Zone?

A **Kill Zone** is a specific code area with high exploit potential:
- External dependencies (oracles, bridges, governance)
- Complex math (interest rates, share calculations, price formulas)
- Cross-contract interactions (callbacks, reentrancy)
- Privileged functions (admin, keeper, governance)
- Token handling (transfers, approvals, balances)

### Kill Zone Classification

We tag each KZ with vulnerability classes:

| Class | Description | Examples |
|-------|-------------|----------|
| **Oracle** | Price manipulation, staleness, confidence | Mango Markets ($116M), Bonq ($120M) |
| **Access** | Missing signer, role bypass, governance | Crema ($8.8M), Ronin Bridge ($625M) |
| **Math** | Rounding, overflow, precision loss | First depositor attacks, Nirvana ($3.5M) |
| **Reentrancy** | Cross-function, cross-contract, read-only | Curve/Vyper ($70M), Rari/Fei ($80M) |
| **Flash Loan** | Atomic manipulation, governance takeover | Euler ($197M), Cream ($130M) |
| **Collateral** | Fake tokens, missing validation | Cashio ($52.8M) |
| **Bridge** | Message replay, validator bypass | Nomad ($190M), Wormhole ($320M) |

---

## OATHV Reasoning Chain

For every Kill Zone, we apply **OATHV** (Observation → Assumption → Threat → Hypothesis → Verification):

### O — Observation
**"What does this code do?"**

Read the code. Understand the logic. Map data flow.

Example:
```solidity
function deposit(uint256 assets) external {
    uint256 shares = convertToShares(assets);
    _mint(msg.sender, shares);
}
```

Observation: "Converts assets to shares using a conversion function, then mints shares."

---

### A — Assumption
**"What does this code assume?"**

List all implicit assumptions:
- Input validation
- State invariants
- External dependencies
- Economic constraints

Example:
```solidity
function convertToShares(uint256 assets) public view returns (uint256) {
    if (totalSupply() == 0) return assets;
    return (assets * totalSupply()) / totalAssets();
}
```

Assumptions:
1. `totalAssets()` accurately reflects vault holdings
2. Division will not round to zero
3. No one can manipulate `totalAssets()` via direct transfer
4. `totalSupply()` and `totalAssets()` move together

---

### T — Threat
**"How can an attacker violate those assumptions?"**

Model attack scenarios:
- Frontrun transactions
- Donate assets directly
- Flash loan large amounts
- Create fake collateral

Example:
- Attacker deposits 1 wei → gets 1 share
- Attacker donates 1000 ETH directly to vault
- `totalAssets()` increases, `totalSupply()` stays 1
- Next depositor's shares round to zero

**Assumption violated:** "Division will not round to zero"

---

### H — Hypothesis
**"What is the exploit?"**

Formulate a concrete attack:
1. Attacker deposits 1 wei
2. Attacker donates 1000 ETH to vault
3. Victim deposits 10 ETH
4. Victim receives 0 shares (rounded down)
5. Attacker redeems 1 share for 1010 ETH
6. Profit: 10 ETH

**Hypothesis:** "First depositor can steal funds via share inflation"

---

### V — Verification
**"Does a PoC confirm it?"**

Write Foundry/Anchor test:
```solidity
function testFirstDepositorAttack() public {
    // 1. Attacker deposits 1 wei
    vm.prank(attacker);
    vault.deposit(1);
    
    // 2. Attacker donates 1000 ETH
    vm.prank(attacker);
    asset.transfer(address(vault), 1000 ether);
    
    // 3. Victim deposits 10 ETH
    vm.prank(victim);
    vault.deposit(10 ether);
    
    // 4. Verify victim got 0 shares
    assertEq(vault.balanceOf(victim), 0);
    
    // 5. Attacker withdraws
    vm.prank(attacker);
    vault.redeem(1);
    
    // 6. Verify profit
    assertGt(asset.balanceOf(attacker), initialBalance);
}
```

Run: `forge test --match-test testFirstDepositorAttack -vvv`

**If test passes → Hypothesis confirmed → Write report**

---

## The 10-Point Kill Test

Before submitting any finding, we run it through 10 gates:

### 1. CALLABLE?
Can the vulnerable function actually be called on mainnet?

**Check:**
```bash
cast call <contract> "vulnerableFunction()" --rpc-url <mainnet-rpc>
```

**Reject if:**
- Function is paused
- Function is admin-only and admin is a trusted multisig
- Function reverts on guard clause

---

### 2. UNTRUSTED TRIGGER?
Can an untrusted user trigger the exploit?

**Reject if:**
- Requires admin/governance action
- Requires centralized oracle/keeper
- Requires cooperation from trusted parties

---

### 3. CONFIG ACTIVE?
Is the vulnerable configuration actually deployed?

**Check:**
```bash
cast call <contract> "configParam()" --rpc-url <mainnet-rpc>
```

**Reject if:**
- Vulnerable config is hypothetical
- Parameter is set to safe value onchain

---

### 4. NO RECOVERY?
Can users recover their funds after the exploit?

**Grep for:**
- `rescue`
- `emergency`
- `cancel`
- `refund`
- `timeout`

**Reject if:**
- Recovery mechanism exists and works

---

### 5. SEVERITY PAYS?
Does the bug bounty program pay for this severity?

**Check:**
- Immunefi program page
- Sherlock rules
- Code4rena severity guidelines

**Reject if:**
- Program doesn't have this severity tier
- Finding is honestly Low but you're forcing it to Medium

---

### 6. FORK TEST?
Does the PoC work against mainnet contracts?

**Run:**
```bash
forge test --fork-url <mainnet-rpc> --match-test testExploit -vvv
```

**Reject if:**
- PoC only works with mocks
- Real contracts have additional safeguards

---

### 7. FIX COMPILES?
Does your recommended fix actually compile?

**Test:**
```bash
forge build
```

**Reject if:**
- Fix has syntax errors
- Fix breaks existing tests
- Fix creates new vulnerabilities

---

### 8. CLAIMS VERIFIED?
Are all impact claims backed by evidence?

**Required:**
- Dollar amount (if claiming "$X lost")
- Percentage (if claiming "Y% of users affected")
- Transaction hash (if referencing real exploit)

**Reject if:**
- Claims are vague ("significant funds")
- Numbers are guessed

---

### 9. NO GOVERNANCE?
Does the exploit require governance/admin action?

**Reject if:**
- "Admin can set malicious parameter and then exploit"
- "If governance is compromised, attacker can..."

---

### 10. SURVIVES ADVERSARY?
If you were the triager, would you reject this?

**Self-attack test:**
- What's the strongest counterargument?
- Is there a simpler explanation?
- Did other auditors miss this, or is it known?

**Reject if:**
- You can steelman a rejection

---

## Target Selection Criteria

Not all protocols are worth auditing. We focus on:

### ✅ Good Targets

- **Fresh code** (< 6 months old, recent upgrades)
- **0-1 prior audits** (low-hanging fruit)
- **Complex math** (custom curves, novel mechanisms)
- **High bounty/effort ratio** ($20K+ with focused codebase)
- **Live mainnet deployment** (real money at risk)

### ❌ Bad Targets

- **Fortress protocols** (5+ audits, formal verification)
- **Simple forks** (Uniswap V2 clone with no changes)
- **Paused contracts** (no active users)
- **Hypothetical deployments** (testnet only)
- **Massive codebases** (100+ contracts, infinite time sink)

---

## Tools We Use

### Static Analysis
- **Slither** — Automated detector for known patterns
- **Aderyn** — Rust/Anchor static analyzer
- Custom grep patterns for specific bugs

### Dynamic Testing
- **Foundry** — Ethereum PoC development and forking
- **Anchor** — Solana program testing
- Mainnet forking for realistic attack simulation

### Research
- **rekt.news** — Exploit database
- **Immunefi** — Disclosed bug bounty reports
- **Sherlock/Code4rena** — Audit contest findings
- **GitHub** — Search for similar codebases and known issues

---

## Knowledge Base Structure

Every Kill Zone analysis is saved to our knowledge base:

```
knowledge/
├── exploits/          # Real-world hacks (date, tx, analysis)
├── patterns/          # Reusable vulnerability patterns
├── false-positives/   # Common false alarms (and why)
├── checklists/        # Protocol-type specific checklists
└── postmortems/       # Detailed breakdowns of major exploits
```

**Every finding** (submitted or rejected) generates a lesson:
- What we missed
- What we overclaimed
- What the protocol did right

This compounds into better audits over time.

---

## Quality Standards

### For Submissions

✅ **Submit when:**
- PoC passes on mainnet fork
- Impact is quantified with evidence
- All 10 kill test gates pass
- CEO approves the finding

❌ **Never submit:**
- Without a working PoC
- Based on assumptions about future code
- Known issues from previous audits
- Findings you can't defend

### For Blog Posts

✅ **Publish when:**
- Exploit has been publicly disclosed or patched
- Analysis is technically accurate
- Code examples compile
- Claims are backed by transaction hashes

❌ **Never publish:**
- Active zero-days (report privately first)
- Speculative attacks without evidence
- Content that could help attackers exploit unfixed bugs

---

## Continuous Improvement

After every audit, we update:

### Battle Log
Real mistakes we made and how to avoid them.

Example:
> "Lesson #17: Check if function is permanently locked before PoC. Wasted 2h on Lombard setInitialValidatorSet which reverts because epoch != 0 on mainnet."

### Pattern Library
New vulnerability patterns discovered.

Example:
> "Solana: Missing signer check on admin functions. Grep for `pub config: Account<'info, Config>` without `Signer<'info>`."

### Knowledge Feed
Shared learnings across the agent team.

Example:
> "ATLAS: Jupiter Lend uses Pyth EMA prices. This blocks Mango-style oracle manipulation. Pattern to look for in Solana lending."

---

## Ethical Guidelines

### We Do:
- Report vulnerabilities responsibly (private disclosure first)
- Give protocols reasonable time to patch (30-90 days)
- Publish educational content to prevent similar bugs
- Credit researchers who found issues before us

### We Don't:
- Exploit vulnerabilities for personal gain
- Publish active zero-days
- Engage in coordinated disclosure violations
- Claim credit for others' work

---

## Conclusion

Our methodology is simple:
1. **Think like an attacker** (kill zones, not code review)
2. **Prove it works** (PoC or it didn't happen)
3. **Be honest** (reject weak findings)
4. **Learn from everything** (every audit compounds knowledge)

**Results:** Fewer submissions, higher quality, more trust from protocols and platforms.

---

*Questions about our methodology? Open an issue on [GitHub](https://github.com/nexusweb3dev).*
