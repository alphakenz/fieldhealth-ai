# FieldHealth AI — Design Brief

| | |
|---|---|
| Project | FieldHealth AI |
| Document | 04 — Design Brief |
| Version | 0.1 |
| Status | Draft |
| Last updated | 2026-10-09 |
| Related | `01-product-requirements.md`, `03-application-flow.md` (screen IDs S-01…S-14) |

No brand assets or visual references were supplied; every value below is a **proposal** to be reviewed.

---

## 1. Design objectives

1. **Trustworthy under pressure:** the worker always knows whether their work is *saved on the device*, *synced*, *in conflict*, or *confirmed*.
2. **Clear AI boundary:** AI-proposed values look and read different from worker-entered values until the worker applies them.
3. **Outdoor, one-handed, low-connectivity use:** big targets, high contrast, small payloads, no web-font downloads.
4. **Calm, administrative tone:** no clinical imagery, no alarming health iconography; the product reports field administration, it does not assess people.

## 2. Audience and usage context

Field workers on mid-range Android phones (≈ 360–412 px wide), bright sun, glare, gloves/one hand, interrupted attention, patchy network. Supervisors on phone or laptop, desk or vehicle. All content in the prototype is fictional.

## 3. Personality and principles

Plain, steady, respectful. Principles: **status before style**, **words plus shape plus colour**, **nothing hidden behind hover**, **one primary action per screen**, **errors say what to do next**.

## 4. Colour (semantic roles — proposed values)

Light theme default (better outdoors); dark theme optional via `prefers-color-scheme`. Final values must pass a contrast checker (text ≥ 4.5:1, large text/UI components ≥ 3:1).

| Role | Token | Light | Use |
|---|---|---|---|
| Background | `--bg` | `#FFFFFF` | Page |
| Surface | `--surface` | `#F4F6F5` | Cards, panels |
| Text | `--ink` | `#14201B` | Body |
| Muted text | `--ink-muted` | `#46544E` | Secondary |
| Primary | `--primary` | `#0F5C4D` | Primary buttons, links |
| Primary text on | `--on-primary` | `#FFFFFF` | |
| Saved on device / OK | `--ok` | `#1B6E3C` | Saved, Synced, Confirmed |
| Waiting / attention | `--warn` | `#8A4B00` | Pending sync, stale draft |
| Conflict / error | `--danger` | `#B42318` | Conflict, validation error |
| AI proposal | `--ai` | `#3B3F9E` | AI-proposed values, AI badge |
| Focus ring | `--focus` | `#0B57D0` | 3 px outline, 2 px offset |
| Border | `--border` | `#B8C4BE` | Inputs |

Rules: status is never colour-only (always icon + text). AI proposals use `--ai` **plus** a dashed border and an "AI proposal" label.

## 5. Typography

