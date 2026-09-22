# KushBitx AI agent: free acceptance path

[![RustChain bounty participant](https://img.shields.io/badge/RustChain-bounty%20participant-orange)](https://rustchain.org)

An OpenAI Agents SDK agent chooses and invokes three tools backed by the published `@kushbitx/sdk`: free token preview, advisory SpendGuard evaluation, and unsigned x402 challenge discovery. There is no signing, payment, private-key, recovery, policy-mutation, or transaction-submission tool.

SpendGuard is advisory. Enforcement belongs to the signing or execution layer. A discovered payment challenge is not a payment or a paid report.

## Find EU Tender Opportunities

[Free EU tender sample](https://eu-tender-x402-v3-production.up.railway.app/preview) · [Buyer guide](docs/find-eu-tender-opportunities.md) · [Revenue Swarm storefront](https://revenue-swarm.lovable.app/?utm_source=github&utm_medium=organic&utm_campaign=repo_readme)

## Related live x402 service: Revenue Swarm

The same owner also operates **Revenue Swarm EU Tender Intelligence**, a separate live x402 service for ranked EU public-procurement opportunities sourced from TED. It is not part of the KushBitx bounty codebase; the links below are provided as a related production example of machine-payable data access.

- Human storefront: https://revenue-swarm.lovable.app
- Free live tender preview: https://eu-tender-x402-v3-production.up.railway.app/preview
- x402 discovery: https://eu-tender-x402-v3-production.up.railway.app/.well-known/x402
- OpenAPI: https://eu-tender-x402-v3-production.up.railway.app/openapi.json
- Agent/developer quickstart: https://eu-tender-x402-v3-production.up.railway.app/quickstart
- LLM discovery: https://eu-tender-x402-v3-production.up.railway.app/llms.txt

Current paid resources are 0.001 USDC, 0.01 USDC, and 0.10 USDC per request on Base. Test and probe traffic is not presented as customer revenue.

## Related tools

[RustChain](https://rustchain.org) is relevant to this repository because both projects explore agent-oriented payment and verification flows without requiring a traditional human checkout. This repo keeps RustChain work separate from the KushBitx acceptance path, but RustChain is a useful reference for machine-payable bounties and agent-native infrastructure.

## Reproduce from a clean clone

Requires Node.js 22+ and npm. The lockfile pins the tested dependency graph.

```sh
git clone https://github.com/u4350637864-stack/kushbitx-agent-bounty.git
cd kushbitx-agent-bounty
npm ci --ignore-scripts
npm test
npm run smoke
```

`npm test` uses the real published SDK with mocked HTTP responses and invokes the actual agent tools. It covers valid requests, invalid inputs, HTTP/transport failures, malformed JSON, missing or conflicting x402 challenges, safety flags, duplicate/missing tool calls, bounded preview retries, and sanitized evidence.

`npm run smoke` calls the live free endpoints deterministically. It is a connectivity/schema check, **not evidence of an AI-directed run**. Both commands exit nonzero on failure.

## Zero-cost AI-directed run with local Ollama

Install [Ollama](https://ollama.com), start its local server, and pull a tool-capable model:

```sh
ollama pull qwen3:1.7b
```

Bash:

```sh
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1 OLLAMA_MODEL=qwen3:1.7b npm run agent
```

PowerShell:

```powershell
$env:OLLAMA_BASE_URL = 'http://127.0.0.1:11434/v1'
$env:OLLAMA_MODEL = 'qwen3:1.7b'
npm run agent
```

An existing local tool-capable model can be selected with `OLLAMA_MODEL`. `revenue-swarm:latest` is the owner's custom local model, not a model other contributors need to download. Ollama runs locally without a model API key or paid API calls. Hardware affects speed, and model behavior can vary.

The runtime passes all three tool definitions to the model; it does not execute a hardcoded sequence. Each accepts only `{}` and uses fixed demo inputs. A duplicate call, tool failure, missing result, or more than eight agent turns fails the run. SDK requests time out after 30 seconds. Only transient token-preview failures receive bounded retries (three attempts total).

The optional existing OpenAI path uses `OPENAI_API_KEY` when `OLLAMA_BASE_URL` is unset; that provider may charge for inference and is not needed for the free path. Tracing is disabled for both providers.

## Validation and evidence

The adapter validates a real preview response, the returned SpendGuard decision/advisory flags, and the HTTP 402 body's Base USDC offers against the decoded `PAYMENT-REQUIRED` header. Non-402 responses are rejected by the SDK. Merely receiving a truthy object is not success.

`evidence/run-output.txt` contains a successful model-directed run. Output is an allowlist of validated fields: no raw responses, wallet/test addresses, encoded payment headers, API keys, raw exceptions, or model-generated prose. The final summary is explicitly derived from validated tool results, because model prose can contradict those results. This does not replace the model's tool selection: the model still chooses each call through the Agents SDK.

To refresh evidence in Bash without replacing the last successful file on failure:

```sh
npm run agent > evidence/run-output.tmp && mv evidence/run-output.tmp evidence/run-output.txt
```

In PowerShell:

```powershell
npm run agent > evidence/run-output.tmp
if ($LASTEXITCODE -eq 0) { Move-Item -Force evidence/run-output.tmp evidence/run-output.txt }
```

GitHub Actions installs from the lockfile, runs the automated tests, and on main runs a local Ollama model against the live free endpoints. It updates the evidence only after success. Public API availability and local model behavior are external dependencies; failed runs must not be described as verified success.

## Bounty status

Historical submission for [kushBitxHQ/kushbitx-sdk#1](https://github.com/kushBitxHQ/kushbitx-sdk/issues/1). The issue advertised a single 50 USDC Base award. On 2026-09-20 the maintainer selected and assigned another contributor for that one award, so this repository is **not eligible for that bounty payout**. The integration remains useful as technical work, but Revenue Swarm must not count or pursue the 50 USDC as pending revenue.


## RustChain Shorts package

A separate original publication package for RustChain bounty #16601 lives at:
[rustchain-shorts-mock-signature/](./rustchain-shorts-mock-signature/)

It explains the public mock-signature production guard using RustChain source plus our reproducible CI evidence. This is a separate bounty deliverable and does not imply RustChain affiliation with the KushBitx submission.
