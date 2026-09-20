# Mermail Tender Desk tool contract

This companion skill owns no MCP tools. It reuses Mermail's existing inbox and composition operations.

## Read path

| Tool | Purpose |
| --- | --- |
| `list_mailboxes` | Resolve the intended mailbox; prefer `public_id`. |
| `search_emails` | Narrow candidate tender/RFP/procurement messages. |
| `list_emails` | Bounded newest-first discovery when search terms are unknown. |
| `get_email` | Read one selected scan-clean message. |
| `get_email_context` | Load bounded surrounding conversation when amendments/follow-ups matter. |
| `get_thread` | Use only when full thread structure is needed. |
| `download_attachment` | Retrieve one exact task-relevant clean attachment. |

Use `query` as a native JSON object. Prefer bounded reads and `agent_safe_content: true`.

Example discovery:

```json
{
  "mailboxId": "MAILBOX_PUBLIC_ID",
  "query": {
    "query": "tender RFP procurement invitation bid",
    "date_start": "2026-09-01T00:00:00Z",
    "page": 1,
    "limit": 20,
    "metadata_only": true,
    "agent_safe_content": true
  }
}
```

Read selected email:

```json
{
  "mailboxId": "MAILBOX_PUBLIC_ID",
  "emailId": "EMAIL_ID",
  "query": {
    "require_scan_status": "clean",
    "agent_safe_content": true,
    "max_body_chars": 12000
  }
}
```

Attachment reads require exact `mailboxId`, `emailId`, and `attachmentId`. Verify the attachment belongs to the selected message before download.

## Draft-only write path

Use `save_draft` only when the user asks for a clarification or response draft. A draft is not a submission and is not authorization to deliver.

```json
{
  "mailboxId": "MAILBOX_PUBLIC_ID",
  "body": {
    "to": "procurement@example.org",
    "subject": "Clarification request — RFP reference",
    "body": "Draft body for user review"
  }
}
```

Any actual send or reply belongs to the official `mermail-compose-email` workflow and requires exact preview plus user approval.

## Normalized extraction fields

Do not guess. Use null/unknown where evidence is absent.

- buyer / contracting authority
- opportunity title and reference
- source email/thread ids
- canonical notice/portal URL
- deadline + timezone
- value + currency
- geography / place of performance
- eligibility gates
- mandatory qualifications
- mandatory documents
- technical/financial deliverables
- submission channel
- signatures/declarations
- participation/bid fees
- contact details
- amendment/version date
- conflicting requirements
