# RustChain bug bounty report — canonical /api/v1 registration fails during startup

**Upstream:** Scottcjn/Rustchain  
**Verified upstream main:** `d930f068738c29880d0e2dcbbae0478b39e9fdfa`  
**Relevant bounty:** Scottcjn/rustchain-bounties#71  
**Suggested severity:** Low–Medium functional availability/reliability issue (maintainer to classify)

## Summary

The integrated RustChain node attempts to register the canonical `/api/v1/*` read API before the helper functions `slot_to_epoch()` and `current_slot()` have been defined.

The registration block passes `current_slot=current_slot` and `slot_to_epoch=slot_to_epoch`. At that point in module execution, those names do not exist yet, producing a `NameError`.

A broad `except Exception` catches the error and allows node initialization to continue, so the failure is easy to miss: the process may continue running while the entire canonical v1 blueprint is never registered.

## Current-main code ordering

In `node/rustchain_v2_integrated_v2.2.1_rip200.py` on the verified main commit:

- canonical `/api/v1/*` registration block occurs earlier in module execution;
- it calls `register_api_v1(... current_slot=current_slot, slot_to_epoch=slot_to_epoch ...)`;
- `def slot_to_epoch(slot):` and `def current_slot():` occur much later in the same module.

The registration code catches the resulting exception and prints:

```
[api/v1] Failed to register canonical read API: <exception>
```

## Independent runtime reproduction

A GitHub Actions run in the public reproduction repository imported current RustChain main and emitted:

```
[api/v1] Failed to register canonical read API: name 'current_slot' is not defined
```

Run:
https://github.com/u4350637864-stack/kushbitx-agent-bounty/actions/runs/35464902062

The same run completed the intended Mock Signature regression checks, which confirms this startup message came from a real current-main import rather than a copied fixture.

## Impact

The intended canonical read blueprint defines routes including:

- `/api/v1/health`
- `/api/v1/info`
- `/api/v1/status`
- `/api/v1/chain/status`
- `/api/v1/epoch`
- `/api/v1/miners`
- `/api/v1/blocks`
- `/api/v1/anchors`
- `/api/v1/attestations`
- `/api/v1/leaderboard`
- `/api/v1/governance/proposals`

Because blueprint registration fails before `app.register_blueprint(bp)`, these canonical routes are absent from that process even though the node continues booting.

This is primarily an availability / compatibility defect rather than a demonstrated confidentiality or integrity vulnerability. I have not tested or attacked production.

## Root cause

Python executes the module top-to-bottom. Referencing a function object before the corresponding `def` statement has executed raises `NameError`.

The current ordering is effectively:

```python
register_api_v1(
    app,
    current_slot=current_slot,   # name not defined yet
    slot_to_epoch=slot_to_epoch, # also defined later
    ...
)

# ... much later ...

def slot_to_epoch(slot):
    ...

def current_slot():
    ...
```

The broad exception handler masks this as a log message rather than failing startup.

## Suggested fix

Move the canonical `register_api_v1(...)` block to a point after `slot_to_epoch` and `current_slot` are defined, while still ensuring blueprint registration happens before the Flask app begins serving requests.

Alternative: move these small helper definitions above the registration block.

## Regression test

Add an integrated-node startup/route-map test that:

1. imports/initializes the authoritative integrated node;
2. asserts no `[api/v1] Failed to register...` condition occurred;
3. asserts the Flask URL map contains representative routes such as `/api/v1/health`, `/api/v1/epoch`, and `/api/v1/blocks`.

The existing isolated `tests/test_api_v1.py` passes helpers directly into `register_api_v1`, so it does not catch integration-order regressions in the authoritative node module.

## Safety

No production mutation, authentication bypass, payment action, or exploit was attempted. This report is based on public source inspection and an isolated CI import of current main.
