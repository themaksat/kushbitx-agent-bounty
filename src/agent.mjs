import OpenAI from 'openai';
import { Agent, run, setDefaultOpenAIClient, setOpenAIAPI, setTracingDisabled } from '@openai/agents';
import { createVerification, printEvidence } from './verification.mjs';

setTracingDisabled(true);
let runAudit = [];
try {
  const usingOllama = Boolean(process.env.OLLAMA_BASE_URL);
  const model = usingOllama ? (process.env.OLLAMA_MODEL || 'qwen3:1.7b') : undefined;
  if (usingOllama) {
    const endpoint = new URL(process.env.OLLAMA_BASE_URL);
    if (endpoint.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname) || endpoint.username || endpoint.password) {
      throw new Error('Ollama endpoint must be local HTTP');
    }
    setDefaultOpenAIClient(new OpenAI({ baseURL: endpoint.href, apiKey: 'ollama-local', timeout: 180_000, maxRetries: 0 }));
    setOpenAIAPI('chat_completions');
  } else if (!process.env.OPENAI_API_KEY) {
    console.error('Set OLLAMA_BASE_URL=http://127.0.0.1:11434/v1 and OLLAMA_MODEL for the zero-cost run.');
    throw new Error('No model configured');
  }
  const { tools, audit } = createVerification();
  runAudit = audit;
  const agent = new Agent({
    name: 'KushBitx Free-Path Verification Agent', model,
    ...(usingOllama ? { modelSettings: { temperature: 0 } } : {}),
    instructions: 'Choose and call each of the three available tools exactly once with {} arguments. ' +
      'Use only tool results as evidence. Never sign or pay. SpendGuard is advisory; enforcement belongs to the signing/execution layer. ' +
      'When all three tools have returned, finish. Do not repeat a tool.',
    tools
  });
  await run(agent, 'Verify the complete free acceptance path now using all three tools exactly once.', { maxTurns: 8 });
  printEvidence(audit, { runtime: 'OpenAI Agents SDK', model, modelDirected: true });
} catch {
  console.error('AGENT_RUN_FAIL: model, transport, tool, or response validation failed; no verified success.');
  console.error('validated_tool_audit=' + JSON.stringify(runAudit));
  process.exitCode = 1;
}
