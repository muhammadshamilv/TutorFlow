from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from users.permissions import IsTutor

from .models import Student
from .permissions import IsOwningTutor
from .serializers import StudentCreateSerializer, StudentSerializer, StudentUpdateSerializer


class StudentViewSet(viewsets.ModelViewSet):
    """
    Tutor-only CRUD for student profiles.

    - list/retrieve/update/destroy are scoped to students owned by the
      requesting tutor, enforced both by the queryset (so a student
      belonging to another tutor never appears in a list) and by an
      object-level permission (so it can't be reached directly by ID
      either).
    - create builds the student's login account and profile together.
    """

    permission_classes = [IsAuthenticated, IsTutor, IsOwningTutor]

    def get_queryset(self):
        return (
            Student.objects.select_related("user", "tutor")
            .filter(tutor=self.request.user)
        )

    def get_serializer_class(self):
        if self.action == "create":
            return StudentCreateSerializer
        if self.action in ("update", "partial_update"):
            return StudentUpdateSerializer
        return StudentSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context
