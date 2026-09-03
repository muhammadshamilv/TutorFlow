# TutorFlow

A session management platform for online tutors who teach students one-to-one. Tutors add students, schedule sessions, take notes during a session, and use AI to plan sessions before they start and review them afterward. Students log in to see their own upcoming sessions, past notes, and homework.

Built as a 7-day internship task. This README documents what was built, how the database is structured, the exact AI prompts used and why, what does not work yet, and what would come next.

---

## What Works

- **Two-role authentication** — tutor and student accounts on a single `User` model, JWT stored in httpOnly cookies, roles enforced on every request server-side (not just hidden in the UI)
- **Tutor creates students** — one action creates both the student's login account and their profile (subject, level, goals, weak areas) together
- **Full student CRUD** — scoped so a tutor only ever sees their own students, enforced by both queryset filtering and an object-level permission check
- **Strict 4-state session lifecycle** — `Scheduled → In progress → Completed → AI reviewed`, enforced so no state can be skipped and nothing after `Completed` can be edited except triggering the AI review
- **Double-booking prevention** — a tutor cannot have two overlapping sessions; checked with a race-safe interval-overlap query
- **Notes autosave** — debounced (1 second after the last keystroke), persists across page reloads, locked once a session is completed
- **Three AI features (Gemini)** — session plan (pre-session), session review (post-session, triggers the state transition), and a cross-session progress summary — all grounded in the student's actual profile and history, not generic prompts
- **Student dashboard** — upcoming sessions, past sessions with read-only notes, and an aggregated homework list, all scoped so a student can never see another student's data
- **Forgot / reset password** — console-email flow (no real mail service required for this submission)
- **Password show/hide toggle** on every password field
- **Server-side pagination** on students and sessions lists, so the UI stays fast regardless of how many records exist
- **Professional shell** — top navbar with a user menu, skeleton loading on every list/detail view, consistent empty and error states, graceful handling when the AI call fails (the app never crashes or corrupts session state on an AI outage)

## What Does Not Work / Was Not Built

- **Email delivery** — password reset links print to the backend console instead of sending a real email (the brief allows this; SMTP was not wired up in the time available)
- **No session rescheduling UI** — the backend supports editing a still-`Scheduled` session's time/topic, but no frontend dialog was built for it; a tutor must currently cancel and re-schedule instead
- **No automated test suite** — the app was verified manually via Postman (backend) and manual QA (frontend) at the end of every phase, but no `pytest`/`vitest` suite exists yet
- **Bonus email-on-schedule feature** — not built (explicitly marked bonus, not required, in the brief)
- **No timezone selector** — all times are handled in the browser's local timezone via `datetime-local` inputs and converted to UTC for storage; there's no explicit timezone picker if a tutor and student are in different zones

---

## Tech Stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Zod, React Hook Form, Jotai (global state) + Context API (auth actions), React Router, Axios, Sonner (toasts)

**Backend:** Python, Django, Django REST Framework, `djangorestframework-simplejwt` (adapted for httpOnly cookies), PostgreSQL (hosted on Supabase), `google-genai` (Gemini)

**Infrastructure:** Git/GitHub, deployed with environment variables set on the hosting platform (no local setup required to review)

---

## Database Structure

Four tables, all in PostgreSQL. All primary keys are UUIDs.

### `users`
The single table for both tutors and students — a `role` field distinguishes them, checked on every request server-side.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `email` | varchar, unique | login identifier |
| `password` | varchar | Django's hashed password |
| `first_name` / `last_name` | varchar | |
| `role` | varchar(10) | `tutor` or `student` |
| `is_active` / `is_staff` | bool | |
| `created_at` / `updated_at` | timestamp | |

### `students`
A student's profile, owned by exactly one tutor and linked to exactly one login account.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `tutor_id` | UUID → `users.id` | the owning tutor |
| `user_id` | UUID → `users.id`, unique | this student's own login |
| `subject` | varchar(150) | |
| `current_level` | varchar(50) | e.g. "Grade 10", "IELTS Band 5" |
| `learning_goals` | text | free text |
| `weak_areas` | text | free text — **read directly by every AI prompt** |
| `created_at` / `updated_at` | timestamp | |

