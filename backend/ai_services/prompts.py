"""
Prompt construction for all three AI features.

Design principle used throughout: never send the AI a bare instruction
like "generate a lesson plan." Every prompt below is built from the
actual student profile (subject, level, goals, weak areas) and actual
session history (past topics, past notes, past AI reviews), because
that context is what makes the output usable for THIS student rather
than a generic template. This directly follows the brief's scoring
note that prompt quality is judged on whether it "ignores everything
you know about the student."
"""


# ---------------------------------------------------------------------------
# JSON schemas — force Gemini's output into a predictable shape.
# ---------------------------------------------------------------------------

SESSION_PLAN_SCHEMA = {
    "type": "object",
    "properties": {
        "learning_objectives": {
            "type": "array",
            "items": {"type": "string"},
            "description": "2-4 specific, measurable objectives for this session.",
        },
        "lesson_outline": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Exactly four sequential points covering how the session should flow.",
        },
        "practice_questions": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Exactly three practice questions targeting the student's stated weak areas.",
        },
    },
    "required": ["learning_objectives", "lesson_outline", "practice_questions"],
}

SESSION_REVIEW_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {
            "type": "string",
            "description": "A concise summary of what was covered and how the student performed in this session.",
        },
        "homework_tasks": {
            "type": "array",
            "items": {"type": "string"},
            "description": "2-3 concrete homework tasks that reinforce what was covered.",
        },
        "next_session_suggestion": {
            "type": "string",
            "description": "One specific, actionable suggestion for what to cover in the next session.",
        },
    },
    "required": ["summary", "homework_tasks", "next_session_suggestion"],
}

PROGRESS_SUMMARY_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {
            "type": "string",
            "description": (
                "A short paragraph (4-6 sentences) describing where the student "
                "is improving and where they still struggle, based on the "
                "history of session reviews provided."
            ),
        },
    },
    "required": ["summary"],
}


def _format_student_profile(student) -> str:
    return (
        f"Subject: {student.subject}\n"
        f"Current level: {student.current_level}\n"
        f"Learning goals: {student.learning_goals or 'Not specified.'}\n"
        f"Known weak areas: {student.weak_areas or 'Not specified.'}"
    )


def _format_past_sessions(sessions, limit: int = 5) -> str:
    """
    Formats the student's most recent past sessions (topic + notes) as
    context. Capped at `limit` to keep the prompt focused and avoid
    unbounded token growth for students with a long history.
    """
    if not sessions:
        return "No past sessions on record yet — this is one of the student's first sessions."

    lines = []
    for session in sessions[:limit]:
        notes_excerpt = (session.notes or "No notes recorded.").strip()
        lines.append(f"- {session.topic} ({session.status}): {notes_excerpt}")
    return "\n".join(lines)


def build_session_plan_prompt(*, student, upcoming_session, past_sessions) -> str:
    """
    Plan prompt: read before a session starts. Uses the student's
    profile plus their recent session history so the plan builds on
    what actually happened last time, rather than starting from zero
    every session.
    """
    return f"""You are an experienced, encouraging private tutor preparing for an upcoming one-to-one session.

STUDENT PROFILE
{_format_student_profile(student)}

UPCOMING SESSION TOPIC
{upcoming_session.topic}

RECENT SESSION HISTORY (most recent first)
{_format_past_sessions(past_sessions)}

TASK
Create a session plan for the upcoming session on "{upcoming_session.topic}" that is
specifically tailored to this student's level and weak areas, and that builds on
what was covered in their recent sessions where relevant. Do not produce a generic
lesson plan that could apply to any student — reference their specific weak areas
and goals directly in the objectives and practice questions.

Return:
1. learning_objectives: 2-4 specific, measurable objectives for this session.
2. lesson_outline: exactly four sequential points describing how the session should flow from start to finish.
3. practice_questions: exactly three practice questions that directly target this student's known weak areas at their current level.
"""


def build_session_review_prompt(*, student, completed_session) -> str:
    """
    Review prompt: read after a session ends. Uses the actual notes the
    tutor wrote during the session plus the student's profile, so the
    homework and suggestion are grounded in what really happened, not
    a generic recap.
    """
    notes = (completed_session.notes or "").strip() or "No notes were recorded for this session."

    return f"""You are an experienced, encouraging private tutor writing up a session summary
immediately after a one-to-one session has ended.

STUDENT PROFILE
{_format_student_profile(student)}

SESSION TOPIC
{completed_session.topic}

TUTOR'S RAW NOTES FROM THIS SESSION
{notes}

TASK
Based on the tutor's raw notes above and the student's known profile, write a
review of this specific session. Be concrete and reference details from the
notes rather than writing generic feedback. If the notes mention a specific
mistake or breakthrough, reflect it in the summary and homework.

Return:
1. summary: a concise summary of what was covered and how the student performed, grounded in the notes above.
2. homework_tasks: 2-3 concrete homework tasks that reinforce what was covered in this specific session.
3. next_session_suggestion: one specific, actionable suggestion for what to focus on next time, based on what this session revealed.
"""


def build_progress_summary_prompt(*, student, reviewed_sessions) -> str:
    """
    Progress summary prompt: reads every past AI review for a student
    (not just the most recent one) to identify a trend over time,
    rather than restating a single session's feedback.
    """
    if not reviewed_sessions:
        review_history = "No AI-reviewed sessions yet."
    else:
        lines = []
        for session in reviewed_sessions:
            review = session.ai_review or {}
            lines.append(
                f"- {session.topic}: {review.get('summary', 'No summary available.')}"
            )
        review_history = "\n".join(lines)

    return f"""You are an experienced private tutor writing a progress overview for a student
you have been teaching one-to-one over multiple sessions.

STUDENT PROFILE
{_format_student_profile(student)}

HISTORY OF PAST SESSION REVIEWS (chronological)
{review_history}

TASK
Looking across ALL of the session reviews above as a trend (not just the most
recent one), write a short paragraph describing where this student is
genuinely improving and where they continue to struggle. Be specific about
patterns you notice across multiple sessions, not a restatement of the last
session alone.

Return:
1. summary: a 4-6 sentence paragraph on the student's overall trajectory, referencing specific recurring themes from the review history above.
"""
