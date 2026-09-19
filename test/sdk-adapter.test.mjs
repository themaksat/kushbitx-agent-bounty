import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSpendInput,
  makeKushBitxOperations,
  SAFE_OPERATION_NAMES,
  assertNoPaymentSurface
} from '../src/sdk-adapter.mjs';

test('exposes only the three acceptance-critical operations', () => {
  assert.deepEqual(SAFE_OPERATION_NAMES, ['previewToken', 'evaluateSpend', 'discoverX402Challenge']);
  assert.equal(assertNoPaymentSurface(SAFE_OPERATION_NAMES), true);
});

test('rejects accidental payment/signing surfaces', () => {
  assert.throws(() => assertNoPaymentSurface(['previewToken', 'submitPayment']), /Forbidden/);
  assert.throws(() => assertNoPaymentSurface(['recoverReport']), /Forbidden/);
});

test('preview delegates to SDK client', async () => {
  const fake = { previewToken: async (address) => ({ address, ok: true }) };
  const ops = makeKushBitxOperations(fake);
  assert.deepEqual(await ops.previewToken('0xabc'), { address: '0xabc', ok: true });
});

test('SpendGuard evaluation uses a complete free-path policy input', async () => {
  let captured;
  const fake = { evaluateSpend: async (input) => (captured = input) };
  const ops = makeKushBitxOperations(fake);
  await ops.evaluateSpend(buildSpendInput());
  assert.equal(captured.chain, 'base');
  assert.equal(captured.asset, 'USDC');
  assert.ok(captured.policy.maxPerTransaction);
  assert.ok(Array.isArray(captured.policy.allowedRecipients));
  assert.equal(captured.policy.blockUnknownRecipients, true);
});

test('x402 discovery delegates to getPaymentChallenge without payment', async () => {
  let captured;
  const fake = {
    getPaymentChallenge: async (service, input) => {
      captured = { service, input };
      return { service, path: '/api/token-risk', challenge: { accepts: [] }, paymentRequired: 'mock' };
    }
  };
  const ops = makeKushBitxOperations(fake);
  const result = await ops.discoverX402Challenge('0xdef');
  assert.equal(captured.service, 'token-risk');
  assert.deepEqual(captured.input, { chain: 'base', address: '0xdef' });
  assert.equal(result.path, '/api/token-risk');
});

test('upstream failures are surfaced, not silently converted to success', async () => {
  const fake = { previewToken: async () => { throw new Error('HTTP 503'); } };
  const ops = makeKushBitxOperations(fake);
  await assert.rejects(() => ops.previewToken(), /HTTP 503/);
});

test('unexpected/missing 402 challenge is surfaced by SDK client contract', async () => {
  const fake = { getPaymentChallenge: async () => { throw new Error('Expected an HTTP 402 payment challenge'); } };
  const ops = makeKushBitxOperations(fake);
  await assert.rejects(() => ops.discoverX402Challenge(), /Expected an HTTP 402/);
});
