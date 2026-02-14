# The Preview vs Actual Mismatch: A Silent Bug Class in DeFi Protocols

When users interact with DeFi protocols, they rely on preview functions to estimate outcomes before committing transactions. A deposit preview shows expected shares. A withdrawal preview displays the anticipated token amount. But what happens when the preview lies?

This isn't about malicious intent. It's about **implementation divergence** — when a protocol's preview function uses different math than the actual execution function. The result? Users see one number, receive another, and trust erodes.

## The Pattern

The vulnerability pattern appears in three-part systems:

1. **Preview/Calculate Function** — Pure view function, no state changes, estimates outcome
2. **Actual Execution Function** — State-changing function, performs the real operation
3. **The Gap** — Different formulas, constants, or safety margins between preview and actual

### Real-World Discovery

In recent security research of a leverage protocol, we discovered a **12% discrepancy** between withdrawal preview and actual execution.

**The Preview Function**:
```solidity
function calculateUnwindParams(uint256 amountToUnwind) 
    public 
    view 
    returns (uint256 flashLoanAmount) 
{
    // Uses a 5% slippage buffer
    flashLoanAmount = baseAmount * 1.05;
    return flashLoanAmount;
}
```

**The Actual Execution**:
```solidity
function _executeUnwindOperation(uint256 amountToUnwind) 
    internal 
    returns (uint256 actualFlashLoan) 
{
    // Uses liquidation threshold (e.g., 85%)
    actualFlashLoan = baseAmount * 10000 / liqThreshold; // ~117% if liqThreshold = 8500
    return actualFlashLoan;
}
```

**The Impact:**
- User calls `calculateUnwindParams(1000e18)` → UI shows "You'll need to repay 1,050 tokens"
- User executes withdrawal → Protocol actually requests 1,170 tokens
- **12% more debt than expected** — potentially causing transaction revert or unexpected liquidation

While the protocol team likely added different safety mechanisms with good intentions (slippage protection vs liquidation safety), the **user-facing inconsistency** is the bug.

## Why This Matters

### 1. Trust Degradation
Users rely on previews to make informed decisions. When actual outcomes differ significantly, even if the protocol is "safe," user confidence collapses.

### 2. Transaction Failures
If a user approves tokens based on the preview amount, and the actual execution requires more, the transaction reverts. This wastes gas and creates poor UX.

### 3. Economic Exploitation
In worst-case scenarios, attackers can exploit the discrepancy:
- If the preview overestimates, an attacker might receive more than they should
- If the preview underestimates, users may unknowingly over-approve tokens, creating an attack surface

### 4. Regulatory & Audit Risk
Disclosing one value and delivering another can be interpreted as misleading users, potentially violating consumer protection standards.

## Detection Strategy

Every security researcher and protocol developer should add this to their checklist:

### Step 1: Identify Preview/Calculate Functions
```bash
# Search for common preview function patterns
grep -rn "calculate\|preview\|estimate\|simulate" src/

# Look for view/pure functions that return amounts
grep -rn "function.*view.*returns.*uint" src/
```

### Step 2: Find Corresponding Execution Functions
For each preview function, identify the actual state-changing function:
```bash
# If preview is calculateUnwind, find executeUnwind or _unwind
grep -rn "function.*Unwind\|function.*_unwind" src/
```

### Step 3: Compare Formulas Line-by-Line
Extract the core calculation from BOTH functions and compare:

**Preview:**
```solidity
flashLoanAmount = baseAmount * 1.05;
```

**Actual:**
```solidity
actualFlashLoan = baseAmount * 10000 / liqThreshold;
```

**Test with realistic values:**
```solidity
uint256 baseAmount = 1000e18;
uint256 liqThreshold = 8500; // 85%

// Preview: 1,050e18
uint256 previewResult = baseAmount * 105 / 100;

// Actual: 1,176e18
uint256 actualResult = baseAmount * 10000 / 8500;

// Discrepancy: 126e18 (12.6% gap!)
```

### Step 4: Build a Proof-of-Concept Test
Write a Foundry test that calls BOTH functions and asserts they match:

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";

