# Product Requirements Document (PRD)

**Product:** Meeting Sense / Meeting Monitor  
**Document version:** 1.0  
**Last updated:** 2026-04-19  
**Status:** Reflects current codebase capabilities; intended for roadmap and stakeholder alignment.

---

## 1. Executive summary

Meeting Sense is a **team collaboration product** that turns **meetings into actionable work**. It captures **live meeting audio** (via a bot) or **uploaded recordings**, produces **transcripts and intelligence**, and maintains a **Kanban board** whose tasks are **primarily derived from meeting content**—not ad-hoc manual entry. Optional **GitHub integration** links delivery work on the board to repository activity (PRs, CI).

**One-line value proposition:** *Close the loop from conversation to committed work with traceability back to meetings and, optionally, code.*

---

## 2. Goals

| Goal | Description |
|------|-------------|
| **G1 — Meeting truth** | Persist accurate transcripts and enough context for summaries, Q&A, and task extraction. |
| **G2 — Actionable Kanban** | Surface **confirmed** commitments as tasks with assignees, status, and meeting provenance. |
| **G3 — Role clarity** | Support **workspace owners (managers)** and **members** with appropriate visibility and controls. |
| **G4 — Delivery alignment** | Optional GitHub webhooks so board status can reflect merge/CI outcomes where configured. |
| **G5 — Operability** | Run on MongoDB + FastAPI backend and a modern React SPA; configurable AI (Groq) for STT and automation. |

### Success metrics (suggested)

- Time from meeting end to **usable board updates** (median).
- **Task acceptance rate** (tasks kept vs deleted after automation).
- **GitHub correlation accuracy** (tasks moved to Done when policy says they should).
- **Transcript usability** (error reports, manual edit rate if introduced later).

---

## 3. Personas

| Persona | Needs |
|---------|--------|
| **Workspace owner / Manager** | Create workspaces, invite members, run or review meetings, see team Kanban, analytics, settings, GitHub linkage. |
| **Team member** | Join via invite, participate in meetings, see assigned tasks, Kanban, documents, meeting detail. |
| **Admin / DevOps** | Configure env (Mongo, JWT, Groq, GitHub secrets), run seed data, monitor health endpoints. |

---

## 4. Scope

### 4.1 In scope (implemented or partially implemented)

- **Authentication:** Register/login, JWT sessions, forgot/reset password (email when SMTP configured; dev token-in-JSON option).
- **Workspaces (projects):** Create/list/join by invite code; types `workspace` and `class`; member roster with profile details.
- **Meetings:** Scheduled/live flow with bot-oriented APIs; participant join/leave; transcripts; attendance; post-meeting intelligence; optional **Q&A over transcript**.
- **Audio pipeline:** WebSocket audio from bot; STT via Groq Whisper with buffering, VAD, silence gating, domain hints (configurable).
- **Jitsi bot:** Selenium-based join + system audio capture to backend (environment-dependent).
- **Recorded uploads:** Upload audio → transcribe, summarize, extract action items; size limits per provider tier.
- **Kanban:** Five columns — *To Do, In Progress, In Review, Done, Blockers*; tasks include `task_key`, Git evidence fields, optional CI metadata; **manual task creation via generic API is disabled** in favor of meeting-driven creation (with project-scoped creation paths where implemented).
- **Agentic automation:** After transcripts, pipeline extracts **confirmed** assignments; board sync uses **latest meeting** context; RAG over transcripts configurable (`KANBAN_RAG_*`).
- **GitHub:** Webhook endpoint; signed deliveries; sync rules (e.g. merge required for Done, optional CI success gate).
- **Stale tasks:** Optional background sweep to surface inactivity (e.g. toward blockers) when flags are enabled.
- **Workspace copilot:** Server-side assistance hooks for workspace context.
- **Frontend:** Landing, auth flows, manager/member dashboards, meetings, tasks, Kanban, team (manager), analytics (manager), settings (manager), documents (member), live transcript UI, upload, workspace switcher.

### 4.2 Out of scope / not guaranteed

- **Consilium multi-agent package** (`backend/app/consilium/`): Rich agent graph (planning, risk, requirements, MCP tools) exists in the tree but depends on modules (e.g. `app.consilium.database`) **not present in the same package** as of this PRD—treat as **experimental / future** unless wired and shipped.
- **Mobile native apps** (not described in repo).
- **Enterprise SSO / SAML** (not evidenced as first-class).
- **Real-time collaborative editing** of transcripts (not specified).

---

## 5. Functional requirements

### 5.1 Authentication & accounts

| ID | Requirement | Priority |
|----|----------------|----------|
| FR-A1 | Users authenticate with email + password; API returns bearer JWT. | P0 |
| FR-A2 | Password reset flow: request link, validate token, set new password. | P0 |
| FR-A3 | User profile fields: name, email, role label, skills, avatar metadata. | P1 |

### 5.2 Workspaces & membership

| ID | Requirement | Priority |
|----|----------------|----------|
| FR-W1 | Owner creates workspace with unique **invite code**; members join with code. | P0 |
| FR-W2 | Distinguish project types **workspace** vs **class** for future UX/reporting. | P1 |
| FR-W3 | Owner-only management of **GitHub repo linkage** and webhook enablement (no public create-time override for sensitive fields). | P0 |

