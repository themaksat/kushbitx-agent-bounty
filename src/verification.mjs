import { tool } from '@openai/agents';
import { z } from 'zod';
import { KushBitxClient } from '@kushbitx/sdk';
import { makeKushBitxOperations } from './sdk-adapter.mjs';

export const TOOL_NAMES = Object.freeze([
  'kushbitx_preview_token', 'kushbitx_evaluate_spend', 'kushbitx_discover_x402_challenge'
]);
export function createClient() {
  return new KushBitxClient({ fetchFn: (url, options) => fetch(url, {
    ...options, redirect: 'error', signal: AbortSignal.timeout(30_000)
  }) });
}
export async function previewWithBoundedRetry(ops, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {
  for (let attempt = 1; ; attempt++) {
    try { return await ops.previewToken(); }
    catch (error) {
      if (attempt === 3 || !/Market data is temporarily unavailable|HTTP 503/.test(String(error?.message))) throw error;
      await sleep(750 * attempt);
    }
  }
}
// Never publish raw responses, encoded payment headers, addresses, exception
// messages, or model prose: they may contain secrets or personal information.
export function createVerification(client = createClient()) {
  const ops = makeKushBitxOperations(client);
  const audit = [];
  const actions = [
    async () => {
      await previewWithBoundedRetry(ops);
      return { previewReceived: true, responseValidated: true };
    },
    async () => {
      const data = await ops.evaluateSpend();
      return { decision: data.decision, advisory: data.advisory, executionAuthorized: data.executionAuthorized };
    },
    async () => {
      const data = await ops.discoverX402Challenge();
      return { httpStatus: 402, x402Version: data.challenge.x402Version,
        network: 'eip155:8453', service: 'token-risk', challengeValidated: true,
        paymentRequiredHeaderValidated: true, signed: false, paid: false };
    }
  ];
  const tools = TOOL_NAMES.map((name, index) => tool({
    name,
    description: [
      'Run the free Base token preview exactly once.',
      'Run free advisory SpendGuard evaluation exactly once. It does not execute or block transactions.',
      'Discover and validate an HTTP 402 challenge exactly once. Stop without signing or paying.'
    ][index],
    parameters: z.object({}).strict(),
    errorFunction: () => { throw new Error('Invalid tool call; verification failed'); },
    execute: async () => {
      if (audit.some((entry) => entry.tool === name)) {
        audit.push({ tool: name, ok: false, error: 'duplicate_call' });
        throw new Error('Duplicate tool call; verification failed');
      }
      const entry = { tool: name, ok: false };
      audit.push(entry);
      try {
        Object.assign(entry, await actions[index](), { ok: true });
        return JSON.stringify(entry);
      } catch {
        entry.error = 'operation_failed';
        throw new Error('KushBitx operation failed validation or transport');
      }
    }
  }));
  return { tools, audit };
}
export function assertVerified(audit) {
  const counts = Object.fromEntries(TOOL_NAMES.map((name) => [name, audit.filter((entry) => entry.tool === name).length]));
  if (audit.length !== TOOL_NAMES.length || audit.some((entry) => entry.ok !== true) ||
      TOOL_NAMES.some((name) => counts[name] !== 1)) throw new Error('Incomplete or failed tool verification');
  return counts;
}
export function printEvidence(audit, { runtime, model, modelDirected }) {
  const counts = assertVerified(audit);
  console.log(modelDirected ? 'AGENT_RUN_VERIFIED' : 'SDK_SMOKE_VERIFIED');
  console.log('verified_at=' + new Date().toISOString());
  console.log('runtime=' + runtime);
  if (model) console.log('model=' + (/^[a-zA-Z0-9_.:/-]{1,80}$/.test(model) ? model : '[REDACTED]'));
  console.log('tool_calls=' + JSON.stringify(counts));
  for (const entry of audit) console.log(JSON.stringify(entry));
  console.log('private_key_requested=false\npayment_signed=false\npayment_submitted=false');
  console.log('spendguard_enforcement=signing_or_execution_layer');
  console.log('summary=All three validated tool results passed; unsigned x402 challenge discovered.');
  console.log('summary_source=validated_tool_results; model_prose_omitted');
}
