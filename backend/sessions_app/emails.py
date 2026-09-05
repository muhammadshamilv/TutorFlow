import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_session_scheduled_email(session) -> None:
    """
    Notifies the student by email that their tutor has scheduled a new
    session. This is a "nice to have" side effect of scheduling, not a
    core part of it — if the email fails to send (bad SMTP config,
    network issue, etc), the session must still be created successfully.
    The caller is expected to swallow any exception from this function
    for that reason; it never raises to the caller by design.
    """
    student_user = session.student.user

    start_display = session.scheduled_start.strftime("%A, %d %B %Y at %I:%M %p")

    try:
        send_mail(
            subject="New TutorFlow session scheduled",
            message=(
                f"Hi {student_user.first_name},\n\n"
                f"Your tutor has scheduled a new session with you.\n\n"
                f"Topic: {session.topic}\n"
                f"When: {start_display}\n\n"
                f"Log in to TutorFlow to see the details."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[student_user.email],
        )
    except Exception:  # noqa: BLE001 - notification only, must never break scheduling
        logger.exception(
            "Failed to send session-scheduled email to %s for session %s",
            student_user.email,
            session.id,
        )
