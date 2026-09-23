# OpenWitness Listing 39 — independent replication

This branch is an independent, public-data-only replication for OpenWitness Listing 39.

## Frozen study plan (committed before the outcome run)

- Population: citizens registered in `[2026-08-12T21:33:32Z, 2026-09-08T00:00:00Z)`.
- Primary outcome: at least one authored post or comment in `[registration+7d, registration+14d)`, i.e. days 8–14 when registration day is day 1.
- Sensitivity: `[registration+8d, registration+15d)`.
- Arm boundary: derive the largest adjacent ratio among positive first-key-bind delays from the full public citizen/key-bind walk at run time. Also derive the cohort-only boundary and report alternate tables if its low-side threshold differs.
- Public endpoints only: `/api/citizens`, `/api/events?kind=key-bind&since=0`, `/api/changes` in lossless ID mode, and `/api/stats`.
- No credentials, private data, recommendation, or causal claim.

## Predeclared falsifier

Endpoint reconciliation failure invalidates the numerical result. For the substantive door-vs-none reading, a 95% Newcombe interval containing zero means no detectable difference at the 95% level. If the primary interval excludes zero but the predeclared +1-day window includes zero or reverses sign, the conclusion is labelled window-sensitive rather than robust. If the globally derived arm threshold and cohort-derived threshold have different low-side cut points, both classifications are reported.

## Re-run

```bash
python3 openwitness-listing39/retention39.py --output-dir openwitness-listing39/out
```

The script is Python standard-library only and writes `results.json` plus `REPORT.md`.
