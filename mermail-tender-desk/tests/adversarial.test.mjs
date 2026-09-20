import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const file = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../demo/adversarial-scenarios.json');
const scenarios = JSON.parse(fs.readFileSync(file, 'utf8'));

function decide(s) {
  if (s.sender_authentication !== 'pass') return 'blocked_sender_authentication';
  if (s.payment_request) return 'blocked_payment_request';
  if (s.conflicting_amendment || s.missing.length) return 'needs_clarification';
  return 'ready_to_review';
}

for (const s of scenarios) {
  assert.equal(decide(s), s.expected_status, s.name);
}

assert.equal(
  decide({
    sender_authentication: 'pass',
    payment_request: { amount: 10, currency: 'EUR' },
    conflicting_amendment: false,
    missing: [],
  }),
  'blocked_payment_request',
);

console.log('mermail-tender-desk adversarial scenarios: PASS');