System font stack (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`) — no network font loading (works offline). Base 18 px / 1.5 on mobile (larger than usual for outdoor reading); scale: 14 (caption), 18 (body), 20 (label), 24 (h2), 30 (h1). Weights: 400 body, 600 labels/buttons. Numbers in dashboards use tabular figures.

## 6. Layout, spacing, breakpoints

- 4 px base unit; spacing scale 4/8/12/16/24/32.
- 16 px page gutters; single column on mobile.
- Breakpoints: **< 640** mobile (bottom navigation); **640–1023** tablet (two-column where useful); **≥ 1024** desktop (side navigation, register as table).
- Content density: comfortable on mobile; compact table rows (≥ 40 px) on desktop only.
- Sticky header (status chip + title) and sticky action bar (primary action) on the editor.

## 7. Component inventory

| Component | Behaviour notes |
|---|---|
| **Status chip** | States: *Offline*, *Saved on device*, *Waiting to sync (n)*, *Syncing…*, *Synced*, *Conflict*, *Sign in to sync*. Icon + text; `aria-live="polite"`. Tap opens S-04. |
| Scope notice | "Fictional data. Administrative reporting only — not for diagnosis or treatment." Dismissible per session, always in S-14. |
| Buttons | Primary (filled), Secondary (outline), Danger (outline red). Min 48 px high; disabled shows a reason text nearby, not only a faded look. |
| Text fields / textarea | Persistent visible labels; helper and error text below; notes textarea min 8 rows, auto-grow. |
| Select | Native `<select>` for reliability on low-end devices. |
| Repeating rows | People present and follow-ups; "Add" / "Remove" buttons with row-specific accessible names ("Remove person 2"). |
| Completeness checklist | List of rules with ✓ / ✗ and text; each missing item is a link to its field. |
| Field provenance badge | `You`, `AI → applied`, `AI → edited`, `AI ignored` (S-09). |
| AI proposal card | Dashed `--ai` border, label "AI proposal", evidence snippet, **Apply / Edit / Ignore**; "Ungrounded" warning style with `--warn`. |
| Conflict table | Mine / Server / Result columns; stacked cards on mobile; differing fields flagged "Differs". |
| Dialogs | Focus trapped, `Esc` closes, return focus to trigger; used for Confirm only (avoid modal overuse). |
| Toast / banner | Banner for errors that need action; toast only for success, `role="status"`. |
| Tables / lists | Register is a card list on mobile, table on desktop; sortable by date. |
| Charts | Simple bars/lines (SVG), each with a text table alternative; no colour-only encodings (patterns/labels). |
| Update bar | "Update available — Reload" for new service worker. |

## 8. Screen-specific layout notes

- **S-02 Home:** the primary "New visit" button sits in the thumb zone (bottom, full width on mobile). "Needs attention" is first on the page.
- **S-03 Editor:** order is notes → structured fields → follow-ups → checklist. Autosave indicator in the sticky header. Confirm button appears only when the checklist is complete; otherwise the checklist is the focal element.
- **S-05 Conflict:** differing fields first; identical fields collapsed under "Same on both".
- **S-06 AI review:** notes shown in a collapsible panel with evidence highlights; proposals listed in the same order as the editor. Banner "AI drafts can be wrong. You are responsible for checking."
- **S-11 Dashboard:** six tiles max above the fold on mobile; charts stack.
- **S-13 Model status:** states stated plainly: "No successful inference recorded", "Reachable at 14:02", "Test provider (fake) — not model inference".

## 9. Responsive behaviour

Mobile: bottom navigation (Home, Register, Follow-ups, Dashboard, More). Tablet: same with wider content and two-column editor. Desktop: left rail navigation, register table, side-by-side conflict and AI review. No horizontal page scroll at 320 px; tables on mobile reflow to cards.

## 10. Accessibility requirements

- Semantic landmarks (`header`, `nav`, `main`), one `h1` per view, logical heading order.
- All inputs have `<label>`; errors associated with `aria-describedby`; error summary moves focus on failed submit.
- Keyboard: every action reachable; visible focus ring (3 px); no keyboard traps outside dialogs.
- Touch targets ≥ 44 × 44 px with ≥ 8 px spacing.
- Colour not sole indicator; status has icon + text.
- Respect `prefers-reduced-motion` (no animations beyond subtle opacity).
- Language attribute set; plain-language copy (reading level ≈ grade 8).
- Screen-reader smoke test on S-03, S-05, S-06 before release.

## 11. Interaction states (all interactive components)

default · hover (desktop only, never required) · focus-visible · active · disabled (with reason) · loading (spinner + text, disabled to prevent double submit) · empty · success · error. Network-dependent buttons show "Needs connection" when offline instead of silently failing.

## 12. Content and microcopy tone

Short, direct, first-person-safe. Examples:
- Saved: "Saved on this device at 14:32."
- Waiting: "3 visits waiting to sync. They are safe on this device."
- AI failure: "The model service isn't available. Your visit is saved. You can keep working and try again later."
- Conflict: "This visit changed in two places. Choose what to keep. Nothing is lost until you decide."
- Missing: "Water source is needed before you can confirm."
- AI value unknown: "Not found in notes" (never "N/A" or a guess).
- Avoid: "diagnose", "patient", "symptoms", "treatment" in UI copy.

## 13. Design acceptance checklist

- [ ] Status chip present and accurate on all screens (offline, pending, conflict).
- [ ] AI-proposed vs worker-entered values are visually and textually distinct.
- [ ] 360 px layout has no horizontal scroll; targets ≥ 44 px.
- [ ] Contrast verified for all token pairs; focus visible.
- [ ] No web fonts or remote assets required offline.
- [ ] Every error message states a next step.
- [ ] Charts have table alternatives.
- [ ] Fictional-data and scope notice reachable on every view.
- [ ] No clinical wording or imagery.
