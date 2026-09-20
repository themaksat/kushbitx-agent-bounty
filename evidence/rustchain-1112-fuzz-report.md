# RustChain #1112 — `/attest/submit` fuzz report

**Claimant:** [@u4350637864-stack](https://github.com/u4350637864-stack)  
**Bounty:** [Scottcjn/rustchain-bounties#1112](https://github.com/Scottcjn/rustchain-bounties/issues/1112)  
**Campaign timestamp:** 2026-09-19T19:50:10Z  
**Target:** `https://rustchain.org/attest/submit`

## Reproducible evidence

- Harness branch: https://github.com/u4350637864-stack/kushbitx-agent-bounty/tree/rustchain-fuzz-1112
- Harness commit: `81c1e60d82f07af4b04aad69e51ea3b48ae7df5a`
- Passing GitHub Actions run: https://github.com/u4350637864-stack/kushbitx-agent-bounty/actions/runs/35465515683
- Preserved artifact: `rustchain-fuzz-1112`
- Artifact ID: `10591195975`
- Artifact SHA-256: `859aa1fb20f7c7dd2f451664eae516d16e1a9ab42b46ef46e6060f85bb4d2137`

The campaign was intentionally bounded and non-destructive. It sent **110 malformed or adversarial requests** and did not attempt authentication bypass, destructive state changes, denial of service, or testing outside the endpoint named by the bounty.

## Payload coverage

| Category | Count |
| --- | ---: |
| Missing fields | 10 |
| Wrong types | 42 |
| Oversized inputs | 10 |
| Injection-style inputs | 24 |
| Special/boundary cases | 12 |
| Malformed JSON | 6 |
| Content-type cases | 3 |
| Unknown fields | 3 |
| **Total** | **110** |

## HTTP results

| Result | Count |
| --- | ---: |
| HTTP 400 | 73 |
| HTTP 422 | 37 |
| HTTP 5xx | **0** |
| Network / harness errors | **0** |
| **Total** | **110** |

## API validation-code summary

| API code | Count |
| --- | ---: |
| `MISSING_MINER` | 10 |
| `MISSING_DEVICE` | 37 |
| `INVALID_MINER` | 29 |
| `INVALID_SIGNATURE_TYPE` | 5 |
| `INVALID_PUBLIC_KEY_TYPE` | 5 |
| `INVALID_DEVICE` | 5 |
| `INVALID_FINGERPRINT` | 5 |
| `INVALID_REPORT` | 5 |
| `INVALID_JSON_OBJECT` | 9 |
| **Total** | **110** |

## Findings

No 500-class response, endpoint crash, transport failure, or other server-side failure was observed in the 110-request campaign.

Two useful observations:

1. Wrong-type `signature` and `public_key` inputs were rejected with explicit validation codes (`INVALID_SIGNATURE_TYPE` / `INVALID_PUBLIC_KEY_TYPE`) rather than reaching an internal-error path.
2. Thirty-seven inputs progressed far enough to receive HTTP 422 `MISSING_DEVICE`. These are handled client-validation failures, not server crashes.

Because this run produced **no 500-class or apparently exploitable behavior**, there is no private vulnerability detail being withheld from this public report and no bug bonus is claimed.

## Acceptance-criteria mapping

- [x] 100+ malformed/adversarial payloads — **110**
- [x] Missing fields
- [x] Wrong types
- [x] Oversized inputs
- [x] Injection-style attempts
- [x] Response codes recorded
- [x] Expected validation failures separated from 500-class failures
- [x] Structured findings suitable for maintainer review
- [x] Reproduction material preserved
- [x] No destructive/out-of-scope testing

**Claim requested:** the current #1112 base payout stated in the issue's Payout section (**10 RTC**), subject to maintainer review. No vulnerability bonus is claimed.

**AI assistance disclosure:** AI assistance was used to prepare the harness and report. The request campaign itself ran in the linked GitHub Actions job, and the counts above are copied from that completed run's verified results.
