# Existing Mermail tools used

This companion skill owns no tools. It relies on existing official Mermail skill contracts.

| Purpose | Existing tools |
| --- | --- |
| Find claim/payment messages | `search_emails`, `list_emails` |
| Read selected evidence | `get_email`, `get_email_context`, `get_thread` |
| Prepare a bounded follow-up | `save_draft` |
| Send only after exact approval | `reply_to_email` |

Follow the official `mermail-manage-inbox` and `mermail-compose-email` contracts for tool details, limits, and authorization behavior.
