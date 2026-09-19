# KushBitx bounty maintainer verification checklist

This page maps the public submission directly to the acceptance criteria and to the three remediation items the maintainer requested in the preliminary review on issue #1.

## 1. Actual AI agent runtime

- Runtime: OpenAI Agents SDK (`@openai/agents`).
- Local inference path: Ollama with `qwen3:1.7b` through an OpenAI-compatible endpoint.
- Agent entry point: [src/agent.mjs](../src/agent.mjs).
- The model receives the three tool definitions and chooses tool calls through the agent runtime; the production agent path is not a fixed three-call script.
- Duplicate calls, failed tools, missing successful results, or excessive turns fail verification.
- Verified sanitized model-directed evidence: [evidence/run-output.txt](./run-output.txt).
- Passing public workflow: https://github.com/u4350637864-stack/kushbitx-agent-bounty/actions/runs/35468040914

Verified evidence includes:

```
AGENT_RUN_VERIFIED
runtime=OpenAI Agents SDK
model=qwen3:1.7b
tool_calls={"kushbitx_preview_token":1,"kushbitx_evaluate_spend":1,"kushbitx_discover_x402_challenge":1}
private_key_requested=false
payment_signed=false
payment_submitted=false
spendguard_advisory=true
spendguard_enforcement=signing_or_execution_layer
```

## 2. Published `@kushbitx/sdk` dependency

`package.json` pins:

```json
"@kushbitx/sdk": "0.1.0"
```

Install/reproduce:

```sh
npm ci --ignore-scripts
npm test
npm run smoke
```

## 3. Free token preview

- Adapter: `previewToken` in [src/sdk-adapter.mjs](../src/sdk-adapter.mjs).
- Validates the returned preview flag, token address/symbol, and market object.
- Invalid addresses are rejected before HTTP.
- HTTP, transport, empty, and malformed responses fail closed.
- Only transient preview failures receive bounded retry.

## 4. One SpendGuard evaluation

- Adapter: `evaluateSpend`.
- Uses the documented Base/USDC input shape.
- Validates the decision and explicitly requires:
  - `advisory === true`
  - `executionAuthorized === false`
- README and evidence both state that SpendGuard is policy evaluation only; enforcement belongs to the signing/execution layer.

## 5. x402 challenge discovery without signing or paying

- Adapter: `discoverX402Challenge`.
- Uses the SDK payment-challenge discovery path and stops at HTTP 402.
- Validates Base network, USDC asset, positive amount, pay-to address, timeout, and the decoded `PAYMENT-REQUIRED` header.
- Conflicting header/body terms fail verification.
- No sign, payment, recovery, submission, or policy-mutation tool is exposed.

## 6. Automated tests

[Test suite](../test/sdk-adapter.test.mjs) covers:

- three permitted SDK operations;
- invalid token addresses and spend inputs;
- HTTP 400/500/503 failures;
- transport failures;
- empty/malformed JSON;
- invalid SpendGuard safety flags;
- unexpected non-402 challenge responses;
- missing/malformed/conflicting payment challenge evidence;
- duplicate tool invocation;
- missing/false tool results;
- unexpected tool arguments;
- sanitization of addresses, payment headers, PII, API keys, raw errors, and model prose;
- bounded transient preview retry.

[Dependency test](../test/dependencies.test.mjs) verifies the runtime APIs used by the agent are present.

## 7. Fresh reproducible evidence

The GitHub Actions workflow:

1. installs the lockfile;
2. runs `npm test`;
3. syntax-checks the agent and smoke runner;
4. installs Ollama;
5. pulls the local model;
6. runs the genuine model-directed agent against the live free endpoints;
7. updates sanitized evidence only after a successful run.

Latest clean model-directed proof used for the bounty:
https://github.com/u4350637864-stack/kushbitx-agent-bounty/actions/runs/35468040914

## Safety boundary

This repository requests no private key and contains no signing/payment execution path. A payment challenge is discovered, validated, and stopped before payment. Technical completion does not imply assignment, acceptance, or entitlement to the advertised bounty.