### `sessions`
The core entity — one row per tutoring session, carrying the lifecycle state and both AI outputs.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `tutor_id` | UUID → `users.id` | |
| `student_id` | UUID → `students.id` | |
| `topic` | varchar(255) | |
| `scheduled_start` / `scheduled_end` | timestamp | used for clash detection |
| `status` | varchar(20) | `scheduled` / `in_progress` / `completed` / `ai_reviewed` |
| `notes` | text | tutor's live notes, locked after `completed` |
| `ai_plan` | jsonb, nullable | structured plan output |
| `ai_plan_generated_at` | timestamp, nullable | |
| `ai_review` | jsonb, nullable | structured review output |
| `ai_review_generated_at` | timestamp, nullable | |
| `created_at` / `updated_at` | timestamp | |

Indexed on `(tutor, scheduled_start)` and `(student, scheduled_start)` to keep clash checks and per-student session lists fast without full table scans.

### Relationships

```
users (role=tutor) ─┬──< students >──┬─ users (role=student)
                     │                │
                     └──< sessions >──┘
```

- One tutor → many students (`students.tutor_id`)
- One student profile → exactly one login account (`students.user_id`, one-to-one)
- One tutor → many sessions (`sessions.tutor_id`)
- One student → many sessions (`sessions.student_id`)

There is deliberately no separate "AI outputs" table — a plan and a review belong to exactly one session each, so they live directly on the `Session` row rather than introducing an unnecessary join.

### Why this shape

A single `users` table with a `role` field (rather than separate `Tutor`/`Student` models) was chosen because tutors and students share identical authentication needs — login, password reset, JWT — and only differ in what they're allowed to *do*, which is an access-control concern, not a data-modelling one. Keeping `ai_plan`/`ai_review` as JSON columns on `Session` (rather than free text) means the frontend never has to parse markdown or guess field names, and a "progress summary" can cheaply read every past review's `summary` field directly.

---

## The Session State Machine

```
Scheduled ──start──> In progress ──complete──> Completed ──ai-review──> AI reviewed
```

Enforced with a single allow-list of transitions (`sessions_app/models.py`), checked identically everywhere the state changes:

- Each transition is its **own API action** (`POST /sessions/{id}/start/`, `/complete/`), not a generic "update status" endpoint — there is no code path that can write an arbitrary status value or skip a step
- Every transition re-reads and locks the row (`SELECT ... FOR UPDATE`) inside a database transaction before checking whether the move is legal, so two rapid duplicate clicks can't both succeed
- The move to `ai_reviewed` only happens as a side effect of a **successful** AI review call — never as a bare status flip — so a session can never end up "AI reviewed" without an actual review existing
- Once `Completed`, the notes field is rejected server-side on any edit attempt, regardless of what the frontend sends

---

## AI Integration — Prompts and Rationale

**Model:** Gemini (`gemini-2.0-flash`), called via `google-genai`, with `response_schema` forcing structured JSON output rather than free text — every response is parsed directly into typed fields, never scraped from markdown.

The one rule followed throughout: **never send a bare instruction.** Every prompt is assembled from the actual student profile and actual session history, because that's what the brief specifically flags as separating a good prompt from a generic one.

### 1. Session Plan (before a session starts)

```
You are an experienced, encouraging private tutor preparing for an upcoming one-to-one session.

STUDENT PROFILE
Subject: {subject}
Current level: {current_level}
Learning goals: {learning_goals}
Known weak areas: {weak_areas}

UPCOMING SESSION TOPIC
{session topic}

RECENT SESSION HISTORY (most recent first)
{up to 5 past sessions: topic, status, and the tutor's actual notes}

TASK
Create a session plan for the upcoming session on "{topic}" that is specifically
tailored to this student's level and weak areas, and that builds on what was
covered in their recent sessions where relevant. Do not produce a generic lesson
plan that could apply to any student — reference their specific weak areas and
goals directly in the objectives and practice questions.

Return:
1. learning_objectives — 2-4 specific, measurable objectives.
2. lesson_outline — exactly four sequential points.
3. practice_questions — exactly three questions targeting this student's weak areas.
```

**Why written this way:** the brief explicitly warns that "generate a lesson plan" scores low because it ignores everything known about the student. This prompt makes the weak areas and goals unavoidable — the instruction directly says not to produce anything generic — and includes real session history so a second session builds on the first instead of starting cold every time. History is capped at 5 sessions to keep the prompt focused and the token cost bounded for students with a long history.

### 2. Session Review (after a session is completed)

