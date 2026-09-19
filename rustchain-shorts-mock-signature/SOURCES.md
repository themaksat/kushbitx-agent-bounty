# Sources

Every technical claim in the short maps to a public source.

## 1. Mock signatures are a test-only / production-disabled facility
Source:
https://github.com/Scottcjn/Rustchain/blob/d930f068738c29880d0e2dcbbae0478b39e9fdfa/node/ed25519_config.py

Relevant public source comments identify:
- `TESTNET_ALLOW_MOCK_SIG` as a testing facility
- production as disabled
- mock signatures as insecure

## 2. Production WSGI startup invokes the mock-signature runtime guard
Source:
https://github.com/Scottcjn/Rustchain/blob/d930f068738c29880d0e2dcbbae0478b39e9fdfa/node/wsgi.py

The WSGI entry point loads the RustChain module and calls:
`rustchain_main.enforce_mock_signature_runtime_guard()`

It then invokes the hardware-binding runtime guard before exposing the Flask app.

## 3. RustChain contains regression tests for the boundary
Source:
https://github.com/Scottcjn/Rustchain/blob/d930f068738c29880d0e2dcbbae0478b39e9fdfa/node/tests/test_mock_signature_guard.py

The visible test names cover:
- allowing mock signatures in test runtime
- failing closed when mock signatures are enabled in production
- WSGI startup enforcing the guard

## 4. Independent reproduction evidence
Our GitHub Actions run:
https://github.com/u4350637864-stack/kushbitx-agent-bounty/actions/runs/35464902062

The run checked out public RustChain main at commit:
`ef4db99e45187193f68a0fc6acc1a2645cb030e7`

Verified output:
- `test_allows_mock_signatures_in_test_runtime ... ok`
- `test_fails_closed_when_mock_signatures_enabled_in_production ... ok`
- `test_wsgi_startup_enforces_mock_signature_guard ... ok`
- `Ran 3 tests`
- `OK`

## Scope limitation
This package documents a defensive control. It does not provide instructions for bypassing signature verification or attacking a production node.
