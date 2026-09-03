from rest_framework import serializers


class SessionPlanResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    status = serializers.CharField()
    ai_plan = serializers.JSONField()
    ai_plan_generated_at = serializers.DateTimeField()


class SessionReviewResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    status = serializers.CharField()
    ai_review = serializers.JSONField()
    ai_review_generated_at = serializers.DateTimeField()


class ProgressSummaryResponseSerializer(serializers.Serializer):
    summary = serializers.CharField()
