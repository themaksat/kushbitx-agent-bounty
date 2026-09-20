# Synthetic demo — Mermail Tender Desk

This demo uses synthetic data only. It demonstrates the intended agent behavior without contacting a buyer, submitting a tender, or spending funds.

## Input

Selected email:
- Subject: `RFP 2026-117 — Automated Procurement Intelligence Pilot`
- Sender authentication: `pass`
- Buyer: Example Municipal Procurement Office
- Received: 2026-09-20
- Attachments:
  - `RFP-2026-117.pdf`
  - `pricing-template.xlsx`

Extracted evidence:
- Deadline: 2026-09-29 12:00 UTC
- Contract value: EUR 45,000
- Geography: EU
- Mandatory: company registration, 2 references, EUR 1M professional liability insurance
- Submission: buyer procurement portal
- Clarification deadline: 2026-09-23 12:00 UTC
- No participation fee

## Expected skill output

```yaml
status: needs_clarification
opportunity:
  title: Automated Procurement Intelligence Pilot
  buyer: Example Municipal Procurement Office
  deadline: 2026-09-29T12:00:00Z
  value: 45000
  currency: EUR
eligibility:
  status: partial
  requirements:
    - company registration: verified
    - 2 references: verified
    - EUR 1M professional liability insurance: unknown
requirements:
  mandatory:
    - technical response
    - pricing template
    - signed declaration
  missing:
    - insurance evidence
  ambiguous:
    - whether equivalent non-EU insurance is accepted
risk:
  deadline: safe_if_clarified_before_2026-09-23
  legal_commitment: submission_requires_human_action
  payment_or_fee: none_found
  evidence_quality: high_except_insurance
next_action: draft one clarification question about accepted insurance equivalence
```

## Draft behavior

The skill may save an unsent draft asking:

"Please confirm whether professional liability insurance issued by a non-EU insurer is acceptable if coverage is at least EUR 1,000,000 and the policy is valid for the contract period."

It must not send the draft, create a portal account, upload documents, sign the declaration, or submit the bid without separate exact authorization.

## Why this is useful

Procurement opportunities are unusually easy for agents to mishandle because a single email can mix factual requirements, external links, legal declarations, payment instructions, and hard deadlines. The Tender Desk separates evidence extraction from legal/commercial action and produces an auditable next step.
