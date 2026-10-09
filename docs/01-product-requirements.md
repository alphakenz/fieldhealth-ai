# FieldHealth AI — Product Requirements Document (PRD)

| | |
|---|---|
| Project | FieldHealth AI |
| Document | 01 — Product Requirements Document |
| Version | 0.1 |
| Status | Draft |
| Last updated | 2026-10-09 |
| Related | `02-technical-requirements.md`, `03-application-flow.md`, `04-design-brief.md`, `05-database-schema.md`, `06-implementation-plan.md`, `07-vibe-coding-master-prompt.md` |

---

## 1. Product summary

FieldHealth AI is a mobile-friendly community outreach workspace for **administrative field reporting**. A field worker records a (fictional) household visit outdoors, saves it on the device even with no connectivity, and, when the model service is reachable, receives a **structured AI draft** that organises their free-text observations into reporting fields. The worker reviews the draft, corrects it, and **confirms** the visit. Supervisors see only confirmed records in the register, dashboard, and CSV / JSON exports.

**The model organises observations; the worker checks the result.** The prototype handles administrative field reporting. It does **not** diagnose, triage, or recommend treatment.

### 1.1 Confirmed facts from the brief

| # | Fact |
|---|---|
| C-1 | Mobile-friendly workspace; household visits are **fictional** in this prototype. |
| C-2 | Visits can be recorded and saved without connectivity. |
| C-3 | AI draft is produced only when the model service is reachable. |
| C-4 | Workflow includes offline drafts, required-field checks, a visit register, administrative follow-ups, a dashboard, CSV and JSON exports. |
| C-5 | Frontend: lightweight JavaScript. Backend: Python with SQLite. |
| C-6 | IndexedDB holds records on the device; a service worker caches the interface. |
| C-7 | UUIDs, revision checks, and explicit conflict resolution prevent silent overwrites of field notes. |
| C-8 | Model adapters implemented: **Backboard** (explicitly configured model) and **local Gemma through Ollama**. |
| C-9 | The model proposes: household code, people present, water source, follow-up fields. Unknown values remain `null`. |
| C-10 | Strict server-side validation rejects malformed model output; deterministic completeness checks identify missing information. |
| C-11 | Model output is kept separate from confirmed fields; reports use reviewed (confirmed) data only. |
| C-12 | Offline capture is deliberately independent of model availability. |

### 1.2 Evidence boundary (important)

Adapter code existing is **not** evidence that live inference happened. This pack therefore treats the following as **author-supplied after the live demo** and never pre-fills them: the provider, exact model, model license, observed extraction accuracy, implementation lessons, verified deployment details, and the open-weight benefit actually demonstrated. See `README.md` §"Evidence placeholders" and `docs/evidence-and-writeup-template.md`.

---

## 2. Problem statement

Outreach workers collect observations in the field under poor connectivity, in sunlight, on a phone, often as unstructured notes. Supervisors need consistent, complete, reviewable records. Typical pain points:

1. Connectivity loss makes web forms fail or lose data.
2. Free-text notes are inconsistent; key fields (household code, who was present, water source, follow-ups) are missed.
3. Hand-transcribing notes into a report is slow.
4. AI assistance is attractive but risky if its output flows into reports unreviewed, or if its outage blocks field work.
5. Two devices or a retried upload can silently overwrite a worker's notes.

## 3. Goals and non-goals

### Goals
- G1. A worker can **never be blocked from saving a visit** by network or model failure.
- G2. Model output is a **proposal only**; reports contain reviewed values.
- G3. Missing information is found by **deterministic** checks, not model judgement.
- G4. No **silent overwrite** of notes across devices or retries.
- G5. Supervisors get a register, dashboard, and exports of confirmed data.
- G6. The system is **honest about inference evidence**: it records which provider/model produced each draft.

### Non-goals
- Diagnosis, symptom assessment, triage, treatment or medication advice, clinical decision support.
- Real patient or household data. Real personal identifiers (names, phone numbers, addresses, GPS).
- On-device (in-phone) model inference. Fine-tuning. Formal model benchmarking beyond the small synthetic check in TASK-031.
- Multi-tenant administration, user self-registration, payments, push notifications.

## 4. Users

