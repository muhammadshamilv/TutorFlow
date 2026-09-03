from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.permissions import IsTutor

from .models import Session, SessionStatus
from .permissions import IsOwningTutorOfSession
from .serializers import (
    SessionCreateSerializer,
    SessionNotesSerializer,
    SessionRescheduleSerializer,
    SessionSerializer,
)


class SessionViewSet(viewsets.ModelViewSet):
    """
    Tutor-only session management.

    Standard REST actions handle scheduling (create), viewing
    (list/retrieve), and rescheduling a not-yet-started session
    (update/partial_update, delegated to SessionRescheduleSerializer).

    State transitions are deliberately NOT done through PATCH on
    `status` directly — they're separate POST actions
    (`start`, `complete`) so each transition can carry its own
    validation and can never be combined with an unrelated field edit
    in the same request. This is what makes "no skipping states"
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
        racing each other (both would otherwise read 'scheduled' and
        both try to move to 'in_progress').
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

    # Note: the transition to 'ai_reviewed' is intentionally NOT here.
    # It is triggered from ai_services (Phase 7) after a successful AI
    # call, so a session can never reach 'ai_reviewed' without an
    # actual AI review having been generated and stored.
