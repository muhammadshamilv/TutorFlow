import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class SessionStatus(models.TextChoices):
    SCHEDULED = "scheduled", "Scheduled"
    IN_PROGRESS = "in_progress", "In progress"
    COMPLETED = "completed", "Completed"
    AI_REVIEWED = "ai_reviewed", "AI reviewed"


# The only transitions allowed, in order. Enforced in both the model
# (defense in depth, in case something bypasses the serializer) and the
# serializer/view layer (where the actual API decisions happen).
ALLOWED_TRANSITIONS = {
    SessionStatus.SCHEDULED: {SessionStatus.IN_PROGRESS},
    SessionStatus.IN_PROGRESS: {SessionStatus.COMPLETED},
    SessionStatus.COMPLETED: {SessionStatus.AI_REVIEWED},
    SessionStatus.AI_REVIEWED: set(),  # terminal state, nothing after it
}


class Session(models.Model):
    """
    A single tutoring session between a tutor and one of their students.

    Lifecycle (strictly forward-only):
        scheduled -> in_progress -> completed -> ai_reviewed

    Once status is 'completed' or 'ai_reviewed', `notes` becomes
    read-only at the model level (enforced in `save`) — the only
    allowed change after completion is the AI review transition itself,
    which is handled by a separate service (ai_services) that does not
    touch `notes`.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    tutor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sessions",
        limit_choices_to={"role": "tutor"},
    )
    student = models.ForeignKey(
        "students.Student",
        on_delete=models.CASCADE,
        related_name="sessions",
    )

    topic = models.CharField(max_length=255)
    scheduled_start = models.DateTimeField()
    scheduled_end = models.DateTimeField()

    status = models.CharField(
        max_length=20,
        choices=SessionStatus.choices,
        default=SessionStatus.SCHEDULED,
    )

    notes = models.TextField(blank=True)

    # --- AI-generated content -------------------------------------------------
    # Stored as structured JSON so the frontend can render it without
    # re-parsing free text, and so a progress summary can later read
    # every past review's fields directly instead of re-prompting the
    # AI to re-derive them from raw notes.
    ai_plan = models.JSONField(null=True, blank=True)
    ai_plan_generated_at = models.DateTimeField(null=True, blank=True)

    ai_review = models.JSONField(null=True, blank=True)
    ai_review_generated_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "sessions"
        ordering = ["-scheduled_start"]
        indexes = [
            models.Index(fields=["tutor", "scheduled_start"]),
            models.Index(fields=["student", "scheduled_start"]),
        ]

    def __str__(self):
        return f"{self.student.user.full_name} — {self.topic} ({self.status})"

    def clean(self):
        if self.scheduled_end <= self.scheduled_start:
            raise ValidationError("Session end time must be after the start time.")

    def is_locked(self):
        """
        Notes and core fields become read-only once a session is
        completed. The only further action permitted is the AI review.
        """
        return self.status in (SessionStatus.COMPLETED, SessionStatus.AI_REVIEWED)

    def can_transition_to(self, new_status):
        return new_status in ALLOWED_TRANSITIONS.get(self.status, set())
