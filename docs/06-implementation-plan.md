# FieldHealth AI — Implementation Plan

| | |
|---|---|
| Project | FieldHealth AI |
| Document | 06 — Implementation Plan |
| Version | 0.1 |
| Status | Draft |
| Last updated | 2026-10-09 |
| Related | All other documents; requirement IDs refer to `01-product-requirements.md` |

---

## 1. Strategy

Build a **thin end-to-end path first** (capture → local save → sync → confirm → register), then add AI (with the fake provider), then real adapters, then reporting, then evidence/evaluation and hardening. Each phase ends in a runnable, verifiable state. The real model adapters are built **after** the full flow works with the fake provider so model availability never gates progress — mirroring the product principle.

Milestones: **M1** offline capture + sync (Phases 0–3) · **M2** AI draft + review + confirm (Phase 4–5a) · **M3** reporting (5b) · **M4** evidence, evaluation, deployment (6–7).

## 2. Prerequisites and setup

- Python 3.11+, `pip`/`venv`; Node.js 20+ only for Playwright tests (no frontend build).
- SQLite (bundled with Python).
- For live AI (human-supplied): Ollama installed with a Gemma model pulled by the operator, **and/or** a Backboard account with API key and explicitly chosen model. **Not created or assumed by this plan.**
- Git repository, `.gitignore` for `.env`, `data/`, `*.db`.
- Human decisions needed before Phase 4 live tests: provider(s) to claim; exact model identifiers (author records them from the real runs).

## 3. Repository structure

```
fieldhealth-ai/
├─ README.md
├─ .env.example
├─ docs/                        # the 7 documents + evidence-and-writeup-template.md
├─ backend/
│  ├─ app/ (main.py, config.py, db.py, auth.py, rules.py, visits.py, conflicts.py,
│  │        followups.py, dashboard.py, exports.py, evidence.py, audit.py, cli.py,
│  │        ai/{provider.py, ollama.py, backboard.py, fake.py, prompt.py, validate.py, service.py})
│  ├─ migrations/0001_initial.sql
│  ├─ tests/
│  └─ requirements.txt
├─ public/
│  ├─ index.html  manifest.webmanifest  sw.js  icon.svg
│  ├─ styles.css
│  └─ app.js
├─ shared/completeness_fixtures.json
├─ eval/ (gold_synthetic.jsonl, run_eval.py, results/ (git-ignored until author commits))
└─ e2e/ (playwright tests)
```

## 4. Phases and tasks

### Phase 0 — Foundations
| Task | Description | Depends | Output |
|---|---|---|---|
| TASK-001 | Scaffold repo, `requirements.txt`, FastAPI app serving `frontend/` statically, `/api/health` | — | App starts; health returns 200 |
| TASK-002 | Typed config from env + `.env.example`; startup validation (e.g., provider=backboard requires key+model) | 001 | Config tests |
| TASK-003 | SQLite connection helper + migration runner + `0001_initial.sql` (all tables in `05-database-schema.md`) | 001 | `cli migrate` creates schema; test asserts tables/constraints |
| TASK-004 | Test harness (pytest fixtures, temp DB, API client) and CI-style `make test` script | 003 | Green empty suite |

**Definition of done (DoD):** server runs; migration idempotent; tests run.

### Phase 1 — Auth, visits API, rules
| Task | Description | FR/NFR | Depends |
|---|---|---|---|
| TASK-005 | `cli create-user`; login/logout/me; scrypt; sessions; CSRF; role dependency; login rate limit; audit login | FR-001, NFR-004, FR-021 | 003 |
| TASK-006 | `PUT /visits/{id}` upsert with `base_revision`, `client_ops` idempotency, 409 conflict + `sync_conflicts`, locked visits, people/followups set replace | FR-006, FR-007 | 005 |
| TASK-007 | `rules.py` completeness engine + `shared/completeness_fixtures.json` (≥ 25 cases) | FR-005, NFR-006 | 003 |
| TASK-008 | `GET /visits` (filters, cursor, role scoping), `GET /visits/{id}` | FR-014 | 006 |
| TASK-009 | `confirm` endpoint (completeness gate, provenance, lock, audit) | FR-013 | 006, 007 |
| TASK-010 | Follow-up endpoints (`GET`, `PATCH` with revision) | FR-015 | 006 |