| Persona | Description | Needs |
|---|---|---|
| **Field Worker** ("Amina", fictional) | Community outreach worker on a mid-range Android phone, often offline, outdoors in bright light. | Fast capture, trust that nothing is lost, clear "what is still missing", easy review of AI draft. |
| **Supervisor** ("Tunde", fictional) | Reviews field reporting from a phone or laptop. | Confirmed records only, filters, follow-up tracking, dashboard, exports, visibility of how AI drafts were produced. |

Roles (identifiers used across all documents): `field_worker`, `supervisor`.

## 5. Scope

### 5.1 MVP (must-have)
Authentication and roles; offline visit capture and local persistence; offline app shell; completeness checks; sync with UUIDs, revisions, idempotent operations; conflict detection and explicit resolution; AI draft via configured provider; strict output validation; review and confirm flow; visit register; administrative follow-ups; dashboard; CSV and JSON export; model status and inference evidence log; administrative-only safety boundary.

### 5.2 Post-MVP (should-have / later)
- PM-001 Supervisor "reopen" of a confirmed visit with reason.
- PM-002 Queue **confirmation** while offline (MVP: confirmation is an online action).
- PM-003 Clinical-content keyword flag on notes (advisory banner).
- PM-004 Install prompt polish, background sync via Background Sync API where supported.
- PM-005 Larger synthetic evaluation set and repeated-run comparison across models.

### 5.3 Explicitly out of scope
Diagnosis/treatment content; real data; photos/audio capture; GPS; push notifications; integration with external health information systems; on-device inference; fine-tuning.

## 6. Functional requirements

Priority: **M** = MVP must, **S** = MVP should.

| ID | Requirement | Pri |
|---|---|---|
| FR-001 | Users sign in with username and password; two roles (`field_worker`, `supervisor`). Field workers see only their own visits; supervisors see all. Users are created by an operator CLI (no self-registration). | M |
| FR-002 | A worker can create a visit draft **without connectivity**, with a client-generated UUID, visit date, free-text observation notes, and optional structured fields (household code, people present, water source, follow-ups). | M |
| FR-003 | Every create/edit is written to IndexedDB **before** the UI reports "Saved on device"; drafts survive reload, app close, and browser restart. | M |
| FR-004 | After first successful load, the app shell opens offline via the service worker; the UI shows connectivity and sync state. | M |
| FR-005 | The editor shows a live **completeness checklist** from deterministic rules (see §7). Drafts can always be saved incomplete; **confirmation** requires completeness. | M |
| FR-006 | Local changes are queued in an outbox as operations with `client_op_id` (UUID). The server applies each operation at most once (idempotent). | M |
| FR-007 | Each visit has an integer `revision`. Writes carry `base_revision`; if it does not equal the server's current revision the server returns **409** with the server copy and does **not** apply the write. | M |
| FR-008 | On conflict the worker sees both versions and **explicitly** chooses per field: keep mine, keep server, or edit combined; notes may be concatenated. Nothing is discarded until the worker resolves. Resolution is recorded. | M |
| FR-009 | When online and the visit is synced, the worker can request an **AI draft** from the notes. Failure of the model service shows a clear message and never blocks other work. | M |
| FR-010 | Model access goes through a provider interface with two adapters: `backboard` (explicit configured model) and `ollama` (local Gemma). Provider and model are chosen by environment configuration, never hard-coded. A fake provider exists for tests. | M |
| FR-011 | Server validates model output against a strict schema (no extra keys, enum checks, patterns, length limits, empty arrays rejected). Unknown values stay `null`. Invalid output is stored as a failed draft with errors and **never** reaches visit fields. Each proposed value's supporting snippet is checked against the notes; unsupported values are flagged `ungrounded` (not silently dropped). | M |
| FR-012 | Review screen shows each AI-proposed field beside the worker's current value with actions **Apply**, **Edit**, **Ignore**. Applying copies the value into the visit's working fields; AI proposals are never written there automatically. | M |
| FR-013 | **Confirm** (online) re-runs the server completeness checks, records provenance per field (`worker_entered`, `ai_unchanged`, `ai_edited`, `ai_ignored`), sets `status=confirmed`, locks the visit, and stamps confirmer and time. | M |
| FR-014 | Visit register lists visits with filters (status, date range, worker for supervisors, household code search) and shows sync state and "needs attention" flags. | M |
| FR-015 | Administrative follow-ups (kinds in schema doc) can be added in the visit, proposed by AI, accepted by the worker, listed in a follow-up view, and marked done/cancelled (online, with revision check). | M |
| FR-016 | Dashboard (supervisor; limited own-view for workers) over **confirmed** visits: counts, visits per day, water-source distribution, AI-assisted vs manually completed confirmations, open/overdue follow-ups, AI-proposal acceptance rates (from provenance). | M |
| FR-017 | CSV export of confirmed visits (supervisor), with formula-injection protection and a documented column set. | M |
| FR-018 | JSON export of confirmed visits including follow-ups, provenance, `schema_version`, and export metadata (supervisor). | M |
| FR-019 | Every model call is logged (provider, model identifier as configured, outcome, latency, prompt/schema version, hashes; never API keys). Model Status screen shows configuration, reachability check, and the last successful inference record; the evidence log is exportable by supervisors. | M |
| FR-020 | Safety boundary: persistent notice that the tool is administrative and uses fictional data; the data model has **no** diagnosis/treatment fields; the model prompt forbids clinical interpretation; unknown values are null. | M |
| FR-021 | Audit log for sign-in, confirm, conflict resolution, export, and follow-up status changes. | S |

