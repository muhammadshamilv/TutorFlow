# TutorFlow

A session platform for online tutors who teach students one to one. A tutor can add students, schedule sessions, take notes during a session, and use AI to plan the session before it starts and summarise it afterwards. A student can log in and see their upcoming sessions, their past session notes, and the homework the AI generated for them.

---

## Live URL

_add your deployed URL here_

## GitHub Repository

_add your repository link here_

## Test Logins

| Role | Email | Password |
|---|---|---|
| Tutor | `tutor@tutorflow.com` | `Tutor@123` |
| Student | `student@tutorflow.com` | `Student@123` |

---

## Tech Stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Zod, React Hook Form, Jotai, Context API, React Router, Axios

**Backend:** Python, Django, Django REST Framework, PostgreSQL (Supabase), Gemini (`google-genai`)

---

## Database Structure

Four tables in PostgreSQL.

### `users`
Tutor accounts and student accounts share one table. A `role` field (`tutor` or `student`) is checked on every request on the server, not just in the interface.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `email` | varchar, unique | login |
| `password` | varchar | hashed |
| `first_name` / `last_name` | varchar | |
| `role` | varchar | `tutor` or `student` |
| `created_at` / `updated_at` | timestamp | |

### `students`
The student profile — name, subject, current level, learning goals, and weak areas, as required. Weak areas is free text and is what the AI reads.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `tutor_id` | UUID → `users.id` | which tutor owns this student |
| `user_id` | UUID → `users.id` | the student's own login account |
| `subject` | varchar | |
| `current_level` | varchar | |
| `learning_goals` | text | |
| `weak_areas` | text | free text, read directly by the AI |

### `sessions`
One row per session, carrying the lifecycle state.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `tutor_id` | UUID → `users.id` | |
| `student_id` | UUID → `students.id` | |
| `topic` | varchar | |
| `scheduled_start` / `scheduled_end` | timestamp | used to check for clashes |
| `status` | varchar | `scheduled` / `in_progress` / `completed` / `ai_reviewed` |
| `notes` | text | locked once the session is completed |
| `ai_plan` | jsonb | the generated session plan |
| `ai_review` | jsonb | the generated session review |

### `password_reset_otps`
Stores the 6-digit code used for the forgot-password flow.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `user_id` | UUID → `users.id` | |
| `code_hash` | varchar | code is hashed, not stored in plain text |
| `attempts` | smallint | |
| `is_used` | bool | |
| `expires_at` | timestamp | |

### How the tables relate

- One tutor → many students (`students.tutor_id`)
- One student profile → one login account (`students.user_id`)
- One tutor → many sessions (`sessions.tutor_id`)
- One student → many sessions (`sessions.student_id`)

A single `users` table with a `role` field was used instead of separate tutor and student tables, since both need the same login system and only differ in what they are allowed to do, which is an access rule rather than a difference in data.

---

## The Session Lifecycle

```
Scheduled → In progress → Completed → AI reviewed
```

Every session moves through these states in order and cannot skip one — for example it cannot go from Scheduled straight to AI reviewed. This is enforced on the server: each move (start, complete) is its own action, and the AI review action is the only thing that can move a session into the final state, so it can never reach "AI reviewed" without an actual review being generated. Once a session is Completed, its notes cannot be edited — only the AI review can be triggered.

A tutor also cannot have two sessions scheduled at the same time; this is checked before saving.

---

## AI Prompts

Two external services are used: **Gemini** for AI and **PostgreSQL (Supabase)** for the database.

Each prompt below sends the student's profile and session history to the AI, rather than a bare instruction, so the output is specific to that student instead of generic.

### 1. AI Session Plan

Sent before a session starts. Includes the student's subject, level, goals, and weak areas, plus their recent past sessions and notes.

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
{up to 5 past sessions: topic, status, and the tutor's notes}

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

**Why written this way:** a prompt that only says "generate a lesson plan" ignores everything known about the student, which is exactly what this task warns scores low. This prompt makes the weak areas and goals unavoidable by putting them directly in the instructions, and includes past session notes so the plan builds on what already happened instead of starting from nothing each time.

### 2. AI Session Review

Sent after a session is marked Completed. Includes the student's profile and the tutor's actual notes from that session.

```
You are an experienced, encouraging private tutor writing up a session summary
immediately after a one-to-one session has ended.

STUDENT PROFILE
{same profile block as above}

SESSION TOPIC
{topic}

TUTOR'S RAW NOTES FROM THIS SESSION
{the tutor's actual notes}

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

**Why written this way:** the notes are the only record of what actually happened in the session, so they are sent to the AI word for word, and the instructions explicitly ask for specific details from them. Without this, the review would just be a generic restatement of the topic name.

### 3. AI Progress Summary

Sent when the tutor opens a student and asks for a progress summary. Sends every past AI review for that student, not just the latest one.

```
You are an experienced private tutor writing a progress overview for a student
you have been teaching one-to-one over multiple sessions.

STUDENT PROFILE
{profile block}

HISTORY OF PAST SESSION REVIEWS (chronological)
{every past AI-reviewed session's topic and summary}

TASK
Looking across ALL of the session reviews above as a trend (not just the most
recent one), write a short paragraph describing where this student is genuinely
improving and where they continue to struggle. Be specific about patterns you
notice across multiple sessions, not a restatement of the last session alone.

Return:
1. summary — a 4-6 sentence paragraph referencing recurring themes.
```

**Why written this way:** this feature is meant to show a trend over time, so the prompt sends the full review history and explicitly tells the AI not to just repeat the most recent session, which is the mistake a simpler prompt would make.

### Handling AI Failures

If the AI call fails, the app does not break. The request to the AI happens before anything is saved, so a failed call leaves the session or student exactly as it was, and the tutor sees a clear error message with the option to try again.

---

## Bonus: Email on Scheduling

When a tutor schedules a session, the student is emailed a notification via real Gmail SMTP. The test student account does not use a real inbox, so this cannot be seen directly — to check it, add a new student using your own email address, then schedule a session for them. If sending fails for any reason, scheduling still succeeds; the failure is only logged.

---

## What I'd Build Next

With another day, I would add a way to reschedule a session that is still in the Scheduled state, since right now a tutor would need to cancel and create a new one. I would write automated tests for the session state transitions and for the rule that one tutor cannot see another tutor's data, since those are the two things most likely to break silently later. I would add a calendar view so a tutor can see clashes visually instead of only being told about them when saving. I would make a failed AI call retry once automatically before showing an error, so a brief network issue does not require the tutor to click again themselves. Finally, I would add a way for a tutor to update a student's email if they made a typo when creating the account, since there is currently no way to correct it afterward.