**DoD:** API tests cover: new/update/conflict/idempotent retry/locked; cross-worker access denied; confirm blocked when incomplete.

### Phase 2 — Frontend shell and offline capture
| Task | Description | FR/NFR |
|---|---|---|
| TASK-011 | HTML shell, CSS tokens (`04-design-brief.md`), hash router, status chip, scope notice, login view | FR-001, FR-020 |
| TASK-012 | `db.js` IndexedDB stores and transactional `saveVisit()` (visit + outbox op in one txn) | FR-003, NFR-002 |
| TASK-013 | Service worker: versioned shell cache, API bypass, update bar; manifest | FR-004 |
| TASK-014 | Visit editor (S-03) with autosave, people/follow-up rows, `rules.js` checklist | FR-002, FR-005 |
| TASK-015 | Home (S-02) and local visit list; unsupported-browser warning | FR-014 |

**DoD:** In a browser with network off after first load: create, save, reload, edit — data persists (manual check, then automated in TASK-031). `rules.js` passes the shared fixtures (node test).

### Phase 3 — Sync and conflicts
| Task | Description | FR |
|---|---|---|
| TASK-016 | `sync.js`: outbox drain, coalescing, backoff, `online` trigger, pull with cursor | FR-006 |
| TASK-017 | Sync centre (S-04) | FR-006 |
| TASK-018 | Conflict capture + resolver (S-05); resolution `PUT` with `resolves_conflict_id` | FR-007, FR-008 |

**DoD:** Two browser contexts editing the same visit offline produce a conflict; resolution yields a consistent revision; no data lost (test with both contexts).

### Phase 4 — AI draft
| Task | Description | FR |
|---|---|---|
| TASK-019 | `ModelProvider` interface, error types, `FakeProvider` (fixtures incl. invalid/ungrounded/timeouts) | FR-010 |
| TASK-020 | `prompt.py` (prompt + JSON schema s1), `validate.py` (schema, semantic, grounding) with exhaustive unit tests | FR-011 |
| TASK-021 | `POST ai-draft`, `GET latest`, `model_runs` logging, stale detection | FR-009, FR-019 |
| TASK-022 | AI review UI (S-06) incl. Apply/Edit/Ignore, evidence highlighting, test-provider badge | FR-012 |
| TASK-023 | `OllamaProvider` (verify request shape against installed Ollama docs; mock-transport tests) | FR-010 |
| TASK-024 | `BackboardProvider` (**first** read current provider documentation; record verified endpoint/model details in the evidence template; mock-transport tests; refuse to run without explicit model) | FR-010 |

**DoD:** Full draft → apply → confirm flow works with the fake provider; adapters pass mock tests; malformed outputs never touch visit fields (assert in tests). **No claim of live inference at this stage.**

### Phase 5 — Confirm UX, register, reporting
| Task | Description | FR |
|---|---|---|
| TASK-025 | Confirm dialog (S-07), detail view (S-09) with provenance | FR-013 |
| TASK-026 | Register (S-08) with filters, local+server merge | FR-014 |
| TASK-027 | Follow-ups view (S-10) | FR-015 |
| TASK-028 | Dashboard API + view (S-11) with text alternatives | FR-016 |
| TASK-029 | CSV and JSON exports (S-12) with injection neutraliser, audit | FR-017, FR-018 |

**DoD:** Drafts excluded from dashboard and exports (test); CSV neutraliser tests; export column set matches `05-database-schema.md` §12.

### Phase 6 — Evidence and evaluation
| Task | Description | FR |
|---|---|---|
| TASK-030 | Model status screen (S-13), reachability check endpoint, evidence log + export | FR-019, NFR-011 |
| TASK-031 | `eval/gold_synthetic.jsonl` (≥ 20 synthetic notes with expected fields written by a human) + `eval/run_eval.py` computing per-field exact-match and null-handling rates, writing results with provider/model/date | PRD §10 accuracy metric (recommended; PM-005 extends it) |
| TASK-032 | **Human step — live demo capture:** run real inference with the chosen provider(s); verify `model_runs` shows `success`; export evidence JSON; record exact model identifiers and **license text/reference taken from the official model card**; run TASK-031 eval; save outputs | — |

