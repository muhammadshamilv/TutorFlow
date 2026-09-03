from rest_framework import serializers

from students.models import Student

from .models import Session, SessionStatus


class SessionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.full_name", read_only=True)

    class Meta:
        model = Session
        fields = [
            "id",
            "tutor",
            "student",
            "student_name",
            "topic",
            "scheduled_start",
            "scheduled_end",
            "status",
            "notes",
            "ai_plan",
            "ai_plan_generated_at",
            "ai_review",
            "ai_review_generated_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "tutor",
            "status",
            "ai_plan",
            "ai_plan_generated_at",
            "ai_review",
            "ai_review_generated_at",
            "created_at",
            "updated_at",
        ]


def _check_clash(tutor, student_field_start, student_field_end, exclude_id=None):
    """
    Shared clash check: this tutor cannot have two sessions whose time
    ranges overlap. Two ranges [a_start, a_end) and [b_start, b_end)
    overlap iff a_start < b_end AND b_start < a_end.
    """
    qs = Session.objects.filter(tutor=tutor).exclude(status=SessionStatus.AI_REVIEWED)
    if exclude_id:
        qs = qs.exclude(id=exclude_id)

    clash = qs.filter(
        scheduled_start__lt=student_field_end,
        scheduled_end__gt=student_field_start,
    ).exists()

    if clash:
        raise serializers.ValidationError(
            {"scheduled_start": "You already have a session scheduled that overlaps this time."}
        )


class SessionCreateSerializer(serializers.ModelSerializer):
    """
    Scheduling a new session. Validates:
    - the student belongs to the requesting tutor
    - no time-overlap with another of this tutor's sessions
    - end time is after start time (also enforced by model.clean())
    """

    class Meta:
        model = Session
        fields = ["student", "topic", "scheduled_start", "scheduled_end"]

    def validate_student(self, value):
        tutor = self.context["request"].user
        if value.tutor_id != tutor.id:
            raise serializers.ValidationError("You can only schedule sessions for your own students.")
        return value

    def validate(self, attrs):
        if attrs["scheduled_end"] <= attrs["scheduled_start"]:
            raise serializers.ValidationError(
                {"scheduled_end": "End time must be after the start time."}
            )
        return attrs

    def create(self, validated_data):
        tutor = self.context["request"].user
        _check_clash(tutor, validated_data["scheduled_start"], validated_data["scheduled_end"])
        return Session.objects.create(tutor=tutor, **validated_data)

    def to_representation(self, instance):
        return SessionSerializer(instance).data


class SessionRescheduleSerializer(serializers.ModelSerializer):
    """
    Editing topic/time of a session that is still 'scheduled'. Once a
    session has moved past 'scheduled', it cannot be edited this way —
    enforced in the view via `session.is_locked()` plus an explicit
    status check, not just relying on the frontend to hide the button.
    """

    class Meta:
        model = Session
        fields = ["topic", "scheduled_start", "scheduled_end"]

    def validate(self, attrs):
        instance = self.instance
        if instance.status != SessionStatus.SCHEDULED:
            raise serializers.ValidationError(
                "Only sessions that have not started yet can be rescheduled."
            )

        new_start = attrs.get("scheduled_start", instance.scheduled_start)
        new_end = attrs.get("scheduled_end", instance.scheduled_end)
        if new_end <= new_start:
            raise serializers.ValidationError(
                {"scheduled_end": "End time must be after the start time."}
            )
        return attrs

    def update(self, instance, validated_data):
        new_start = validated_data.get("scheduled_start", instance.scheduled_start)
        new_end = validated_data.get("scheduled_end", instance.scheduled_end)
        _check_clash(instance.tutor, new_start, new_end, exclude_id=instance.id)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

    def to_representation(self, instance):
        return SessionSerializer(instance).data


class SessionNotesSerializer(serializers.ModelSerializer):
    """
    Autosave endpoint payload — notes only. Rejected once the session
    is locked (completed or ai_reviewed).
    """

    class Meta:
        model = Session
        fields = ["notes"]

    def validate(self, attrs):
        if self.instance.is_locked():
            raise serializers.ValidationError(
                "Notes cannot be edited once a session is completed."
            )
        return attrs

    def to_representation(self, instance):
        return SessionSerializer(instance).data
