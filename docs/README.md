# FieldHealth AI — Documentation Pack

| | |
|---|---|
| Project | FieldHealth AI |
| Document | README — pack guide |
| Version | 0.1 |
| Status | Draft (not approved) |
| Last updated | 2026-10-09 |

A mobile-friendly, offline-first workspace for **administrative** field reporting on fictional household visits, with a worker-reviewed AI draft. Not for diagnosis or treatment. Documentation only — **no application code has been written, run, tested, or deployed.**

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
| App. | `docs/evidence-and-writeup-template.md` | Evidence log + write-up with placeholders |

Suggested use: put files 1–6 and the appendix in `docs/` of a new repository, paste the prompt from file 7 into your coding agent, and approve one phase at a time.

## Key assumptions (please review)

1. FastAPI + Pydantic + stdlib `sqlite3` (backend); vanilla ES modules, no build step (frontend).
2. Confirmation is an **online** action; offline confirmation is deferred (PM-002).
3. Follow-up status changes after confirmation are online-only.
4. Household code pattern `HH-####` (synthetic, configurable).
5. Local username/password auth with server-side sessions; users created by CLI.
6. Single-instance deployment; SQLite on local disk; first app load requires network.
7. Backboard request format and model eligibility are **unverified** here and must be checked against current provider documentation.

## Evidence placeholders (not pre-filled on purpose)

These come from your real run and are left blank in the appendix: provider(s) used, exact model identifier(s), model license, evidence of live inference, observed extraction accuracy, implementation lessons, verified deployment details, and the open-weight benefit you actually demonstrated. The app is designed to help: every model call is logged in `model_runs`, the Model Status screen reports only recorded runs, and the fake provider is labelled as not inference.

## Open questions

- Which provider(s) and exact models will you claim (Ollama Gemma tag, Backboard model)?
- Where will the demo run (local machine, VPS)?
- May supervisors see raw notes in the register? (default: yes, data is synthetic)
