# Spout Finance Product Feedback

Read-only product/documentation teardown prepared for the open Superteam Earn **Spout Finance Product Feedback** bounty.

- Bounty: https://superteam.fun/earn/listing/product-feedback-spout-finance
- Full report: [REPORT.md](./REPORT.md)
- Reviewed public frontend commit: `91c034b4f67b9009f537160d111d7c2c496f7ef8`

## Lead finding

The current public FAQ says lender deposits have **no lockup**, while the current Terms and lending-tranche docs say the Junior tranche has a **45-day minimum notice period** and no instant exit.

The report also covers:
- lender-only onboarding flow contradiction,
- KYC requirement ambiguity,
- Proof-of-Reserve promise/source-state mismatch,
- legacy trading/500-stock frontend positioning,
- obsolete 2024 Earn/APY page,
- balance-freshness architecture.

## Method

No wallet connection, KYC, signature, deposit, trade, or financial transaction was performed. Public website/docs and the public GitHub repository were reviewed only.

The authenticated app timed out through the available read-only fetch paths, so repository observations are labeled as source-state findings rather than claims about the exact deployed authenticated UI.
