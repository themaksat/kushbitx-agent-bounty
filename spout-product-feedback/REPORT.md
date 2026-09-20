# Spout Finance Product Feedback — Read-only Product/Docs Teardown

**Bounty:** https://superteam.fun/earn/listing/product-feedback-spout-finance  
**Prize pool:** 1,000 USDC  
**Method:** public website/docs + public GitHub source review only. No wallet connection, KYC, deposit, signature, or transaction was performed.

## Executive summary

Spout's current public positioning is much sharper than the older application source: **0%-interest borrowing against tokenized US equities plus lender yield funded by covered-call premium**. The biggest improvement opportunity is not another feature; it is tightening the trust layer so the website, docs, legal terms, and app surface tell the same story.

The highest-priority issue I found is a live public disclosure conflict around lender withdrawals: the FAQ says lender deposits have **"no lockup"**, while the Terms and lending-tranche docs say Junior lenders have a **45-day minimum notice** and no instant exit. For a financial product, that difference should be resolved before a user deposits.

I also found a current getting-started flow error for lenders, plus substantial product-state drift in the public frontend repository: legacy trading/500-stock/yield-farming/2024-roadmap surfaces remain in source while current public docs describe an 11-asset borrow/lend protocol.

---

## 1. P0 — Current public withdrawal messaging conflicts with the Terms

### Evidence

Current FAQ:
- https://spout.finance/docs/faqs/
- Under **"Is there a lockup?"** it says: **"Lender deposits have no lockup."**

Current Terms:
- https://spout.finance/terms/
- Section 7.3 says:
  - Senior can exit instantly with a dynamic 0–3% haircut, or queue for full NAV.
  - Junior has a **45-day minimum notice period**.
  - **There is no instant exit for the Junior tranche.**
- Section 9.13 repeats the Junior 45-day notice period and liquidity risk.

Current tranche documentation:
- https://spout.finance/docs/lending-tranches/
- Also states that Junior requires a **45-day notice period for withdrawals**.

### Why it matters

A user choosing Junior based on the FAQ can reasonably interpret "no lockup" as meaning the position is available on demand. The Terms describe a materially different liquidity profile.

This affects:
- onboarding expectations,
- capital allocation,
- trust in product documentation,
- support burden,
- compliance/risk disclosure quality.

### Recommendation

Change the FAQ from a universal answer to a tranche-specific answer, for example:

- **Senior:** instant exit may be available with a 0–3% haircut; FIFO full-NAV exit is also available.
- **Junior:** 45-day minimum notice; no instant exit.
- Both remain subject to protocol liquidity and the Terms.

Then link directly to the tranche page and Terms.

---

## 2. P1 — "For Lenders Only" getting-started instructions tell users to skip the lending step

### Evidence

Current page:
https://spout.finance/docs/getting-started/

The page defines:
- Step 3: Lock and Borrow
- Step 4: Lend (Optional)

Then the **For Lenders Only** section says:

> "If you only want to earn yield and have no interest in borrowing, you can skip Steps 3 and 4 entirely. Deposit stablecoins into the lending pool and start earning immediately."

But depositing stablecoins into the lending pool **is Step 4**.

### Why it matters

This is a direct flow contradiction at the exact point a lender is trying to decide what to do next.

### Recommendation

For lender-only users, say:

> "Skip Steps 2 and 3. Connect your wallet, then go directly to Step 4 and choose Senior or Junior."

If collateral acquisition is still required for some lender path, state that explicitly instead.

---

## 3. P1 — KYC requirements need one canonical action-by-action matrix

### Evidence

Getting Started:
https://spout.finance/docs/getting-started/

- Path A (buy through Spout): KYC required.
- Path B (deposit existing xStocks/Ondo/compatible tokenized equities): says **no KYC required through Spout**.

Main website:
https://www.spout.finance/

The general onboarding answer says:
- connect a wallet,
- complete one-time KYC,
- then deposit equities to borrow or supply stablecoins to earn yield.

