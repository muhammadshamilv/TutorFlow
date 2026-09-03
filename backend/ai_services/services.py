from django.db import transaction
from django.utils import timezone

from sessions_app.models import Session, SessionStatus

from .gemini_client import AIServiceError, generate_structured_json
from .prompts import (
    PROGRESS_SUMMARY_SCHEMA,
    SESSION_PLAN_SCHEMA,
    SESSION_REVIEW_SCHEMA,
    build_progress_summary_prompt,
    build_session_plan_prompt,
    build_session_review_prompt,
)

__all__ = [
    "AIServiceError",
    "generate_session_plan",
    "generate_session_review",
    "generate_progress_summary",
]


def _recent_sessions_for(student, exclude_id=None, limit=5):
    qs = Session.objects.filter(student=student).order_by("-scheduled_start")
    if exclude_id:
        qs = qs.exclude(id=exclude_id)
    return list(qs[:limit])


def generate_session_plan(session: Session) -> Session:
    """
    Generates an AI plan for a session that has not started yet.
    Does NOT change session.status — the plan is prep material, not a
    lifecycle transition. Safe to call multiple times (regenerates and
    overwrites the previous plan).
    """
    student = session.student
    past_sessions = _recent_sessions_for(student, exclude_id=session.id)

    prompt = build_session_plan_prompt(
        student=student,
        upcoming_session=session,
        past_sessions=past_sessions,
    )

    result = generate_structured_json(
        prompt=prompt,
        response_schema=SESSION_PLAN_SCHEMA,
    )

    session.ai_plan = result
    session.ai_plan_generated_at = timezone.now()
    session.save(update_fields=["ai_plan", "ai_plan_generated_at", "updated_at"])
    return session


def generate_session_review(session: Session) -> Session:
    """
    Generates an AI review for a completed session, and — only on
    success — transitions the session to 'ai_reviewed'. If the AI call
    fails, the session remains 'completed' and can be retried; it is
    never left in an inconsistent state because the status write and
    the review write happen together in one transaction after the AI
    call has already succeeded.
    """
    if session.status != SessionStatus.COMPLETED:
        raise ValueError("A session must be completed before it can be AI reviewed.")

    student = session.student
    prompt = build_session_review_prompt(student=student, completed_session=session)

    # AI call happens BEFORE the transaction opens, so a slow/failed
    # network call never holds a DB row lock.
    result = generate_structured_json(
        prompt=prompt,
        response_schema=SESSION_REVIEW_SCHEMA,
    )

    with transaction.atomic():
        locked_session = Session.objects.select_for_update().get(pk=session.pk)
        if not locked_session.can_transition_to(SessionStatus.AI_REVIEWED):
            # Extremely unlikely race (e.g. deleted mid-request), but
            # guarantees we never silently write a review onto a
            # session whose state has moved since we read it.
            raise ValueError("This session is no longer eligible for an AI review.")

        locked_session.ai_review = result
        locked_session.ai_review_generated_at = timezone.now()
        locked_session.status = SessionStatus.AI_REVIEWED
        locked_session.save(
            update_fields=["ai_review", "ai_review_generated_at", "status", "updated_at"]
        )

    return locked_session


def generate_progress_summary(student) -> dict:
    """
    Reads every AI-reviewed session for this student and asks the AI to
    identify a trend across all of them. Read-only — does not persist
    anything, since a progress summary is a point-in-time report the
    tutor can regenerate at will.
    """
    reviewed_sessions = list(
        Session.objects.filter(student=student, status=SessionStatus.AI_REVIEWED).order_by(
            "scheduled_start"
        )
    )

    prompt = build_progress_summary_prompt(student=student, reviewed_sessions=reviewed_sessions)

    return generate_structured_json(
        prompt=prompt,
        response_schema=PROGRESS_SUMMARY_SCHEMA,
    )
