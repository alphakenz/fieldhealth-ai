# FieldHealth AI

**Less time typing. More time caring.**

An offline household outreach workspace for synthetic-data demonstrations. Capture visits on a phone, review AI extraction, confirm records, synchronize with a team server, and export supervisor reports.

## Run locally

Python 3.11 or newer is the only application runtime dependency.

```bash
cd fieldhealth-ai
export APP_TOKEN='choose-a-long-random-team-key'
python server.py
```

Open http://localhost:8000. In **More → Demo access**, enter the demo access code configured for the server. The app starts with two fictional examples so judges can explore the dashboard immediately. The browser must open the app online once before offline reload works. Offline capture works without a demo access code; server sync and inference require one.

## Enable genuine AI extraction

No fake AI or heuristic fallback is supplied. If inference is unconfigured, the interface reports that and keeps manual capture available.

### Local open-weight Gemma through Ollama

Install Ollama, review Gemma's model terms, and download the model:

```bash
ollama pull gemma3:1b
export AI_PROVIDER=ollama
export OLLAMA_MODEL=gemma3:1b
export APP_TOKEN='choose-a-long-random-team-key'
python server.py
```

Ollama must be reachable from the **server**, not merely from the phone. This enables local inference when the phone can reach that computer; it does not provide on-phone offline inference. Model download requires internet access. Record the exact model tag and digest from `ollama list` for submission evidence.

### Backboard using your credit

```bash
export AI_PROVIDER=backboard
export BACKBOARD_API_KEY='your-key'
export BACKBOARD_PROVIDER='provider-from-your-model-catalog'
export BACKBOARD_MODEL='exact-verified-open-weight-model-id'
export APP_TOKEN='choose-a-long-random-team-key'
python server.py
```

Select an available open-weight model in your Backboard account and verify its license and eligibility. The app deliberately requires an explicit model and provider rather than using Backboard's default model. It sends JSON requests to `/api/threads/messages` with memory and web search off, and validates returned fields independently. Backboard may retain request histories; memory off is not a deletion or no-retention guarantee.

Example synthetic note:

> Visited HH-014. Five people were present. Main water source was not recorded. The household requested a follow-up health education visit.

Expected administrative facts: HH-014, five present, unknown water source, follow-up requested, health education. Review every output. Fill in the water source manually only after obtaining that information. Confirmation requires complete fields.

## Implemented workflow

- IndexedDB stores drafts, confirmed visits, AI assessments, and pending sync records.
- Service worker caches the interface for offline reload after first use.
- The mobile-first PWA separates Today, New visit, Records, and More, with a prominent AI Field Assistant.
- Household count and people-present count are separate fields, so “five households” is never confused with “five people.”
- AI proposals remain editable and separate from the original observation.
- Confirmed records contribute to reporting; drafts are excluded from report exports.
- UUIDs and revision checks provide idempotent retries and explicit conflict resolution.
- Supervisor dashboard shows real local counts and follow-up status.
- CSV escapes spreadsheet formula prefixes; JSON backups include all local records.
- Shared team-key protection covers API records and inference. Key is kept in tab session storage; provider keys remain server-side.

## Deploy to Render

Push the **contents of this folder** to a new GitHub repository, then create a Render Blueprint from `render.yaml`. The blueprint uses a paid web service with a 1 GB persistent disk; review the quoted charge and your available promotional credit before activating it. Free ephemeral storage is unsuitable for this SQLite implementation.

Set `BACKBOARD_API_KEY`, `BACKBOARD_PROVIDER`, and `BACKBOARD_MODEL` in Render. Copy the generated demo `APP_TOKEN` from Render's environment settings into the app's Settings. Use a separate synthetic demo workspace and do not expose any private access token.

For a UI-only public demonstration, use `AI_PROVIDER=none`; describe that limitation explicitly. To demonstrate eligible AI, configure and run the genuine model adapter and save input/output evidence. No Render deployment or public GitHub repository has been created by this package.

## Tests

```bash
python -m unittest discover -s tests -v
```

Tests cover idempotent sync, conflict detection, confirmation requirements, strict extraction validation, and adapter payloads. Model adapter tests use mocked provider responses and do **not** prove model accuracy or live API connectivity.

## Architecture and boundaries

This MVP uses a lightweight JavaScript interface and Python standard-library service instead of the previously proposed Next.js / FastAPI stack. SQLite on a persistent disk replaces PostgreSQL for this single-instance demo. It keeps setup small and the server and interface on one origin.

The prototype has one shared team workspace, not individual worker accounts, roles, or organization isolation. It is for fictional data only. Browser data is not encrypted by the application and may be cleared by device settings. Identifier checks block obvious Nigerian phone numbers and email addresses; they are not comprehensive de-identification. Do not put real household or patient data in the notes.

It does not diagnose, prescribe, integrate with DHIS2, provide on-device inference, implement background closed-app sync, or claim production clinical readiness. AI accuracy, provider eligibility, live deployment, and multi-device field performance require real verification before submission.

See [demo walkthrough](docs/demo-walkthrough.md), [submission draft](docs/submission.md), and [architecture](docs/architecture.md).

## Primary references

- Backboard message API: https://docs.backboard.io/concepts/messages
- Ollama structured outputs: https://docs.ollama.com/capabilities/structured-outputs
- Gemma model: https://ollama.com/library/gemma3
- Render persistent disks: https://render.com/docs/disks
- Render Blueprint: https://render.com/docs/blueprint-spec

Code is MIT licensed. Model weights and external services retain their own licenses and terms.