### 5.3 Meetings

| ID | Requirement | Priority |
|----|----------------|----------|
| FR-M1 | Meetings associated with a project; status includes **live** for bot/audio operations. | P0 |
| FR-M2 | Record participant join/leave for attendance analytics. | P1 |
| FR-M3 | Persist transcript segments; support live streaming path over WebSocket. | P0 |
| FR-M4 | Run **meeting intelligence** after relevant events (summaries, action items per implementation). | P0 |
| FR-M5 | **Contextual Q&A** over meeting/transcript text where implemented. | P1 |

### 5.4 Recordings

| ID | Requirement | Priority |
|----|----------------|----------|
| FR-R1 | Authenticated upload with project scoping; async processing state. | P0 |
| FR-R2 | Store transcription, summary, and structured action items. | P0 |
| FR-R3 | Enforce max upload size aligned with transcription provider limits. | P0 |

### 5.5 Tasks & Kanban

| ID | Requirement | Priority |
|----|----------------|----------|
| FR-T1 | Tasks use normalized statuses: `todo`, `in_progress`, `in_review`, `done`, `blockers`. | P0 |
| FR-T2 | Tasks link to **source meeting** when created from meetings. | P0 |
| FR-T3 | Support **auto-generated** tasks vs user-edited descriptions (`description_user_set`). | P0 |
| FR-T4 | Assignee by user id and/or display name from transcript. | P0 |
| FR-T5 | **Stable task keys** (e.g. prefixed identifiers) for Git and cross-system references. | P0 |
| FR-T6 | Automation must prefer **confirmed** commitments; informal items logged, not necessarily persisted as tasks. | P0 |
| FR-T7 | Optional **RAG** retrieval from transcript history for extraction/board sync (configurable). | P1 |

### 5.6 GitHub integration

| ID | Requirement | Priority |
|----|----------------|----------|
| FR-G1 | Webhook endpoint accepts signed GitHub payloads; reject unsigned when secret configured. | P0 |
| FR-G2 | Map events to tasks via project repo settings and task keys. | P0 |
| FR-G3 | Configurable policy: e.g. require PR merge for Done; optional CI success on head SHA. | P1 |
| FR-G4 | Surface last webhook diagnostics on project for owners. | P2 |

### 5.7 Frontend experience

| ID | Requirement | Priority |
|----|----------------|----------|
| FR-U1 | Role-based routes: manager vs member workspace experiences. | P0 |
| FR-U2 | Protected routes with session recovery UX on auth context errors. | P1 |
| FR-U3 | Kanban and task views with Git reference components where applicable. | P1 |
| FR-U4 | Live transcript presentation during meetings. | P0 |

---

## 6. Non-functional requirements

| ID | Category | Requirement |
|----|----------|----------------|
| NFR-1 | Security | JWT secret configurable; HTTPS assumed in production; CORS configurable. |
| NFR-2 | Security | GitHub webhooks verified with HMAC; PAT usage per server config only. |
| NFR-3 | Privacy | Meeting audio and transcripts stored in app database; clarify retention policy per deployment. |
| NFR-4 | Performance | STT chunking, rate limits, and silence gating to balance latency and cost. |
| NFR-5 | Reliability | Health endpoint; graceful handling when Groq key missing (transcription disabled). |
| NFR-6 | Observability | Structured logging for stale sweep and automation (per implementation). |

---

## 7. Dependencies & constraints

- **Database:** MongoDB.
- **AI/STT:** Groq API (Whisper-class models, chat models for automation); API key required for full functionality.
- **Embeddings/RAG:** Sentence-transformer class models (e.g. `all-MiniLM-L6-v2`) and FAISS per service code—deployment must include Python deps and acceptable CPU/RAM.
- **Bot:** Selenium + Chrome + system audio device (OS-specific); not all environments support unattended capture.
- **Frontend:** Vite dev server / static hosting; expects backend API at configured base URL.

---

## 8. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Hallucinated or low-quality STT | VAD, silence thresholds, hints, chunk overlap; manual review UX on board. |
| Over-creation of tasks from meetings | Pipeline emphasizes **confirmed** commitments only; informal items not persisted. |
| GitHub sync false positives/negatives | Policy flags (merge required, CI gate); diagnostics on project. |
| Experimental Consilium code confuses roadmap | Document separately; integrate only after DB/router parity. |

---

## 9. Open questions

1. Long-term positioning: **education (`class`)** vs **pure B2B team**—does pricing, FERPA, or moderation differ?
2. Should **manual task creation** ever be enabled for specific roles?
3. Target SLA for transcript latency in live meetings (drives STT buffer defaults).
4. Multi-tenant admin console vs per-deployment configuration only.

---

## 10. Glossary

| Term | Meaning |
|------|---------|
| **Workspace / Project** | Same underlying entity in API models (`project_id`); UI calls it workspace. |
| **Task key** | Human/system reference tying Kanban tasks to Git conventions (e.g. prefixed ID). |
| **Kairox board** | Internal name for the five-column Kanban model in code comments. |
| **Meeting intelligence** | Post-processing of transcripts for summaries and structured insights. |

---

## 11. Document history

| Version | Date | Notes |
|---------|------|--------|
| 1.0 | 2026-04-19 | Initial PRD from repository analysis. |
