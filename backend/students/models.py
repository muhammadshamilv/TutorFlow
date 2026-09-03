import uuid

from django.conf import settings
from django.db import models


class Student(models.Model):
    """
    A student profile, always owned by exactly one tutor and always
    linked to exactly one User account (role='student') for login.

    This profile is what the AI reads for every prompt (plan, review,
    progress summary), so subject/level/goals/weak_areas must stay
    accurate and available before any AI feature is called.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    tutor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="students",
        limit_choices_to={"role": "tutor"},
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="student_profile",
        limit_choices_to={"role": "student"},
    )

    subject = models.CharField(max_length=150)
    current_level = models.CharField(
        max_length=50,
        help_text="E.g. Beginner, Intermediate, Grade 10, IELTS Band 5, etc.",
    )
    learning_goals = models.TextField(blank=True)
    weak_areas = models.TextField(
        blank=True,
        help_text="Free text. Read directly by the AI when generating plans and reviews.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "students"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.full_name} ({self.subject}) — tutor: {self.tutor.email}"
