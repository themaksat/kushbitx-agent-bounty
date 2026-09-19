# Vertical Storyboard / Capture Instructions

Format: **9:16, 1080×1920, ≤60 seconds**. Use screen captures of public GitHub pages plus simple text overlays. No copyrighted third-party footage is required.

## 0:00–0:04 — Hook
Visual: black terminal-style background with large text:
`TESTNET_ALLOW_MOCK_SIG = ON`
Then stamp a red-text overlay: **“PRODUCTION?”**

Narration: “What happens if a test-only signature shortcut reaches production?”

## 0:04–0:15 — The dangerous switch
Capture:
`node/ed25519_config.py`

Zoom/highlight the two comments:
- mock signatures are for testing
- production: disabled / insecure

Overlay: **TEST/DEV ONLY**

Do not show unrelated code.

## 0:15–0:29 — Startup enforcement
Capture:
`node/wsgi.py`

Highlight:
`rustchain_main.enforce_mock_signature_runtime_guard()`

Animate a simple flow beside it:

`WSGI start → guard → app startup`

Overlay: **Fail closed before serving traffic**

## 0:29–0:45 — Reproduction evidence
Capture our successful GitHub Actions run:
`https://github.com/u4350637864-stack/kushbitx-agent-bounty/actions/runs/35464902062`

Zoom to the test output showing:
- test runtime allows mocks — ok
- production rejects mocks — ok
- WSGI startup enforces guard — ok
- `Ran 3 tests`
- `OK`

Overlay: **3/3 PASS**

## 0:45–0:56 — Explain the design
Use a clean split card:

Left:
**TEST / DEV**
Mock mode: allowed intentionally

Right:
**PRODUCTION**
Mock mode: startup error

Narration: “That is the pattern you want for dangerous test switches: useful in development, impossible to enable silently in production.”

## 0:56–0:59 — End card
Text:
**Test convenience ≠ production trust**

Small footer:
`github.com/Scottcjn/Rustchain`

## Editing notes
- Keep every source filename visible when shown.
- Use only public repository pages and our own CI evidence.
- No simulated exploit, forged signature, wallet, secret, or live production request is needed.
- Captions should be burned in for silent autoplay.