## 7. Business rules

**BR-1 Required for confirmation (deterministic):**
- `visit_date` present, valid, not in the future.
- `observation_notes` non-empty.
- `household_code` present and matching the configured pattern (assumption A-5: `^HH-[0-9]{4}$`, configurable).
- `people_present`: at least one entry; each `count ≥ 1`.
- `water_source` non-null. The worker may choose `not_observed` explicitly; `null` blocks confirmation.
- Each follow-up has `kind` and `description` (≤ 200 chars); `due_date`, if set, is not earlier than `visit_date`.

**BR-2** Model output never populates confirmed fields without a worker action.
**BR-3** Only `confirmed` visits appear in dashboard and exports.
**BR-4** Confirmed visits are read-only in MVP (follow-up status excepted).
**BR-5** Field workers cannot read other workers' visits. Supervisors cannot edit visit content.
**BR-6** People present are recorded by **role, age group, and count — never names** (privacy by design).
**BR-7** All data in the prototype is synthetic; sample data must be labelled as such.

## 8. Non-functional requirements

| ID | Requirement (testable) |
|---|---|
| NFR-001 | **Offline capture:** with the network disabled after first load, a worker can create, edit, and save a visit and reopen it after a full reload. |
| NFR-002 | **No silent loss:** a write is acknowledged to the user only after the IndexedDB transaction completes; if storage fails, an error is shown and the unsaved state remains visible. |
| NFR-003 | **Mobile + accessibility:** usable at 360 px width; touch targets ≥ 44 × 44 px; WCAG 2.2 AA targets for contrast and focus; every control has a label; status never conveyed by colour alone. |
| NFR-004 | **Security:** passwords hashed with a memory-hard KDF; session cookie `HttpOnly`, `SameSite=Lax`, `Secure` when HTTPS; CSRF protection on state-changing requests; role checks on every endpoint; HTTPS in any non-localhost deployment. |
| NFR-005 | **Privacy:** synthetic data only; no names, phone numbers, addresses, or GPS fields; secrets only in environment variables; API keys never logged or sent to the browser. |
| NFR-006 | **Determinism:** completeness rules produce identical results client- and server-side for the shared fixture set; server is authoritative. |
| NFR-007 | **Performance (targets, to be measured):** register with 1,000 synthetic visits renders in < 2 s on a mid-range phone; AI request timeout default 60 s with a visible failure state. |
| NFR-008 | **Observability:** structured logs with request IDs; model-run records contain no secrets. |
| NFR-009 | **Portability:** backend runs with a single documented command; frontend needs no build step. |
| NFR-010 | **Testability:** unit tests for rules, validators, revisions, adapters (with fake provider); an end-to-end offline scenario test. |
| NFR-011 | **Evidence honesty:** UI and exports describe a draft as produced by a provider/model only if a successful `model_runs` record exists for it. |

## 9. User stories and acceptance criteria

**US-1 (FR-002, FR-003, NFR-001)** As a field worker, I want to save a visit with no signal, so that I never lose notes.
- *Given* the device is offline after first load, *when* I enter notes and tap Save, *then* the UI shows "Saved on device", and after a full page reload the visit is still present with identical content.

**US-2 (FR-005)** As a field worker, I want to see what is missing, so that I can finish the record before leaving the household.
- *Given* a draft without a water source, *when* I view the checklist, *then* "Water source" is shown as missing with text (not colour alone), and Confirm is disabled.

