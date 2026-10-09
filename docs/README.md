# FieldHealth AI — Documentation Pack

| | |
|---|---|
| Project | FieldHealth AI |
| Document | README — pack guide |
| Version | 0.1 |
| Status | Current implementation reference |
| Last updated | 2026-10-09 |

A mobile-friendly, offline-first workspace for **administrative** field reporting on fictional household visits, with a worker-reviewed AI draft. Not for diagnosis or treatment. The documentation describes the current implementation and its verified boundaries.

## Document order

| # | File | Purpose |
|---|---|---|
| 1 | `01-product-requirements.md` | Scope, FR/NFR IDs, business rules, acceptance criteria |
| 2 | `02-technical-requirements.md` | Stack, offline/sync protocol, API, AI adapters, security |
| 3 | `03-application-flow.md` | Screens, journeys, and failure paths |
| 4 | `04-design-brief.md` | Tokens, components, and accessibility |
| 5 | `05-database-schema.md` | SQLite schema, enums, and export columns |
| 6 | `06-implementation-plan.md` | Phases, verification, and release checklist |
| 7 | `07-vibe-coding-master-prompt.md` | Original prompt used to guide development |
| App. | `submission.md` | Hackathon submission write-up |
| App. | `verification.md` | Development verification record and remaining checks |

Suggested use: judges can start with `submission.md` and `verification.md`, then use files 1–6 for implementation detail.

## Current implementation files

The running MVP uses `server.py` and the following files in `public/`: `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, and `icon.svg`.

## Key boundaries

- The application handles administrative field reporting, not diagnosis or treatment.
- Records are synthetic for the public demo; do not enter real household or patient data.
- The PWA stores drafts and visits locally first and syncs when a connection returns.
- The hackathon demo supports public access through `PUBLIC_DEMO=true`; private deployments can use `APP_TOKEN`.
- Render uses a single instance with SQLite on a persistent disk.
- AI extraction requires a configured provider when online; offline capture remains available without inference.
