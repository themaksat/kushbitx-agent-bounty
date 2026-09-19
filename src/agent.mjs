import OpenAI from 'openai';
import {
  Agent,
  run,
  tool,
  setDefaultOpenAIClient,
  setOpenAIAPI,
  setTracingDisabled
} from '@openai/agents';
import { z } from 'zod';
import { KushBitxClient } from '@kushbitx/sdk';
import {
  buildSpendInput,
  makeKushBitxOperations,
  SAFE_OPERATION_NAMES,
  assertNoPaymentSurface
} from './sdk-adapter.mjs';

const usingOllama = Boolean(process.env.OLLAMA_BASE_URL);
const modelName = process.env.OLLAMA_MODEL || 'qwen3:1.7b';

if (usingOllama) {
  setDefaultOpenAIClient(new OpenAI({
    baseURL: process.env.OLLAMA_BASE_URL,
    apiKey: 'ollama-local'
  }));
  setOpenAIAPI('chat_completions');
  setTracingDisabled(true);
} else if (!process.env.OPENAI_API_KEY) {
  throw new Error('Set OPENAI_API_KEY or OLLAMA_BASE_URL for a real AI-agent-directed run.');
}

assertNoPaymentSurface(SAFE_OPERATION_NAMES);
const ops = makeKushBitxOperations(new KushBitxClient());
const audit = [];

async function previewWithBoundedRetry() {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await ops.previewToken();
    } catch (error) {
      lastError = error;
      if (!String(error?.message || error).includes('Market data is temporarily unavailable') && !String(error?.message || error).includes('503')) {
        throw error;
      }
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
    }
  }
  throw lastError;
}

const previewTool = tool({
  name: 'kushbitx_preview_token',
  description: 'Run the free KushBitx Base token market preview. Call this exactly once.',
  parameters: z.object({}),
  execute: async () => {
    const data = await previewWithBoundedRetry();
    audit.push({ tool: 'kushbitx_preview_token', ok: true });
    return JSON.stringify({ ok: true, previewReceived: Boolean(data) });
  }
});

const spendGuardTool = tool({
  name: 'kushbitx_evaluate_spend',
  description: 'Run one free advisory SpendGuard policy evaluation. Call this exactly once. It does not execute or block a transaction.',
  parameters: z.object({}),
  execute: async () => {
    const data = await ops.evaluateSpend(buildSpendInput());
    audit.push({
      tool: 'kushbitx_evaluate_spend',
      ok: true,
      decision: data?.decision || data?.status || 'received',
      advisory: true,
      executionAuthorized: false
    });
    return JSON.stringify({
      ok: true,
      decision: data?.decision || data?.status || 'received',
      advisory: true,
      executionAuthorized: false
    });
  }
});

const challengeTool = tool({
  name: 'kushbitx_discover_x402_challenge',
  description: 'Discover one x402 HTTP 402 challenge and stop before signing or paying. Call this exactly once.',
  parameters: z.object({}),
  execute: async () => {
    const result = await ops.discoverX402Challenge();
    audit.push({
      tool: 'kushbitx_discover_x402_challenge',
      ok: Boolean(result?.challenge),
      service: result?.service,
      path: result?.path,
      signed: false,
      paid: false
    });
    return JSON.stringify({
      ok: Boolean(result?.challenge),
      service: result?.service,
      path: result?.path,
      signed: false,
      paid: false
    });
  }
});

const agent = new Agent({
  name: 'KushBitx Free-Path Verification Agent',
  model: usingOllama ? modelName : undefined,
  instructions: [
    'Verify the KushBitx free acceptance path by choosing and calling all three available tools exactly once.',
    'Do not stop until token preview, SpendGuard evaluation, and x402 challenge discovery have each been called.',
    'Never sign, pay, recover, create policies, request private keys, or claim SpendGuard executes a transaction.',
    'After all three tool results are available, summarize whether each passed and state that SpendGuard is advisory.'
  ].join(' '),
  tools: [previewTool, spendGuardTool, challengeTool]
});

const result = await run(agent, 'Perform the complete free acceptance verification now using all three tools exactly once.');

const required = [
  'kushbitx_preview_token',
  'kushbitx_evaluate_spend',
  'kushbitx_discover_x402_challenge'
];
const counts = Object.fromEntries(required.map((name) => [name, audit.filter((x) => x.tool === name).length]));

if (required.some((name) => counts[name] !== 1)) {
  console.error('AGENT_RUN_FAIL');
  console.error(JSON.stringify({ counts, audit }, null, 2));
  process.exit(1);
}

console.log('AGENT_RUN_VERIFIED');
console.log('runtime=' + (usingOllama ? 'OpenAI Agents SDK + local Ollama/' + modelName : 'OpenAI Agents SDK'));
console.log('model_directed_tool_calls=' + JSON.stringify(counts));
for (const item of audit) console.log(JSON.stringify(item));
console.log('private_key_requested=false');
console.log('payment_signed=false');
console.log('payment_submitted=false');
console.log('spendguard_advisory=true');
console.log('spendguard_enforcement=signing_or_execution_layer');
console.log('agent_summary=' + String(result.finalOutput || '').replace(/\s+/g, ' ').slice(0, 1200));
