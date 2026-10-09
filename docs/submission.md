*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 1: Touch Grass](https://dev.to/challenges/hacktoberfest-week1-2026-10-05).*

# FieldHealth AI: Less Time Typing. More Time Caring.

## What I Built

FieldHealth AI is a mobile-friendly community outreach workspace. A worker can record a fictional household visit outside, save it without connectivity, review a structured AI draft when the model service is reachable, and confirm the visit for supervisor reporting.

The workflow includes offline drafts, required-field checks, a visit register, administrative follow-ups, a dashboard, and CSV / JSON exports. The model organizes observations; the worker checks the result. This prototype handles administrative field reporting rather than diagnosis or treatment.

## Demo

Live application: **[Add the verified public Render URL]**

Video: **[Add the actual outdoor demonstration URL]**

The demo uses fictional household records and shows offline capture, reviewed extraction, synchronization, and a confirmed-record export.

## Code

Repository: **[Add the public GitHub repository URL]**

The code includes a Python server, mobile JavaScript interface, IndexedDB storage, service worker, model adapters, synchronization tests, and Render configuration. Application code is MIT licensed; model terms are separate.

## How I Built It

The application uses a lightweight JavaScript frontend and a Python backend with SQLite. IndexedDB preserves records on the device; a service worker caches the interface. UUIDs, revision checks, and explicit conflict resolution keep synchronization from silently overwriting field notes.

**Complete this paragraph with the provider, exact model, model license, and inference evidence actually used.** The implemented adapters support Backboard with an explicitly configured model and local Gemma through Ollama. Adapter implementation alone is not evidence of live inference.

The model proposes household code, people present, water source, and follow-up fields. Unknown values remain null. Strict server validation rejects malformed outputs, and deterministic completeness checks identify missing information. A worker reviews the draft before confirming the record.

A key design decision was separating offline capture from model availability. A service interruption should not prevent a field worker from saving a visit. Another was keeping model output separate from confirmed fields, so reports represent reviewed data.

**Add observed extraction accuracy, real implementation lessons, and the verified deployment details after the live demo.**

## Why Does Open Innovation Matter?

Open application code lets organizations inspect reporting rules, adapt forms, and contribute improvements. An open-weight model can also provide a path to organization-controlled inference and task-specific evaluation. The Ollama adapter makes that route explicit, while the Backboard adapter offers hosted inference when configured with a verified eligible model.

**Describe the concrete open-weight model benefit you actually demonstrated.** Do not claim offline on-phone inference, fine-tuning, or model evaluation unless completed.

## My Agent Session

Optional: **[Add a DevRelay session link if recorded, otherwise remove this section.]**

## Prize Categories

- **Best Use of Backboard — include only after successful live Backboard inference with the documented model.**
- **Best Use of Render — include only after deploying and demonstrating the application on Render.**

This draft is intentionally unfinished where external deployment and inference evidence are still needed.
