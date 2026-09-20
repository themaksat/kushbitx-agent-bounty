import fs from 'node:fs';
import path from 'node:path';

const inputPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'input.json');
const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const unknownEligibility = input.evidence.eligibility
  .filter(item => item.status !== 'verified')
  .map(item => item.requirement);

const packet = {
  status: unknownEligibility.length ? 'needs_clarification' : 'ready_to_review',
  opportunity: {
    title: input.email.subject.replace(/^RFP\s+\d{4}-\d+\s+—\s+/, ''),
    buyer: input.email.buyer,
    source_email_id: input.email.id,
    source_thread_id: input.email.thread_id,
    source_url: input.evidence.source_url,
    deadline: input.evidence.deadline,
    value: input.evidence.value,
    currency: input.evidence.currency,
    geography: input.evidence.geography,
  },
  eligibility: {
    status: unknownEligibility.length ? 'partial' : 'verified',
    requirements: input.evidence.eligibility,
  },
  requirements: {
    mandatory: input.evidence.mandatory_documents,
    missing: unknownEligibility,
    ambiguous: input.evidence.ambiguity ? [input.evidence.ambiguity] : [],
  },
  submission: {
    channel: input.evidence.submission_channel,
  },
  risk: {
    deadline: input.evidence.clarification_deadline
      ? `clarify_before_${input.evidence.clarification_deadline}`
      : 'deadline_only',
    legal_commitment: 'submission_requires_human_action',
    payment_or_fee: input.evidence.participation_fee == null ? 'none_found' : 'requires_manual_review',
    evidence_quality: unknownEligibility.length ? 'partial' : 'high',
  },
  next_action: unknownEligibility.length
    ? 'Draft one clarification question; keep it unsent until user approval.'
    : 'Present the decision packet for human bid/no-bid review.',
};

if (input.email.sender_authentication.status !== 'pass') {
  packet.status = 'blocked_sender_authentication';
}

console.log(JSON.stringify(packet, null, 2));

export { packet };