Terms:
https://spout.finance/terms/

The legal text distinguishes primary issuance and transfer-hook requirements, while the product has multiple actions: mint, redeem, deposit existing assets, borrow, lend, transfer, and withdraw.

### Why it matters

The existing wording can leave a user unsure whether KYC is:
- required to browse,
- required to lend stablecoins,
- required to deposit third-party tokenized equities,
- required only to mint spAssets,
- required to borrow,
- required to receive/transfer spAssets.

### Recommendation

Add a small matrix to Getting Started and FAQ:

| Action | KYC required? | Why |
| --- | --- | --- |
| Connect wallet | No | Wallet access only |
| Lend stablecoins | [canonical answer] | |
| Buy/mint spAssets | Yes | Primary issuance / Reg S |
| Deposit compatible third-party tokenized equities | [canonical answer] | |
| Borrow against deposited collateral | [canonical answer] | |
| Redeem spAssets | [canonical answer] | |

Link each answer to the Terms section that governs it.

---

## 4. P1 — Proof-of-Reserve promise is stronger than the current public app source surface

### Current public promise

Main website:
https://www.spout.finance/

It says:
- assets are backed 1:1,
- backing is verifiable on-chain,
- Proof of Reserve **continuously verifies** tokenized supply against share holdings.

Terms:
https://spout.finance/terms/

The current legal/risk text says Spout relies on **Stork** for Proof-of-Reserve attestations/oracle data.

### Public frontend source at current main commit

Current repo main:
https://github.com/SpoutSolana/spout-finance/tree/91c034b4f67b9009f537160d111d7c2c496f7ef8

Proof-of-reserve route:
https://github.com/SpoutSolana/spout-finance/blob/91c034b4f67b9009f537160d111d7c2c496f7ef8/app/app/proof-of-reserve/page.tsx

The actual verification components are commented out and the route renders only:

`<div>Proof of Reserve</div>`

Dashboard nav:
https://github.com/SpoutSolana/spout-finance/blob/91c034b4f67b9009f537160d111d7c2c496f7ef8/components/dashboardNavClient.tsx

The Proof-of-Reserve nav surface is styled as unavailable / `cursor-not-allowed`.

Legacy reserve component:
https://github.com/SpoutSolana/spout-finance/blob/91c034b4f67b9009f537160d111d7c2c496f7ef8/components/reserveproofpage.tsx

It still contains:
- a **Blocksense** feed comment,
- an EVM-style reserve contract address,
- `requestReserves = () => {}`,
- `totalReserves = 0`,
- `refetchReserves = () => {}`.

### Why it matters

The current public marketing makes Proof of Reserve a central trust claim, but the open frontend source does not currently expose an equivalent user-verifiable experience and appears to retain a legacy provider/architecture.

I could not reliably fetch the authenticated live app, so I am **not claiming these source files are necessarily the exact deployed production UI**. The source-state mismatch is still worth resolving because this is the public repo a technical user will inspect.

### Recommendation

Make the current PoR implementation observable in one place:
- provider: Stork,
- last attestation time,
- asset,
- token supply,
- backing amount,
- coverage ratio,
- source/attestation identifier,
- stale/error state,
- link to methodology.

Remove or archive legacy Blocksense/EVM code if it is no longer part of the architecture.

---

## 5. P1 — Public frontend source still represents the old "trading platform" product

### Current product

Current website/docs position Spout around:
- 11 launch assets,
- 0%-interest borrowing,
- Senior/Junior lender tranches,
- covered-call-funded yield.

Sources:
- https://www.spout.finance/
- https://spout.finance/docs/getting-started/
- https://spout.finance/docs/lending-tranches/

### Current public repository main

Dashboard:
https://github.com/SpoutSolana/spout-finance/blob/91c034b4f67b9009f537160d111d7c2c496f7ef8/app/app/page.tsx

