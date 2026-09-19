import { KushBitxClient } from '@kushbitx/sdk';
import { buildSpendInput, makeKushBitxOperations, SAFE_OPERATION_NAMES, assertNoPaymentSurface } from './sdk-adapter.mjs';

assertNoPaymentSurface(SAFE_OPERATION_NAMES);
const ops = makeKushBitxOperations(new KushBitxClient());
const token = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const preview = await ops.previewToken(token);
const spend = await ops.evaluateSpend(buildSpendInput());
const challenge = await ops.discoverX402Challenge(token);

console.log(JSON.stringify({
  tokenPreview: { ok: Boolean(preview), data: preview },
  spendGuard: { ok: Boolean(spend), advisory: true, executionAuthorized: false, data: spend },
  x402: {
    ok: Boolean(challenge?.challenge),
    service: challenge.service,
    path: challenge.path,
    paymentRequired: challenge.paymentRequired,
    signed: false,
    paid: false
  }
}, null, 2));
