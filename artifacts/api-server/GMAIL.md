# Gmail provider

Gmail is an adapter at the communication-provider edge:

```text
LEE → EmailProvider → GmailProvider → Gmail API
```

Core code consumes `EmailMessage`, `EmailThread`, and provider-neutral sync results. It does not depend on Gmail payloads or Gmail URLs. The same `EmailProvider` contract can be implemented on the K6; migration moves or re-authorizes credentials rather than changing Core.

## Owner setup

1. Create a Google Cloud project and enable the Gmail API.
2. Configure a Web application OAuth client.
3. Add the exact callback URL shown by the running LEE deployment:
   `/api/connections/oauth/callback`
4. Set the server-side client ID and client secret using the existing LEE OAuth environment-variable convention:
   `LEE_OAUTH_GMAIL_CLIENT_ID` and `LEE_OAUTH_GMAIL_CLIENT_SECRET`.
5. In Connection Center, create an OAuth connection with provider `gmail`, then start sign-in.

Google may require OAuth app verification because Gmail scopes are restricted. The owner must complete Google consent, verification/testing-user setup, and any organization policy approval personally; LEE never accepts client secrets or tokens in the UI.

## Scopes

The adapter requests:

- `https://www.googleapis.com/auth/gmail.modify` — read messages and threads, create/update drafts, archive, mark read/unread, and manage labels.
- `https://www.googleapis.com/auth/gmail.send` — send messages after LEE’s consequential-action boundary releases the action.

Granted scope names are visible in Connection Center. Tokens are encrypted server-side in the OAuth credential store, refreshed server-side, and never enter models, logs, Event Log payloads, dashboard responses, or normal records.

## Capabilities

The API routes under `/api/email` provide inbox/approved-mail listing, Gmail search, full threads, message metadata and attachments, drafts, labels, archive, read state, and incremental history synchronization. Sync stores only governed normalized metadata plus Gmail references; it does not persist full message bodies by default.

Sending is different from drafting: `/api/email/send` always calls `executeProviderWrite` with `send_email`, requiring owner confirmation, human confirmation, evidence, Constitution checks, and a fresh CerbaSeal authorization according to current policy. A Gmail permission or UI control cannot bypass that boundary.

Incremental sync uses Gmail `historyId`. The first sync establishes a baseline; later syncs request only changes since the stored cursor, deduplicate message IDs, and advance the cursor only after the normalized event transaction succeeds. Expired history cursors should be handled by a deliberate full resync rather than silently replaying the mailbox.