It still advertises:
- **"500+ Stocks"**
- **"0.1% Fees"**
- **"Start Trading"**
- portfolio/trading language instead of the current borrow/lend model.

README:
https://github.com/SpoutSolana/spout-finance/blob/91c034b4f67b9009f537160d111d7c2c496f7ef8/README.md

It describes:
- a tokenized asset **trading platform**,
- current **devnet** setup,
- portfolio/trading/market data as core functionality.

### Why it matters

Even if production has moved ahead, the public repository is part of developer due diligence. A user or integrator can reasonably conclude the codebase and current product are different products.

### Recommendation

Either:
1. bring the public repo in line with the current protocol, or
2. clearly label the repo as a legacy/testnet frontend and link to the current implementation/docs.

Avoid public "500+ stocks" or trading-fee claims unless they are current and directly supported.

---

## 6. P1 — Legacy Earn page contains outdated APYs and a 2024 roadmap

Current repo:
https://github.com/SpoutSolana/spout-finance/blob/91c034b4f67b9009f537160d111d7c2c496f7ef8/app/app/earn/page.tsx

It presents "Coming Soon" products such as:
- Yield Farming: 12–18% APY
- Staking Rewards: 8–15%
- Dividend Tokens: 5–10%
- Auto-Compounding: 15–25%
- "Up to 25% APY"
- Q1–Q4 **2024** roadmap entries

Current product docs instead describe:
- Senior tranche around ~9% target,
- Junior around ~32% in the product docs,
- and the Terms currently describe roughly 8.67% Senior / 24–27% Junior and explicitly say yields are targets, not guarantees.

Sources:
- https://spout.finance/docs/lending-tranches/
- https://spout.finance/terms/

### Recommendation

Remove or feature-gate the old Earn page. Replace it with the current tranche model and pull any displayed target yield from one canonical configuration/content source so the website, docs, app, and Terms do not drift independently.

---

## 7. P2 — Balance caching favors RPC savings over freshness; make stale state explicit

Current repo README explicitly says balance hooks use:
- `refetchOnWindowFocus: false`
- `refetchOnReconnect: false`
- `refetchOnMount: false`
- `staleTime: Infinity`

and therefore balances **will not auto-update**.

Source:
https://github.com/SpoutSolana/spout-finance/blob/91c034b4f67b9009f537160d111d7c2c496f7ef8/README.md

The trade path manually refetches USDC after at least one transaction flow, which is good, but a manual-refetch architecture makes every mutation responsible for remembering to refresh every dependent balance.

### Risk

A missed invalidation can show a stale financial balance indefinitely, especially across reconnect/mount/window-focus events.

### Recommendation

Keep RPC load bounded, but use one of:
- finite `staleTime`,
- query invalidation by transaction signature,
- refresh on confirmed transaction,
- a visible "last updated" + refresh state,
- selective refetch on reconnect/window focus for financial balances.

The UI should never make indefinitely cached values look live.

---

# Suggested priority order

1. **Fix live withdrawal/lockup disclosure conflict.**
2. **Fix lender-only Getting Started flow.**
3. **Publish one canonical KYC matrix.**
4. **Make current Proof of Reserve directly inspectable and align provider references.**
5. **Retire or relabel legacy trading/Earn UI and 2024 roadmap.**
6. **Harden balance freshness semantics.**

# What I would keep

The new product story is much clearer than the legacy source:
- one understandable borrower value proposition: liquidity without selling at 0% interest,
- a concrete lender yield source rather than emissions,
- tranche-based risk separation,
- strong emphasis on regulated custody and verifiable backing.

The highest-leverage next step is **coherence**: make every surface explain the same product, the same liquidity constraints, the same KYC boundaries, and the same current trust infrastructure.

# Review limitations

- I did not connect a wallet.
- I did not complete KYC.
- I did not sign any transaction.
- I did not deposit or trade funds.
- `app.spout.finance` timed out through the read-only fetch paths available to this review.
- App-source observations are therefore explicitly source-level findings and should be deployment-verified by the team.
