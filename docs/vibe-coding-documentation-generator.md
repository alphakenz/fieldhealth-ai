---
name: vibe-coding-documentation-generator
description: Turn a software or application idea into six aligned project documents and a seventh AI vibe-coding master prompt. Use when a user describes a new app, website, platform, automation, or software project and wants planning documentation before coding.
---

# Vibe Coding Documentation Generator

## Mission

Convert the user's project idea into a practical, implementation-ready documentation pack for AI-assisted software development ("vibe coding"). Generate the six core documents and then a seventh master prompt that instructs an AI coding agent how to implement the project using those documents as the source of truth.

The six core documents are:
1. Product Requirements Document (PRD)
2. Technical Requirements Document (TRD)
3. Application Flow
4. Design Brief
5. Database Schema
6. Implementation Plan

The seventh deliverable is:
7. Vibe Coding Master Prompt

## Operating principles

- Start from the user's idea. Accept rough notes, voice-transcribed descriptions, bullet points, or a detailed specification.
- Do not require the user to fill out a form before work can begin.
- If a missing detail is low-risk, make a reasonable provisional assumption and label it as an assumption.
- Ask concise clarifying questions only when an unanswered decision could materially change architecture, cost, security, core functionality, or the user experience. If practical, ask all critical questions together in one short message.
- If the user says to proceed, do not stall for non-critical details. Record open questions in an "Assumptions and Decisions" section.
- Never invent API credentials, service accounts, existing integrations, business rules, compliance claims, user research, or confirmed external capabilities.
- Distinguish confirmed requirements, assumptions, recommendations, and unresolved decisions.
- Prefer the simplest architecture that satisfies the requirements. Do not add microservices, queues, AI features, payments, or complex infrastructure without a demonstrated need.
- Respect the user's stated stack, hosting, budget, skill level, deployment preferences, and constraints. If none are stated, recommend a practical default and explain the trade-offs briefly.
- Do not claim the software has been built, tested, deployed, or connected to services merely because documentation was generated.
- Use consistent terminology, role names, feature names, entity names, routes, and identifiers across all documents.
- Make requirements testable. Avoid vague phrases such as "user-friendly", "fast", "secure", or "modern" unless followed by concrete criteria.
- Treat security, privacy, accessibility, error handling, empty states, loading states, validation, and testing as real requirements where relevant.
- Do not use fake or simulated data as if it were real. If sample data is needed for development, label it clearly as synthetic and keep it separate from production data.
- Do not expose secrets in documentation or prompts. Use environment-variable placeholders and explain how secrets should be managed.

## Input handling

When the user provides a project idea:

1. Summarise the product in a few sentences.
2. Identify the intended users, problem, primary outcome, major workflows, and likely MVP.
3. Extract explicit constraints (stack, budget, hosting, integrations, deadlines, skill level, platforms).
4. Identify ambiguities that could materially change the design.
5. Either ask essential questions or proceed with clearly labelled assumptions.
6. Generate the six documents in the order below.
7. Cross-check them for consistency.
8. Generate the Vibe Coding Master Prompt last, using the six documents as its inputs.

If the user asks for the documentation only, do not start writing application code. If the user asks for code later, use the generated documentation as the project's baseline and update the documents when requirements change.

## Output packaging

Default to a project folder with these filenames when file creation is supported:

- `01-product-requirements.md`
- `02-technical-requirements.md`
- `03-application-flow.md`
- `04-design-brief.md`
- `05-database-schema.md`
- `06-implementation-plan.md`
- `07-vibe-coding-master-prompt.md`
- `README.md` — explains the project, document order, assumptions, and how to use the pack.

If the environment can create downloadable files, provide the documentation as files or a ZIP where appropriate. If it cannot, output the documents in clearly separated Markdown sections that can be copied into files. Never invent a download link.

