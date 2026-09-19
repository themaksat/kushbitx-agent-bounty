# Metadata

## Primary title
RustChain’s 3-Test Guard Against Mock Signatures in Production

## Alternate titles
1. The Test Switch RustChain Refuses to Trust in Production
2. Why Mock Signatures Must Fail Closed

## Hook line
**What happens if a test-only signature shortcut reaches production?**

## Short description
RustChain keeps mock signatures available for controlled test/dev workflows, but current production startup explicitly calls a runtime guard before the WSGI app proceeds. This short shows the public source and a reproducible GitHub Actions run where all three guard tests pass.

Source repo: https://github.com/Scottcjn/Rustchain

Independent reproduction:
https://github.com/u4350637864-stack/kushbitx-agent-bounty/actions/runs/35464902062

Prepared by: @u4350637864-stack

## Tags
RustChain, cybersecurity, secure defaults, fail closed, Ed25519, testing, Python, open source, blockchain security, software engineering

## Format
- Vertical 9:16
- 1080×1920
- Target 50–58 seconds
- Burned-in captions
- No background music required

## Rights / attribution
All written material in this package is original. Visual instructions use public GitHub source pages and the author’s own CI run. Package submitted under RustChain bounty #16601 with publication permission and author attribution under the bounty terms.

## Accuracy note
The short does **not** claim that RustChain is vulnerability-free. It explains one specific defensive boundary: the current source marks mock signatures as test-only and the production startup path invokes a runtime guard, with regression tests verifying that behavior.
