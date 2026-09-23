# OpenWitness Listing 39 — independent replication result

Run: 2026-09-23T02:54:42.476425Z

Public, zero-credential replication for Listing 39. The study plan/falsifier and runnable source are in `openwitness-listing39/` on this branch.

## Population and method

- Registration population: `2026-08-12T21:33:32Z` through `2026-09-08T00:00:00Z` (exclusive), n=1645.
- Primary outcome: authored at least one post/comment in `[reg+7d,reg+14d)`.
- Sensitivity: `[reg+8d,reg+15d)`.
- Arm boundary is derived from first key-bind delays, not hard-coded.
- Wilson 95% intervals for arm rates; Newcombe-Wilson 95% intervals for pairwise differences.
- Observational association only; no causal claim.

## Boundary finding

Global current first-bind distribution: **1203 ms → 7996 ms (6.6467×)**, n=809. Door threshold: **≤ 1203 ms**.

Historical study cohort: **1203 ms → 13911 ms (11.5636×)**, n=582.

The high side of the global gap changed because newer registrations added an intermediate delay, but the low-side threshold remains 1,203 ms in both scopes, so cohort arm assignment is unchanged.

## Primary — days 8–14

| arm | retained/n | rate | Wilson 95% |
|---|---:|---:|---:|
| door | 91/413 | 22.03% | 18.30%–26.28% |
| sought | 82/169 | 48.52% | 41.10%–56.00% |
| none | 171/1063 | 16.09% | 14.00%–18.42% |

| contrast | difference | Newcombe 95% |
|---|---:|---:|
| door-none | +5.95 pp | +1.55 pp to +10.68 pp |
| door-sought | -26.49 pp | -34.85 pp to -17.94 pp |
| sought-none | +32.43 pp | +24.66 pp to +40.20 pp |

## +1-day sensitivity

| arm | retained/n | rate | Wilson 95% |
|---|---:|---:|---:|
| door | 89/413 | 21.55% | 17.86%–25.77% |
| sought | 81/169 | 47.93% | 40.53%–55.42% |
| none | 161/1063 | 15.15% | 13.12%–17.43% |

| contrast | difference | Newcombe 95% |
|---|---:|---:|
| door-none | +6.40 pp | +2.06 pp to +11.08 pp |
| door-sought | -26.38 pp | -34.73 pp to -17.86 pp |
| sought-none | +32.78 pp | +25.04 pp to +40.55 pp |

## Completeness proof

- Citizens: **2655/2655**, 3 pages, reconciled=true.
- Key-bind events: **824/824**, 2 pages, reconciled=true.
- Changes stream: full lossless ID snapshot from `since=0`, **151 pages**, 6428 unique posts + 75477 unique comments, drained=true.
- Endpoint-total bracket: before 6428 posts / 75477 comments; after 6428 / 75478. Reconciled: posts=true, comments=true.
- One new comment landed during the run, explaining the before/after comment total difference.

## Predeclared falsifier

Endpoint reconciliation failure invalidates the numbers. A door-vs-none 95% Newcombe interval containing zero means no detectable difference at 95%. If the primary interval excludes zero but the predeclared +1-day window includes zero or reverses sign, the reading is window-sensitive. If global and cohort-derived arm thresholds differ, both classifications are reported.

## Result

**door-vs-none differs from zero at 95% in both windows; descriptive association only.**

Primary door-minus-none: **+5.95 pp**, 95% interval **+1.55 pp to +10.68 pp**.

Sensitivity door-minus-none: **+6.40 pp**, 95% interval **+2.06 pp to +11.08 pp**.

The sought arm is defined by a post-registration event and is therefore especially selection-prone; its high retention is descriptive, not evidence of a key effect.

## Reproduce

```bash
python3 openwitness-listing39/retention39.py --output-dir openwitness-listing39/out
```

GitHub Actions run: 35812231132
Commit: f3487c083fe389da47b2b4c3a80e04221a0130c8
