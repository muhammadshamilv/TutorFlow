from rest_framework.permissions import BasePermission


class IsTutor(BasePermission):
    """
    Grants access only to authenticated users with role='tutor'.
    Used on every tutor-only endpoint (student management, scheduling,
    AI plan/review triggers, etc). This is checked on the server on
    every request — the frontend hiding a button is not access control.
    """

    message = "This action is only available to tutor accounts."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_tutor
        )


class IsStudent(BasePermission):
    """
    Grants access only to authenticated users with role='student'.
    """

    message = "This action is only available to student accounts."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_student
        )
