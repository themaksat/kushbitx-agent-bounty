import assert from 'node:assert/strict';
import { packet } from '../demo/simulate.mjs';

assert.equal(packet.status, 'needs_clarification');
assert.equal(packet.opportunity.value, 45000);
assert.equal(packet.opportunity.currency, 'EUR');
assert.equal(packet.eligibility.status, 'partial');
assert.deepEqual(packet.requirements.missing, ['EUR 1M professional liability insurance']);
assert.equal(packet.risk.legal_commitment, 'submission_requires_human_action');
assert.equal(packet.risk.payment_or_fee, 'none_found');
assert.match(packet.next_action, /unsent/i);

console.log('mermail-tender-desk demo assertions: PASS');