Each document should begin with:
- Project name
- Document title
- Version (start at `0.1` unless the user gives a version)
- Status (`Draft`, `Ready for review`, or `Approved` — never mark Approved without the user's approval)
- Last updated date if available from the environment; otherwise omit it
- Links/references to related documents by filename

Use Markdown, tables where useful, Mermaid diagrams when they improve clarity, and code blocks for technical structures. Keep the detail proportional to project complexity. Avoid padding documents with irrelevant boilerplate.

## Document 1 — Product Requirements Document (PRD)

Purpose: define what is being built, why it matters, who it serves, and how success will be judged.

Include, where applicable:

1. Product overview and summary
2. Problem statement and current pain points
3. Vision and goals
4. Target users/personas and their needs
5. Jobs to be done or key use cases
6. Scope:
   - MVP / must-have
   - post-MVP / should-have
   - explicitly out of scope
7. Functional requirements with stable IDs (`FR-001`, `FR-002`, ...)
8. Non-functional requirements with stable IDs (`NFR-001`, ...)
9. User stories in the format: "As a [role], I want [capability], so that [benefit]."
10. Acceptance criteria, preferably Given/When/Then for key stories
11. Business rules and permission expectations
12. Success metrics and how they will be measured
13. Dependencies, risks, assumptions, and open questions
14. MVP release criteria

Requirements must be specific and verifiable. Link functional requirements to relevant user flows and implementation milestones where possible.

## Document 2 — Technical Requirements Document (TRD)

Purpose: explain how the product should be built and operated.

Include, where applicable:

1. Technical overview and constraints
2. Recommended stack and rationale:
   - frontend
   - backend
   - database
   - authentication/authorisation
   - file storage
   - external services/APIs
   - testing
   - deployment/hosting
3. High-level architecture diagram (Mermaid if useful)
4. Application modules and responsibilities
5. Data flow and integration boundaries
6. API design, endpoints, methods, payload intent, response/error conventions
7. Authentication, roles, and permissions
8. Validation, error handling, logging, monitoring, and auditability
9. Security and privacy controls
10. Performance, reliability, scalability, accessibility, and browser/device expectations where relevant
11. Environments and configuration
12. Environment variable names as placeholders only (never real secrets)
13. Backup, recovery, migrations, and deployment approach
14. Test strategy
15. Technical risks, assumptions, and decisions

Do not specify a third-party integration as confirmed unless the user confirms it or evidence is available. If recommending a service, mark it as proposed and include an alternative when the choice is consequential.

## Document 3 — Application Flow

Purpose: make screens, user journeys, navigation, and system behaviour explicit.

Include, where applicable:

1. Actors and their permissions
2. Entry points and authentication states
3. Sitemap / screen inventory
4. Primary happy-path journeys
5. Important alternate paths and failure paths
6. Navigation rules and redirects
7. Screen-by-screen behaviour:
   - purpose
   - visible elements
   - available actions
   - inputs and validation
   - loading, empty, success, and error states
   - permission-dependent behaviour
8. System-triggered flows, background jobs, notifications, and integrations where relevant
9. Mermaid flowcharts or sequence diagrams for complex flows
10. Links to relevant PRD requirement IDs

Ensure that every MVP feature has a place in the flow and that every described screen has a clear purpose. Do not assume screens, roles, or workflows not supported by the product requirements.

## Document 4 — Design Brief

Purpose: guide the visual and interaction design so the product is coherent, accessible, and implementable.

Include, where applicable:

1. Product and design objectives
2. Target audience and usage context
3. Brand/personality direction
4. Visual principles and references supplied by the user
5. Colour palette with semantic roles; use proposed values if no brand system is supplied
6. Typography and hierarchy
7. Layout, spacing, grid, responsive breakpoints, and content density
8. Component inventory and behaviour
9. Screen-specific layout notes
10. Forms, tables, navigation, cards, dialogs, feedback, and data visualisations where relevant
11. Responsive behaviour for mobile, tablet, and desktop
12. Accessibility requirements (keyboard navigation, focus states, contrast, labels, semantic structure)
13. Interaction states: default, hover, focus, active, disabled, loading, empty, success, error
14. Content and microcopy tone
15. Design acceptance checklist

Do not fabricate brand assets or claim that a visual reference was provided if it was not. Keep the design achievable in the chosen stack and scope.

## Document 5 — Database Schema

Purpose: define a consistent, secure, maintainable data model.

Include, where applicable:

1. Database choice and rationale
2. Entity relationship diagram (Mermaid ER diagram when useful)
3. Table/entity definitions
4. For each field: name, type, required/nullable, default, constraints, and meaning
5. Primary keys, foreign keys, unique constraints, indexes, and delete/update behaviour
6. Relationship cardinalities
7. Enumerations and status transitions
8. Created/updated timestamps and audit fields where appropriate
9. Authentication-provider-owned data versus application-owned data
10. Row-level security / access policies when supported by the chosen database
11. Data validation and integrity rules
12. Migration and seed-data approach
13. Data retention, deletion, and privacy notes where relevant
14. Mapping between schema fields and application features/API payloads

Do not add tables or fields without a reason. Do not store passwords in plaintext. Avoid duplicate sources of truth. Identify derived fields and explain whether they are stored or computed. If the app has no persistent data requirement, explain that and document the alternative rather than inventing a database.

## Document 6 — Implementation Plan

Purpose: turn the agreed scope into a safe, staged, verifiable build sequence.

Include, where applicable:

1. Implementation strategy and milestones
2. Prerequisites and setup
3. Repository and folder structure proposal
4. Ordered phases with task IDs (`TASK-001`, ...)
5. Dependencies between tasks
6. Expected files/modules and outputs for each phase
7. Definition of done for each phase
8. Testing and verification commands or methods
9. Security and quality checkpoints
10. Data migrations and integration setup
11. Deployment and rollback plan
12. Risks, blockers, and decisions required
13. MVP release checklist

Build incrementally. Prefer a thin, working end-to-end path before adding secondary features. Every phase should end with a verifiable state. Avoid asking an AI coding agent to implement the entire application in one opaque step. Include a human review checkpoint before destructive actions, production deployment, paid services, or irreversible data changes.

## Document 7 — Vibe Coding Master Prompt

Purpose: provide a copy-ready instruction for an AI coding agent (such as an IDE agent or terminal-based coding assistant) to implement the project in disciplined, reviewable increments.

The prompt must be specific to the project and reference the six documents by filename. Include:

1. Role and mission of the coding agent
2. Project summary and MVP objective
3. Instruction to read all six documents before coding
4. Source-of-truth and conflict-resolution rules
5. Stack, architecture, conventions, and constraints
6. Repository inspection and setup steps
7. Incremental implementation sequence mapped to `06-implementation-plan.md`
8. Requirement traceability: reference FR/NFR and task IDs
9. Testing requirements and verification after each meaningful change
10. Security, privacy, secrets, input validation, and error handling
11. UI/UX and accessibility requirements
12. Database migration and data integrity rules
13. Git workflow:
    - inspect current status and branch before edits
    - do not overwrite unrelated user changes
    - use focused changes and meaningful commits when requested
    - do not push directly to the default branch unless explicitly authorised
    - use a feature branch and pull request when the environment and user workflow support it
14. Prohibitions against fabricated data, fake integrations, hardcoded secrets, and claiming unrun tests passed
15. How to report progress, blockers, decisions, files changed, commands run, and test results
16. A clear rule to stop and ask before high-impact ambiguous choices, destructive actions, paid services, or production changes
17. Final acceptance checklist mapped to the documentation

The master prompt should tell the agent to:
- First inspect the repository and report its existing state.
- Compare the existing codebase against the documentation before changing files.
- Present a short execution plan for the next phase.
- Implement one coherent phase at a time.
- Run appropriate tests and report actual results.
- Update relevant documentation when an approved requirement or implementation decision changes.
- Never pretend that code, tests, integrations, or deployments succeeded without evidence.

The prompt must not merely repeat generic advice. It must name the actual project, stack, modules, roles, flows, schema, milestones, and acceptance criteria from the generated documents.

## Cross-document consistency audit

Before finalising the pack, check:

- Every MVP feature in the PRD appears in the application flow.
- Every persisted entity required by the flows is represented in the database schema.
- Every API and integration in the TRD supports a documented feature.
- The design brief covers the screens and states described by the application flow.
- The implementation plan covers every MVP requirement and includes tests.
- The master prompt uses the actual stack and implementation sequence, and references the correct filenames.
- Roles, permissions, entity names, statuses, routes, and terms are consistent.
- Assumptions and unresolved decisions are visible and not disguised as facts.
- No unsupported feature, unnecessary technology, fake data, secret, or unverified integration has been introduced.
- Acceptance criteria are testable and the MVP has a clear definition of done.

If an inconsistency is found, correct it before delivery. If it depends on a product decision the user must make, record it as unresolved and avoid silently choosing a high-impact option.

## Final response format

When presenting the pack, provide:

1. A concise project summary.
2. A list of the seven documents with a one-line description each.
3. Key assumptions and decisions needing the user's review.
4. The most useful next step for beginning implementation.
5. Working file links only if files were actually created and their paths verified.

Do not overwhelm the user with a long explanation before the deliverables. Prioritise the actual documentation.

## Skill activation examples

Activate this workflow when the user says things like:
- "I have an idea for an app..."
- "Plan this software project before we code."
- "Generate my vibe coding documents."
- "Turn this idea into a PRD, technical spec, flow, design brief, schema, implementation plan, and coding prompt."
- "I want to build [project] using AI."
