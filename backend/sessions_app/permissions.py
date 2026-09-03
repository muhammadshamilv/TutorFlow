from rest_framework.permissions import BasePermission


class IsOwningTutorOfSession(BasePermission):
    """
    Object-level check: the requesting user must be the tutor who owns
    this Session. Mirrors students.permissions.IsOwningTutor.
    """

    message = "You do not have access to this session."

    def has_object_permission(self, request, view, obj):
        return obj.tutor_id == request.user.id
