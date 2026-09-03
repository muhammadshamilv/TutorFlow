from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ai_services.gemini_client import AIServiceError
from ai_services.serializers import SessionPlanResponseSerializer, SessionReviewResponseSerializer
from ai_services.services import generate_session_plan, generate_session_review
from users.permissions import IsStudent, IsTutor

from .models import Session, SessionStatus
from .permissions import IsOwningTutorOfSession
from .serializers import (
    SessionCreateSerializer,
    SessionNotesSerializer,
    SessionRescheduleSerializer,
    SessionSerializer,
    StudentSessionSerializer,
)


class SessionViewSet(viewsets.ModelViewSet):
    """
    Tutor-only session management.

    Standard REST actions handle scheduling (create), viewing
    (list/retrieve), and rescheduling a not-yet-started session
    (update/partial_update, delegated to SessionRescheduleSerializer).

    State transitions are deliberately NOT done through PATCH on
    `status` directly — they're separate POST actions
    (`start`, `complete`, `ai-review`) so each transition can carry its
    own validation and can never be combined with an unrelated field
    edit in the same request. This is what makes "no skipping states"
    provable: there is no code path that writes an arbitrary status
    value.
    """

    permission_classes = [IsAuthenticated, IsTutor, IsOwningTutorOfSession]

    def get_queryset(self):
        return (
            Session.objects.select_related("student__user", "tutor")
            .filter(tutor=self.request.user)
        )

    def get_serializer_class(self):
        if self.action == "create":
            return SessionCreateSerializer
        if self.action in ("update", "partial_update"):
            return SessionRescheduleSerializer
        if self.action == "notes":
            return SessionNotesSerializer
        return SessionSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != SessionStatus.SCHEDULED:
            return Response(
                {
                    "error": {
                        "detail": "Only sessions that have not started can be cancelled.",
                        "fields": None,
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    # -----------------------------------------------------------------
    # Notes autosave
    # -----------------------------------------------------------------

    @action(detail=True, methods=["patch"], url_path="notes")
    def notes(self, request, pk=None):
        session = self.get_object()
        serializer = self.get_serializer(session, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    # -----------------------------------------------------------------
    # State transitions — one explicit, atomic action per transition
    # -----------------------------------------------------------------

    def _transition(self, session, target_status):
        """
        Shared transition logic: locks the row, re-checks the current
        status against ALLOWED_TRANSITIONS, and only then writes. The
        `select_for_update` plus re-check inside the transaction is
        what makes this safe against two rapid duplicate clicks/requests
        racing each other.
        """
        with transaction.atomic():
            locked_session = Session.objects.select_for_update().get(pk=session.pk)

            if not locked_session.can_transition_to(target_status):
                return None, Response(
                    {
                        "error": {
                            "detail": (
                                f"Cannot move a session from "
                                f"'{locked_session.get_status_display()}' to "
                                f"'{SessionStatus(target_status).label}'."
                            ),
                            "fields": None,
                        }
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            locked_session.status = target_status
            locked_session.save(update_fields=["status", "updated_at"])
            return locked_session, None

    @action(detail=True, methods=["post"], url_path="start")
    def start(self, request, pk=None):
        session = self.get_object()
        updated, error_response = self._transition(session, SessionStatus.IN_PROGRESS)
        if error_response:
            return error_response
        return Response(SessionSerializer(updated).data)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        session = self.get_object()
        updated, error_response = self._transition(session, SessionStatus.COMPLETED)
        if error_response:
            return error_response
        return Response(SessionSerializer(updated).data)

    # -----------------------------------------------------------------
    # AI features
    # -----------------------------------------------------------------

    @action(detail=True, methods=["post"], url_path="ai-plan")
    def ai_plan(self, request, pk=None):
        """
        Generates (or regenerates) an AI session plan. Allowed only
        while the session is still 'scheduled' — planning happens
        before the session starts. Does not change session status.
        """
        session = self.get_object()
        if session.status != SessionStatus.SCHEDULED:
            return Response(
                {
                    "error": {
                        "detail": "AI plans can only be generated for sessions that haven't started yet.",
                        "fields": None,
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            updated = generate_session_plan(session)
        except AIServiceError as exc:
            return Response(
                {"error": {"detail": str(exc), "fields": None}},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(SessionPlanResponseSerializer(updated).data)

    @action(detail=True, methods=["post"], url_path="ai-review")
    def ai_review(self, request, pk=None):
        """
        Generates an AI review for a completed session and transitions
        it to 'ai_reviewed'. This is the ONLY code path that can move a
        session into 'ai_reviewed' — it happens as a direct consequence
        of a successful AI call, never as a bare status write.
        """
        session = self.get_object()
        if session.status != SessionStatus.COMPLETED:
            return Response(
                {
                    "error": {
                        "detail": "A session must be completed before it can be AI reviewed.",
                        "fields": None,
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            updated = generate_session_review(session)
        except AIServiceError as exc:
            return Response(
                {"error": {"detail": str(exc), "fields": None}},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except ValueError as exc:
            return Response(
                {"error": {"detail": str(exc), "fields": None}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(SessionReviewResponseSerializer(updated).data)


class MySessionsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Student-only, read-only access to the logged-in student's own
    sessions. Deliberately a separate viewset from SessionViewSet
    (rather than branching by role inside one class) so a student can
    never accidentally reach a tutor write action — there simply are
    no write methods on ReadOnlyModelViewSet, and the queryset is
    scoped to `student__user=request.user`, so one student can never
    see another student's sessions even by guessing an ID.
    """

    permission_classes = [IsAuthenticated, IsStudent]
    serializer_class = StudentSessionSerializer

    def get_queryset(self):
        return (
            Session.objects.select_related("student__user", "tutor")
            .filter(student__user=self.request.user)
        )