contract PreviewMismatchTest is Test {
    Protocol protocol;

    function setUp() public {
        protocol = new Protocol();
    }

    function testPreviewMatchesActual() public {
        uint256 amount = 1000e18;

        uint256 previewResult = protocol.calculateUnwindParams(amount);
        uint256 actualResult = protocol.executeUnwind(amount);

        // Assert they match within 1% tolerance
        uint256 tolerance = amount * 1 / 100;
        assertApproxEqAbs(
            previewResult, 
            actualResult, 
            tolerance, 
            "Preview and actual differ by more than 1%"
        );
    }
}
```

If the test fails with a 12% gap, you've confirmed the bug.

## Prevention Patterns

### Pattern 1: Single Source of Truth
Refactor so preview and actual call the SAME internal calculation function.

```solidity
contract SecureProtocol {
    // Internal function: single source of truth
    function _calculateFlashLoan(uint256 baseAmount) 
        internal 
        view 
        returns (uint256) 
    {
        return baseAmount * 10000 / liqThreshold;
    }

    // Preview function calls internal
    function calculateUnwindParams(uint256 amount) 
        public 
        view 
        returns (uint256) 
    {
        return _calculateFlashLoan(amount);
    }

    // Actual execution calls SAME internal function
    function executeUnwind(uint256 amount) external {
        uint256 flashLoan = _calculateFlashLoan(amount);
        // ... perform state changes
    }
}
```

**Result:** Preview and actual are mathematically identical.

### Pattern 2: Document and Bound Discrepancies
If different safety margins are intentional, **document it clearly and bound the maximum deviation.**

```solidity
contract TransparentProtocol {
    uint256 public constant MAX_DEVIATION = 200; // 2% max

    function calculateUnwindParams(uint256 amount) 
        public 
        view 
        returns (uint256 estimated, uint256 maxActual) 
    {
        uint256 baseCalc = amount * 10000 / liqThreshold;
        estimated = baseCalc;
        maxActual = baseCalc * (10000 + MAX_DEVIATION) / 10000;
        return (estimated, maxActual);
    }

    function executeUnwind(uint256 amount) external {
        (uint256 estimated, uint256 maxActual) = calculateUnwindParams(amount);
        uint256 actual = /* real execution logic */;
        
        require(actual <= maxActual, "Execution exceeded preview max bound");
    }
}
```

**Result:** Users see both the estimate AND the worst-case upper bound.

### Pattern 3: Automated Testing in CI/CD
Add automated tests that run on every commit:

```solidity
contract FuzzPreviewConsistency is Test {
    function testFuzz_PreviewMatchesActual(uint256 amount) public {
        amount = bound(amount, 1e18, 1_000_000e18);

        uint256 preview = protocol.calculateUnwind(amount);
        uint256 actual = protocol.executeUnwind(amount);

        assertApproxEqRel(preview, actual, 0.01e18); // 1% tolerance
    }
}
```

Run with `forge test --fuzz-runs 10000` to catch discrepancies across edge cases.

## When is a Discrepancy Acceptable?

Not all preview-vs-actual gaps are bugs. Legitimate cases include:

1. **Slippage Protection** — Preview shows 100 tokens, actual allows 98-102 (2% tolerance)
2. **Gas Estimation** — Preview estimates gas, actual may vary slightly
3. **Time-Dependent Calculations** — Interest accrual between preview and actual (documented and bounded)

**Key principle:** If the deviation is **documented**, **bounded** (<2%), and **necessary** for security, it's a design choice. If it's **undocumented**, **unbounded**, or **unnecessary** — it's a vulnerability.

## Severity Assessment

| Deviation | User Impact | Economic Risk | Severity |
|-----------|-------------|---------------|----------|
| <1% | Minor UX friction | Negligible | **LOW** |
| 1-5% | Moderate UX friction | Small economic loss | **MEDIUM** |
| 5-20% | Transaction failures | Moderate loss or liquidation risk | **HIGH** |
| >20% | Total failure | Severe loss or exploit vector | **CRITICAL** |

A 12% gap falls into the **HIGH** category — users experience unexpected outcomes, and liquidation risk increases.

## Real-World Prevalence

This pattern appears in:
- **Vaults** — Deposit/withdraw previews vs actual share calculations
- **Lending Protocols** — Borrow limit previews vs actual liquidation math
- **DEX Aggregators** — Swap quotes vs actual execution slippage
- **Staking Protocols** — Reward previews vs actual distribution

We've seen this in:
- ERC-4626 vaults with rounding discrepancies (preview rounds down, actual rounds up)
- Aave-style lending where health factor preview doesn't match liquidation trigger
- Uniswap V3 range order previews that don't account for tick spacing

## Key Takeaways

1. **Preview and actual functions MUST use the same calculation logic** — refactor to a shared internal function
2. **If discrepancies are intentional, document and bound them** — return both estimate and max/min bounds
3. **Always test preview vs actual with realistic and extreme inputs** — fuzz testing catches edge cases
4. **Users trust previews to make informed decisions** — breaking that trust is a UX and security failure
5. **Add this to your audit checklist** — grep for `calculate*` and `preview*`, then trace to execution functions
6. **Severity scales with deviation size and user impact** — >10% gaps are HIGH severity

The next time you review a protocol, ask: "Do the preview functions tell the truth?" If not, you've found a bug — even if the code "works." Truth in interfaces is security.

---

**Disclaimer:** This analysis is based on security research patterns observed across multiple DeFi protocols and is for educational purposes.
