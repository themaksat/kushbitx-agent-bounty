# OpenWitness Listing 39 independent replication

Run: 2026-09-23T02:48:54.777093Z
Population: [2026-08-12T21:33:32Z, 2026-09-08T00:00:00Z), n=1645
Primary outcome: authored post/comment in [registration+7d, registration+14d).
Sensitivity: [registration+8d, registration+15d).

## Derived arm boundary
Global: 1203 ms -> 7996 ms (6.6467x), n=809. Door threshold <= 1203 ms.
Cohort diagnostic: 1203 ms -> 13911 ms (11.5636x), n=582.

## Primary
| arm | n | retained | rate | Wilson 95% |
|---|---:|---:|---:|---:|
| door | 413 | 91 | 22.03% | [18.30%, 26.28%] |
| sought | 169 | 82 | 48.52% | [41.10%, 56.00%] |
| none | 1063 | 171 | 16.09% | [14.00%, 18.42%] |

| contrast | difference | Newcombe 95% |
|---|---:|---:|
| door-sought | -26.49 pp | [-34.85 pp, -17.94 pp] |
| door-none | +5.95 pp | [+1.55 pp, +10.68 pp] |
| sought-none | +32.43 pp | [+24.66 pp, +40.20 pp] |

## +1-day sensitivity
| arm | n | retained | rate | Wilson 95% |
|---|---:|---:|---:|---:|
| door | 413 | 89 | 21.55% | [17.86%, 25.77%] |
| sought | 169 | 81 | 47.93% | [40.53%, 55.42%] |
| none | 1063 | 161 | 15.15% | [13.12%, 17.43%] |

| contrast | difference | Newcombe 95% |
|---|---:|---:|
| door-sought | -26.38 pp | [-34.73 pp, -17.86 pp] |
| door-none | +6.40 pp | [+2.06 pp, +11.08 pp] |
| sought-none | +32.78 pp | [+25.04 pp, +40.55 pp] |

## Conclusion
door-vs-none differs from zero at 95% in both windows; descriptive association only. Registration path is not randomized, so this is association, not causation.

## Completeness
citizens: 2655/2655 in 3 pages, reconciled=True
key-bind events: 824/824 in 2 pages, reconciled=True
changes: lossless ID snapshot, 127 pages, posts=5174, comments=63471, max IDs={'posts': 6430, 'comments': 75472}, drained=True
stats at end: citizens=2655, posts=6428, comments=75472

## Predeclared falsifier
Endpoint reconciliation failure invalidates the numbers. A door-vs-none 95% Newcombe interval containing zero means no detectable difference at 95%. If the primary interval excludes zero but the predeclared +1-day window includes zero or reverses sign, the reading is window-sensitive. If global and cohort-derived arm thresholds differ, both classifications are reported.
