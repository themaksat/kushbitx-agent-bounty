import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';
import { KushBitxClient } from '@kushbitx/sdk';
import {
  buildSpendInput,
  makeKushBitxOperations,
  SAFE_OPERATION_NAMES,
  assertNoPaymentSurface
} from './sdk-adapter.mjs';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required for the actual AI-agent-directed run.');
}

assertNoPaymentSurface(SAFE_OPERATION_NAMES);
const ops = makeKushBitxOperations(new KushBitxClient());

const previewTool = tool({
  name: 'kushbitx_preview_token',
  description: 'Run the free KushBitx Base token market preview. No wallet or payment is used.',
  parameters: z.object({ address: z.string().min(1) }),
  execute: async ({ address }) => JSON.stringify(await ops.previewToken(address))
});

const spendGuardTool = tool({
  name: 'kushbitx_evaluate_spend',
  description: 'Run a free advisory SpendGuard policy evaluation. This tool does not execute or block transactions.',
  parameters: z.object({}),
  execute: async () => JSON.stringify(await ops.evaluateSpend(buildSpendInput()))
});

const challengeTool = tool({
  name: 'kushbitx_discover_x402_challenge',
  description: 'Discover an x402 HTTP 402 payment challenge for token-risk and stop before signing or paying.',
  parameters: z.object({ address: z.string().min(1) }),
  execute: async ({ address }) => {
    const result = await ops.discoverX402Challenge(address);
    return JSON.stringify({
      service: result.service,
      path: result.path,
      challenge: result.challenge,
      paymentRequired: result.paymentRequired,
      signed: false,
      paid: false
    });
  }
});

const agent = new Agent({
  name: 'KushBitx Free-Path Verification Agent',
  instructions: [
    'Verify the KushBitx SDK bounty free acceptance path.',
    'You must call all three tools exactly once: token preview, SpendGuard evaluation, and x402 challenge discovery.',
    'Do not sign, pay, recover, create policies, or request private keys.',
    'State clearly that SpendGuard is advisory and enforcement belongs to the signing/execution layer.',
    'Finish with a concise PASS/FAIL summary for each requirement.'
  ].join(' '),
  tools: [previewTool, spendGuardTool, challengeTool]
});

const token = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const result = await run(agent, `Run the free KushBitx acceptance flow for Base token ${token}.`);
console.log(result.finalOutput);
