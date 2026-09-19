# KushBitx AI Agent — Free Acceptance Path

This repository is a minimal AI-agent integration for the KushBitx SDK bounty.

## Safety boundary

This project intentionally exposes only three operations:

1. free token preview;
2. free SpendGuard evaluation;
3. x402 payment-challenge discovery that **stops at HTTP 402**.

It exposes **no private-key, signing, payment, recovery, policy-mutation, or transaction-submission capability**.

SpendGuard is treated as **advisory policy evaluation only**. Enforcement belongs to the signing/execution layer.

## Requirements

- Node.js 22+
- For the AI-directed run only: `OPENAI_API_KEY`

## Install

```bash
npm install
```

This installs the published `@kushbitx/sdk` package plus the OpenAI Agents SDK.

## Test

```bash
npm test
```

Tests cover:

- the three-tool boundary;
- accidental exposure of payment/signing surfaces;
- free token preview delegation;
- complete SpendGuard input shape;
- x402 challenge discovery;
- upstream failures;
- missing/unexpected HTTP 402 challenges.

## Free SDK smoke run

```bash
npm run smoke
```

This makes no payment and signs nothing.

## Actual AI-agent-directed run

```bash
export OPENAI_API_KEY=...
npm run agent
```

The AI agent is instructed to invoke all three safe tools exactly once and then return a PASS/FAIL summary. No private key or funded wallet is used.

## Evidence

After a live run, save sanitized output in `evidence/run-output.txt`. Remove API keys, personal information, wallet addresses used for testing, and any other secrets before committing.

## Bounty mapping

- Public `@kushbitx/sdk`: dependency in `package.json`
- AI agent runtime: `src/agent.mjs`
- Free token preview: `kushbitx_preview_token`
- SpendGuard evaluation: `kushbitx_evaluate_spend`
- x402 challenge only: `kushbitx_discover_x402_challenge`
- Reproducible instructions: this README
- Tests: `test/sdk-adapter.test.mjs`
- No signing/payment path exposed: asserted in code and tests
