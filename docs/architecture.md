# Implemented architecture

The browser captures a pseudonymous household code, community, attendance, water source, visit activity, field observation, and administrative follow-up. IndexedDB stores the record and its UUID before synchronization. A service worker caches the app shell and never caches protected API responses.

The Python service serves static assets and exposes four endpoints:

| Endpoint | Access | Purpose |
|---|---|---|
| `GET /api/health` | Public | Service status and configured model |
| `GET /api/visits` | Shared team key | Retrieve workspace records |
| `POST /api/visits` | Shared team key | Validate and save one revision |
| `POST /api/extract` | Shared team key | Extract a reviewed-later draft from synthetic notes |

Every online request stays on the same origin. No provider credential is transmitted to the browser. The team key is a prototype access boundary, not an implementation of multi-user authorization.

## Storage and synchronization

The server's SQLite database stores each visit as JSON alongside an integer revision. It uses WAL and a transaction to serialize changes. New records start at revision zero. A successful write increases the server revision. If a device retries the same payload after losing the acknowledgment, the service returns the saved revision. A stale revision with different content returns HTTP 409 and the server record. The interface presents both versions and offers an explicit choice. No automatic last-write-wins overwrite occurs.

Local pending records upload before the current server records download. Unsynced local content is preserved. Automatic retry occurs when an open tab receives an online event and has a team key. Manual Sync is always available. Closed-app background sync is outside this implementation.

## AI and confirmation

Either Backboard or Ollama produces five administrative extraction fields under a fixed prompt and schema. The server checks keys, types, counts, enums, household code shape, and follow-up consistency. Unknown information must remain null. Required-field checks are deterministic. The browser displays the model, provider, raw structured draft, and review state. Applying the draft only fills editable fields; confirming a visit is a separate action.

The source observation remains intact. AI-generated JSON is stored under `ai`, separate from the confirmed visit fields. Supervisor counts use the confirmed fields, not the raw draft. A change to a confirmed record requires saving again; AI suggestions never auto-confirm a visit.

## MVP limits

No tenant or individual role system, distributed database, geographic routing, speech-to-text, clinical assessment, or DHIS2 integration is implemented. Render deployment uses one paid service with a persistent disk. A future production implementation should replace the standard-library HTTP server and shared key with a maintained application framework, individual authorization, bounded inference concurrency, database migrations, and appropriate data governance.
