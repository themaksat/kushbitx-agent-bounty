import test from 'node:test';
import assert from 'node:assert/strict';
import { KushBitxClient } from '@kushbitx/sdk';
import { RunContext } from '@openai/agents';
import { buildSpendInput, makeKushBitxOperations, SAFE_OPERATION_NAMES } from '../src/sdk-adapter.mjs';
import { createVerification, TOOL_NAMES, assertVerified, printEvidence, previewWithBoundedRetry } from '../src/verification.mjs';

const token = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const recipient = '0x0000000000000000000000000000000000000000';
const preview = { preview: true, token: { address: token, symbol: 'USDC' }, market: { priceUsd: '1' } };
const spend = { decision: 'HUMAN_APPROVAL', advisory: true, executionAuthorized: false };
const challenge = { x402Version: 2, accepts: [{ scheme: 'exact', network: 'eip155:8453', amount: '250000', asset: token, payTo: recipient, maxTimeoutSeconds: 300 }] };
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64');
function setup(overrides = {}) {
  const calls = [];
  const client = new KushBitxClient({ fetchFn: async (url, options) => {
    const path = new URL(url).pathname;
    calls.push({ path, ...options, body: JSON.parse(options.body) });
    if (overrides.transportError) throw new Error('secret-canary@example.test');
    const defaults = path === '/api/token-preview' ? { data: preview, status: 200 } :
      path === '/api/spendguard/evaluate' ? { data: spend, status: 200 } :
        { data: challenge, status: 402, header: encode(challenge) };
    const result = { ...defaults, ...overrides[path] };
    return new Response(result.raw ?? JSON.stringify(result.data), {
      status: result.status, headers: result.header == null ? {} : { 'PAYMENT-REQUIRED': result.header }
    });
  } });
  return { client, calls, ops: makeKushBitxOperations(client) };
}
test('real SDK issues only the three permitted unsigned requests', async () => {
  const { client, calls, ops } = setup();
  assert.deepEqual(Object.keys(ops), SAFE_OPERATION_NAMES);
  const verification = createVerification(client);
  assert.deepEqual(verification.tools.map((t) => t.name), TOOL_NAMES);
  for (const t of verification.tools) await t.invoke(new RunContext(), '{}');
  assert.deepEqual(Object.values(assertVerified(verification.audit)), [1, 1, 1]);
  assert.deepEqual(calls.map((c) => c.path), ['/api/token-preview', '/api/spendguard/evaluate', '/api/token-risk']);
  for (const c of calls) {
    assert.equal(c.method, 'POST');
    assert.deepEqual(c.headers, { 'content-type': 'application/json' });
  }
  assert.deepEqual(calls[1].body.policy, buildSpendInput().policy);
});
for (const name of ['previewToken', 'discoverX402Challenge']) {
  for (const input of ['', '0xabc', null, { privateKey: 'canary' }]) {
    test(`${name} rejects invalid address ${JSON.stringify(input)} before HTTP`, async () => {
      const { ops, calls } = setup();
      await assert.rejects(() => ops[name](input));
      assert.equal(calls.length, 0);
    });
  }
}
for (const mutate of [
  (x) => ({ ...x, amount: '-1' }), (x) => ({ ...x, chain: 'ethereum' }),
  (x) => ({ ...x, privateKey: 'canary' }), (x) => ({ ...x, policy: {} })
]) {
  test('invalid SpendGuard input is rejected before HTTP', async () => {
    const { ops, calls } = setup();
    await assert.rejects(() => ops.evaluateSpend(mutate(buildSpendInput())));
    assert.equal(calls.length, 0);
  });
}
for (const [method, path] of [['previewToken', '/api/token-preview'], ['evaluateSpend', '/api/spendguard/evaluate'], ['discoverX402Challenge', '/api/token-risk']]) {
  for (const status of [400, 500, 503]) {
    test(`${method} rejects HTTP ${status} through real SDK`, async () => {
      await assert.rejects(() => setup({ [path]: { status, data: { error: 'upstream error' } } }).ops[method]());
    });
  }
  test(`${method} rejects transport failure`, async () => {
    await assert.rejects(() => setup({ transportError: true }).ops[method]());
  });
  for (const invalid of [{ data: {} }, { data: null }, { raw: 'not-json' }]) {
    test(`${method} rejects empty or invalid response`, async () => {
      await assert.rejects(() => setup({ [path]: invalid }).ops[method]());
    });
  }
}
for (const invalid of [
  { decision: 'MADE_UP', advisory: true, executionAuthorized: false },
  { ...spend, advisory: false }, { ...spend, executionAuthorized: true }
]) {
  test('SpendGuard safety flags are validated, not fabricated', async () => {
    await assert.rejects(() => setup({ '/api/spendguard/evaluate': { data: invalid } }).ops.evaluateSpend());
  });
}
for (const invalid of [
  { status: 200 }, { header: null }, { header: 'not-json' },
  { data: { x402Version: 2, accepts: [] } },
  { data: { ...challenge, accepts: [{ ...challenge.accepts[0], network: 'eip155:1' }] } },
  { data: { ...challenge, accepts: [{ ...challenge.accepts[0], amount: '0' }] } },
  { data: { ...challenge, accepts: [{ ...challenge.accepts[0], payTo: 'invalid' }] } },
  { header: encode({ ...challenge, accepts: [{ ...challenge.accepts[0], amount: '999999' }] }) }
]) {
  test('rejects invalid or conflicting HTTP 402 evidence', async () => {
    await assert.rejects(() => setup({ '/api/token-risk': invalid }).ops.discoverX402Challenge());
  });
}
test('tool failures cannot count as successful verification or expose raw errors', async () => {
  const { tools, audit } = createVerification(setup({ transportError: true }).client);
  await assert.rejects(() => tools[0].invoke(new RunContext(), '{}'), (error) => !error.message.includes('secret-canary'));
  assert.equal(audit[0].ok, false);
  assert.throws(() => assertVerified(audit));
});
test('duplicate tool invocation fails without repeating HTTP request', async () => {
  const { client, calls } = setup();
  const { tools, audit } = createVerification(client);
  for (const t of tools) await t.invoke(new RunContext(), '{}');
  await assert.rejects(() => tools[0].invoke(new RunContext(), '{}'));
  assert.equal(calls.length, 3);
  assert.throws(() => assertVerified(audit));
});
test('missing and false tool results fail verification', () => {
  assert.throws(() => assertVerified([]));
  assert.throws(() => assertVerified(TOOL_NAMES.map((tool) => ({ tool, ok: false }))));
});
test('tool schema rejects unexpected arguments before HTTP', async () => {
  const { client, calls } = setup();
  const { tools } = createVerification(client);
  await assert.rejects(() => tools[0].invoke(new RunContext(), '{"privateKey":"canary"}'));
  assert.equal(calls.length, 0);
});
test('published evidence omits raw addresses, headers, PII, and model prose', async () => {
  const privateData = { address: recipient, email: 'secret-canary@example.test', apiKey: 'canary-key' };
  const { client } = setup({ '/api/token-preview': { data: { ...preview, ...privateData, token: preview.token } },
    '/api/spendguard/evaluate': { data: { ...spend, ...privateData } } });
  const { tools, audit } = createVerification(client);
  for (const t of tools) {
    const result = await t.invoke(new RunContext(), '{}');
    assert.doesNotMatch(result, /0x[\da-f]{40}|secret-canary|canary-key/i);
  }
  const lines = [];
  const original = console.log;
  try {
    console.log = (line) => lines.push(line);
    printEvidence(audit, { runtime: 'test', model: 'revenue-swarm:latest', modelDirected: true });
  } finally { console.log = original; }
  assert.doesNotMatch(lines.join('\n'), /0x[\da-f]{40}|secret-canary|canary-key|eyJ4NDAy/i);
  assert.match(lines.join('\n'), /model_prose_omitted/);
});
test('preview retries only transient failures, at most three attempts', async () => {
  let calls = 0;
  await assert.rejects(() => previewWithBoundedRetry({ previewToken: async () => { calls++; throw new Error('HTTP 503'); } }, async () => {}));
  assert.equal(calls, 3);
  calls = 0;
  await assert.rejects(() => previewWithBoundedRetry({ previewToken: async () => { calls++; throw new Error('Malformed response'); } }, async () => {}));
  assert.equal(calls, 1);
  calls = 0;
  assert.equal(await previewWithBoundedRetry({ previewToken: async () => { if (++calls < 3) throw new Error('HTTP 503'); return true; } }, async () => {}), true);
  assert.equal(calls, 3);
});
