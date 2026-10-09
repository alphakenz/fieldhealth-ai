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
| 3 | `03-application-flow.md` | Screens S-01…S-14, journeys, failure paths |
| 4 | `04-design-brief.md` | Tokens, components, accessibility |
| 5 | `05-database-schema.md` | SQLite schema, enums, export columns |
| 6 | `06-implementation-plan.md` | Phases, TASK-001…038, verification, release checklist |
| 7 | `07-vibe-coding-master-prompt.md` | Copy-ready prompt for an AI coding agent |
| App. | `submission.md` | Hackathon submission write-up |
| App. | `verification.md` | Development verification record and remaining checks |

Suggested use: judges can start with `submission.md` and `verification.md`, then use files 1–6 for implementation detail. File 7 is the original master prompt used to guide development.

## Key assumptions (please review)

1. Python standard-library HTTP service with `sqlite3` (backend); vanilla JavaScript, no build step (frontend).
2. The PWA stores drafts and visits locally first; online sync is available when a connection returns.
3. Confirmation requires complete visit fields and is reviewed by the worker before reporting.
4. Household code pattern `HH-####` (synthetic, configurable).
5. The hackathon demo supports public access through `PUBLIC_DEMO=true`; private deployments can use the generated `APP_TOKEN`.
6. Single-instance deployment; SQLite on local disk; first app load requires network.
7. Backboard request format and model eligibility are **unverified** here and must be checked against current provider documentation.

## Evidence still to collect

Before final submission, record the exact provider and model used, model license, live inference evidence, observed extraction results, verified Render URL, and the outdoor demonstration. The [verification record](verification.md) separates checks already passed from checks that still require a real browser, device, provider, or deployment.

## Open questions

- Which exact open-weight model and provider will be documented in the final submission?
- What real-device and outdoor evidence will be included?
- May supervisors see raw notes in the register? (default: yes, data is synthetic)