```
You are an experienced, encouraging private tutor writing up a session summary
immediately after a one-to-one session has ended.

STUDENT PROFILE
{same profile block as above}

SESSION TOPIC
{topic}

TUTOR'S RAW NOTES FROM THIS SESSION
{the tutor's actual notes, verbatim}

TASK
Based on the tutor's raw notes above and the student's known profile, write a
review of this specific session. Be concrete and reference details from the
notes rather than writing generic feedback. If the notes mention a specific
mistake or breakthrough, reflect it in the summary and homework.

Return:
1. summary — grounded in the notes above.
2. homework_tasks — 2-3 tasks reinforcing this specific session.
3. next_session_suggestion — one concrete suggestion based on what this session revealed.
```

**Why written this way:** this is the prompt most at risk of producing generic filler, since "summarise the session" alone gives the model nothing concrete to react to. Injecting the tutor's raw notes verbatim, and explicitly instructing the model to reference specific details from them, is what makes the homework and summary actually about what happened rather than a templated recap.

### 3. Progress Summary (aggregate, across all reviewed sessions)

```
You are an experienced private tutor writing a progress overview for a student
you have been teaching one-to-one over multiple sessions.

STUDENT PROFILE
{profile block}

HISTORY OF PAST SESSION REVIEWS (chronological)
{every ai_reviewed session's topic + stored review summary}

TASK
Looking across ALL of the session reviews above as a trend (not just the most
recent one), write a short paragraph describing where this student is genuinely
improving and where they continue to struggle. Be specific about patterns you
notice across multiple sessions, not a restatement of the last session alone.

Return:
1. summary — a 4-6 sentence paragraph referencing recurring themes.
```

**Why written this way:** a naive version of this feature would just re-summarise the latest session. The prompt explicitly forbids that ("not just the most recent one," "not a restatement of the last session alone") and feeds in the full chronological review history so the model has to find an actual trend rather than paraphrasing one data point.

### Failure handling

All three AI calls are wrapped so a Gemini outage never corrupts state: the network call happens **before** any database transaction opens, so a slow or failed request never holds a row lock; if it fails, the endpoint returns `502` with a clear message and the session/student data is left exactly as it was, retryable at any time. The frontend surfaces this as a dismissible error card with a "Try again" button rather than a crash.

---

## API Overview

All endpoints under `/api/v1/`. Auth via httpOnly cookies (`tf_access`, `tf_refresh`), set automatically on login.

| Area | Endpoint | Notes |
|---|---|---|
| Auth | `POST /auth/login/`, `/refresh/`, `/logout/`, `GET /auth/me/` | |
| Auth | `POST /auth/password-reset/`, `/password-reset/confirm/` | console-email based |
| Students (tutor) | `GET/POST /students/`, `GET/PATCH/DELETE /students/{id}/` | paginated list |
| Students (tutor) | `POST /students/{id}/progress-summary/` | AI, aggregate |
| Sessions (tutor) | `GET/POST /sessions/`, `GET/PATCH/DELETE /sessions/{id}/` | paginated, `?student=` filter |
| Sessions (tutor) | `PATCH /sessions/{id}/notes/` | autosave |
| Sessions (tutor) | `POST /sessions/{id}/start/`, `/complete/` | state transitions |
| Sessions (tutor) | `POST /sessions/{id}/ai-plan/`, `/ai-review/` | AI |
| Sessions (student) | `GET /sessions/my-sessions/`, `/my-sessions/{id}/` | read-only, self-scoped |

---

## Test Logins

> Replace with your actual deployed test accounts before submitting.

| Role | Email | Password |
|---|---|---|
| Tutor | `tutor@example.com` | `TutorPass123` |
| Student | `student@example.com` | `StudentPass123` |

---

## Running Locally

**Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt --break-system-packages
python manage.py migrate
python manage.py runserver
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

Environment variables required (see `.env.example` in each folder): `DATABASE_URL`, `SECRET_KEY`, `GEMINI_API_KEY`, `ALLOWED_HOSTS`, `FRONTEND_URL` (backend); `VITE_API_BASE_URL` (frontend).

---

## What I'd Build Next

With another day, session rescheduling would be the first addition, since the backend already supports it but the frontend dialog was never built. Real email delivery (Resend or SendGrid) would replace the console-based password reset and would also unlock the bonus feature of notifying a student when a session is scheduled. I'd add an automated test suite covering the state machine transitions and the ownership-isolation checks specifically, since those are the two areas where a silent regression would be most damaging. A calendar view of a tutor's week would make scheduling clashes visible before they happen rather than only being caught on save. Finally, I'd add a lightweight retry-with-backoff around the Gemini calls, since right now a failed AI call requires the tutor to manually click "try again" rather than the app quietly retrying once on their behalf.