# RustChain Quest #398 — Steps 1 and 2 submission

**Claimant:** @u4350637864-stack  
**Quest:** Scottcjn/rustchain-bounties#398  
**RustChain main commit verified:** `ef4db99e45187193f68a0fc6acc1a2645cb030e7`  
**Step 2 CI:** https://github.com/u4350637864-stack/kushbitx-agent-bounty/actions/runs/35464902062

## Step 1 — Security assessment

I reviewed the current RustChain node, attestation documentation, hardware-binding implementation, reward settlement path, and the regression tests around the historical Mock Signature Mode issue.

### 1. Attestation flow

RustChain exposes `POST /attest/submit` as the hardware-attestation gate for epoch enrollment. The current API reference describes a request containing a miner identifier, timestamp, device architecture/family, a hardware fingerprint, and an Ed25519 signature. The fingerprint is not a single opaque score: the documented payload includes measurements covering clock behavior, cache timing, SIMD identity, thermal characteristics, instruction jitter, and behavioral/hypervisor heuristics.

The endpoint therefore sits at an important trust boundary. A successful submission is not merely a registration request; it feeds hardware identity and antiquity data into later eligibility and reward logic. Current documentation also defines explicit failure modes such as invalid signatures, replay detection, VM detection, and hardware-already-bound conflicts. That matters because an attacker who could bypass attestation would not only impersonate another miner but could distort the economic weighting that Proof of Antiquity is meant to enforce.

RustChain also has a separate fingerprint-replay defense module integrated with attestation. This is useful defense in depth: signature validation establishes possession of the key used for the request, while replay controls try to ensure an old valid request cannot simply be reused as a fresh proof.

### 2. Hardware fingerprinting and multi-wallet / VM resistance

The current `node/hardware_binding_v2.py` implementation combines relatively stable machine identity with measured entropy. `compute_serial_hash()` binds normalized serial data to architecture and stores only a hash for the main lookup key. The binding table records the wallet, architecture, entropy profile, observed MAC information, timestamps, and attestation count.

The entropy profile is built from multiple signals: clock coefficient of variation, L1 timing, L2 timing, thermal ratio, and instruction-jitter variation. The implementation requires at least three non-zero comparable fields for quality/collision decisions. It also uses per-field tolerances rather than treating every timing measurement as equally stable. Cache fields receive relatively tight tolerances, while clock and jitter are treated as much more volatile. That design is sensible because real bare-metal measurements naturally move with frequency scaling, temperature, scheduler noise, and background load.

The strongest concurrency property I found in this layer is that a first-time hardware bind takes a SQLite `BEGIN IMMEDIATE` write lock before checking for an existing binding and before scanning for entropy collisions. The collision scan runs on the same connection. This closes a classic check-then-insert race where two simultaneous registrations could otherwise both observe "no collision" and both bind what appears to be the same physical machine under different identities.

These mechanisms do not make virtual-machine impersonation mathematically impossible, but they materially raise the cost of simple VM farms and multi-wallet Sybil behavior by requiring a consistent combination of identity and physical-behavior signals rather than trusting one self-reported "is physical" flag.

### 3. Epoch rewards and settlement

The current RIP-200 reward implementation defines `PER_EPOCH_URTC = 1,500,000`, i.e. 1.5 RTC per epoch, with 144 slots per epoch. Reward calculation uses RustChain's time-aged / antiquity weighting logic and then distributes the finite epoch budget across eligible miners.

The settlement path in `node/rewards_implementation_rip200.py` begins with `BEGIN IMMEDIATE` before checking the epoch's settled state. This serializes competing settlement attempts. The anti-double-mining path is also passed the already-locked database connection via `existing_conn=db`, keeping its writes inside the same transaction rather than opening a second race window. The caller commits only after that path completes.

There is also an enforced total-supply clamp: the per-epoch budget is limited by remaining supply headroom. That is a useful invariant because it moves the maximum-supply claim from documentation into executable state-transition logic.

### 4. Potential attack vector to keep auditing

One availability risk I would continue testing is **identity-rotation pressure against the public attestation boundary**. The published API reference documents `/attest/submit` as public and lists a limit of one request per ten minutes per miner. If the production limiter were keyed only or primarily by attacker-chosen miner identity, an adversary could rotate large numbers of miner IDs and repeatedly force signature parsing, fingerprint validation, replay checks, and hardware-binding work.

I have **not** demonstrated that bypass against production, so I am not claiming this as a new Step 3 vulnerability. It is an attack surface worth regression-testing: rate limiting should combine miner identity with source/global capacity controls, reject oversized/malformed bodies before expensive hardware logic, and preserve cheap failure paths under load.

## Step 2 — Reproduce a known fix: Mock Signature Mode

### Historical attack

The historical Mock Signature Mode existed to simplify test/dev operation. The dangerous failure mode is straightforward: if mock-signature acceptance is accidentally enabled in a production runtime, signature checks can cease to prove possession of the real Ed25519 private key. A remote party could then present dummy/mock signature material and potentially act as a miner identity they do not control.

### Current fix

Current RustChain has a dedicated `enforce_mock_signature_runtime_guard()` and a production WSGI startup hook. `node/wsgi.py` loads the integrated node and immediately calls:

`rustchain_main.enforce_mock_signature_runtime_guard()`

before normal application initialization proceeds. Mock signatures are permitted only in explicitly non-production runtimes such as test/dev/local/testnet. Enabling the mock mode while the runtime is production causes a fail-closed `RuntimeError`.

### Reproduction evidence

I reproduced the current fix against **current RustChain main**, not a copied historical fixture.

Workflow:
https://github.com/u4350637864-stack/kushbitx-agent-bounty/blob/rustchain-398-verification/.github/workflows/rustchain-398-verification.yml

Successful run:
https://github.com/u4350637864-stack/kushbitx-agent-bounty/actions/runs/35464902062

The workflow checks out `Scottcjn/Rustchain@main`, installs the repository requirements under Python 3.12, and executes:

`python node/tests/test_mock_signature_guard.py -v`

Verified result:

- `test_allows_mock_signatures_in_test_runtime` — PASS
- `test_fails_closed_when_mock_signatures_enabled_in_production` — PASS
- `test_wsgi_startup_enforces_mock_signature_guard` — PASS
- **Ran 3 tests — OK**

### Why the fix is sufficient for this known issue

The fix addresses the configuration-failure mode at startup rather than relying only on every individual request path to remember to reject mocks. Production boot fails closed if the dangerous test flag is enabled, and WSGI invokes the guard before normal initialization. The regression test additionally verifies that test runtimes still retain the intended development behavior.

I am claiming **Step 1 (10 RTC) + Step 2 (15 RTC)** only. I am not claiming a new Step 3 vulnerability in this submission.