**DoD:** Evidence file produced from **actual** runs; if none were run, the write-up placeholders remain marked unfinished.

### Phase 7 — Hardening, E2E, deployment
| Task | Description | NFR |
|---|---|---|
| TASK-033 | Accessibility and mobile pass (keyboard, 360 px, contrast, screen-reader smoke) | NFR-003 |
| TASK-034 | Playwright E2E: offline create/reload; reconnect sync; conflict; fake-provider draft → confirm | NFR-001, NFR-010 |
| TASK-035 | Security checks: headers/CSP, CSRF, role matrix tests, no secrets in logs, no `innerHTML` with dynamic text (lint grep) | NFR-004/005 |
| TASK-036 | Performance check with 1,000 synthetic visits; record numbers | NFR-007 |
| TASK-037 | **Human review checkpoint → deployment** (HTTPS host, `COOKIE_SECURE=true`, backups); record verified deployment details (host type, date, commit, HTTPS, provider reachability) | — |
| TASK-038 | Update docs/README with real findings; complete evidence-and-writeup template | — |

## 5. Dependencies (summary)

`001→002,003→004` · `003→005,007` · `005→006→008,009,010` · `007→009` · `006→016→018` · `012→014→016` · `019→020→021→022` · `023,024` need `019,020` · `021→030` · `032` needs `023/024` + environment · `037` needs all tests green.

## 6. Verification methods per phase

| Phase | Commands / methods |
|---|---|
| 0–1 | `pytest backend/tests -q` |
| 2 | `node --test frontend/tests/rules.test.js` (shared fixtures); manual airplane-mode check |
| 3–4 | `pytest`; two-context manual test, then Playwright |
| 5 | `pytest`; open exports and compare to fixture |
| 6 | `python eval/run_eval.py --provider <p>` (author-run) and evidence export |
| 7 | `npx playwright test`; Lighthouse/axe pass; manual screen-reader smoke test |

## 7. Security and quality checkpoints

After Phase 1 (auth/role matrix) · after Phase 4 (output handling, secret handling) · after Phase 5 (export safety) · before TASK-037 (full checklist in NFR-004/005).

## 8. Data migrations and integration setup

- All schema changes via numbered migrations; no manual DDL.
- Take a backup (`sqlite3 db ".backup file"`) before any migration in a deployed environment.
- Provider setup instructions in `README.md`: set env vars; run reachability check; record outcome.

## 9. Deployment and rollback

- Single host: reverse proxy (TLS) → Uvicorn; systemd/docker unit left to the operator; data directory on persistent disk.
- Rollback: redeploy previous commit; restore last backup if a migration ran; the IndexedDB client data is unaffected, and `client_ops` ensures retried ops are safe.
- Cache busting: bump `BUILD_ID` so service workers refresh.

## 10. Risks, blockers, decisions required

| Item | Owner | Needed by |
|---|---|---|
| Exact provider(s) and model identifiers to claim | Author | TASK-032 |
| Backboard API/model-eligibility verification | Implementer + author | TASK-024 |
| Hardware able to run the chosen local Gemma model | Author | TASK-032 |
| Deployment target | Author | TASK-037 |
| Whether to include PM-002 (offline confirm) | Author | before Phase 5 |

## 11. MVP release checklist

- [ ] All M requirements implemented; acceptance criteria demonstrated
- [ ] Offline scenario passes (manual + E2E)
- [ ] Conflict scenario: no silent overwrite
- [ ] Invalid model output never modifies visit fields (tests)
- [ ] Drafts excluded from reports (tests)
- [ ] ≥ 1 real `success` model run recorded **for each provider the author claims**
- [ ] Evidence export attached; license and model identifier copied from official sources
- [ ] Extraction accuracy numbers (if any) come from `eval/results` produced by an actual run
- [ ] Deployment verification record completed by a human
- [ ] Synthetic-data banner visible; no real personal data
- [ ] No secrets committed; `.env.example` placeholders only
- [ ] README and write-up placeholders either completed from evidence or still clearly marked unfinished
