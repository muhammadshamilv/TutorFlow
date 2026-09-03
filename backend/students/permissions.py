from rest_framework.permissions import BasePermission


class IsOwningTutor(BasePermission):
    """
    Object-level check: the requesting user must be the tutor who owns
    this Student. Combined with IsTutor (checked at the view level) so
    that only tutors reach here in the first place, and this then stops
    one tutor from reading/editing another tutor's student by guessing
    an ID.
    """

    message = "You do not have access to this student."

    def has_object_permission(self, request, view, obj):
        return obj.tutor_id == request.user.id