**US-3 (FR-006, FR-007, FR-008)** As a field worker, I want conflicts shown to me, so that my notes are never silently replaced.
- *Given* the same visit was edited on two devices, *when* the second device syncs, *then* the server rejects the write with 409, the app shows both versions, and the visit remains in "Conflict" until I resolve it; after resolution the revision increments and the resolution is recorded.

**US-4 (FR-009, FR-011)** As a field worker, I want a structured draft from my notes, so that I type less.
- *Given* online and a synced visit, *when* I tap "Create AI draft", *then* within the timeout I see proposals for household code, people present, water source, follow-ups; unknown values appear as "Not found in notes" (null).
- *Given* the model returns malformed output, *then* the draft is stored as failed, no visit field changes, and I see a retry option.

**US-5 (FR-012, FR-013)** As a field worker, I want to review before confirming, so that reports reflect my judgement.
- *Given* an AI draft is ready, *when* I tap Apply on one field, *then* only that field's working value changes; *when* I confirm, *then* provenance is recorded and the visit locks.

**US-6 (FR-014)** As a supervisor, I want to filter the register, so that I can find visits needing attention.

**US-7 (FR-016, FR-017, FR-018)** As a supervisor, I want dashboard and exports of confirmed visits only, so that reports are trustworthy.
- *Given* draft and confirmed visits exist, *then* neither export nor dashboard counts include drafts; CSV cells beginning with `=`, `+`, `-`, `@` are neutralised.

**US-8 (FR-019, NFR-011)** As a supervisor, I want to see which provider and model produced drafts, so that I can trust or challenge them.

**US-9 (FR-015)** As a supervisor, I want to see open and overdue administrative follow-ups.

## 10. Success metrics (prototype)

| Metric | How measured | Notes |
|---|---|---|
| Offline save success | E2E test + manual airplane-mode check | Target 100% of attempted saves persisted |
| Draft schema-valid rate | `model_runs.outcome = success` ÷ attempts | **Reported only from real runs** |
| Field-level extraction accuracy | TASK-031 script on synthetic gold set | **Author fills after running; not pre-claimed** |
| Worker edit rate of AI proposals | provenance (`ai_edited`+`ai_ignored`) ÷ proposed fields | From confirmed visits |
| Silent overwrites | Conflict tests | Target 0 |

## 11. Dependencies, risks, assumptions

**Assumptions** (provisional; review):
- A-1 Backend framework is FastAPI + Pydantic; SQLite via the standard library `sqlite3`. (TRD §2)
- A-2 Frontend uses ES modules, no bundler.
- A-3 Confirmation requires connectivity (PM-002 defers offline confirmation).
- A-4 Follow-up **status changes after confirmation** are online-only; follow-ups created before confirmation travel with the visit.
- A-5 Household code pattern `HH-####` is synthetic and configurable.
- A-6 Single-instance deployment; SQLite file on local disk; no horizontal scaling.
- A-7 Authentication is local username/password with server-side sessions.

**Risks**
| Risk | Mitigation |
|---|---|
| Model hallucinates values | Strict schema, nulls, grounding snippet check, worker review, provenance |
| Clinical content creeps into notes/outputs | Prompt boundary, no clinical fields, notice, PM-003 |
| Client/server rule drift | Shared rule fixtures run on both sides; server authoritative |
| Service worker caches stale code | Versioned caches, update prompt |
| Backboard API details unverified | Adapter spec marked *to be verified against provider docs* before use |
| Evidence overclaiming in write-up | Evidence log + placeholders + NFR-011 |

**Open questions** (do not block drafting; need owner decisions)
- Q-1 Which exact Backboard-hosted model and which local Gemma tag will be used? (Author fills after demo.)
- Q-2 Where will the demo be deployed (local machine, VPS, other)? (Author fills after deployment.)
- Q-3 Is a supervisor allowed to see raw observation notes in the register, or only structured fields? (Default: yes, since the notes are synthetic.)

## 12. MVP release criteria

1. All **M** requirements implemented and their acceptance criteria demonstrated.
2. Offline scenario test passes (NFR-001, US-1, US-3).
3. At least one **real** model run recorded in `model_runs` for the provider(s) the author will claim.
4. Evidence placeholders in the write-up completed from real records, or left explicitly marked unfinished.
5. No real personal data present; synthetic-data banner visible.
