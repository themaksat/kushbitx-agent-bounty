import { RunContext, setTracingDisabled } from '@openai/agents';
import { createVerification, printEvidence } from './verification.mjs';

setTracingDisabled(true);
try {
  const { tools, audit } = createVerification();
  for (const tool of tools) await tool.invoke(new RunContext(), '{}');
  printEvidence(audit, { runtime: 'deterministic SDK smoke check (not an AI-directed run)', modelDirected: false });
} catch {
  console.error('SDK_SMOKE_FAIL: transport or response validation failed; no verified success.');
  process.exitCode = 1;
}
