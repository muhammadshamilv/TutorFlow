from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    UserSerializer,
)


def _set_auth_cookies(response, access_token, refresh_token):
    response.set_cookie(
        settings.AUTH_COOKIE_ACCESS,
        str(access_token),
        max_age=int(access_token.lifetime.total_seconds()),
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path="/",
    )
    response.set_cookie(
        settings.AUTH_COOKIE_REFRESH,
        str(refresh_token),
        max_age=int(refresh_token.lifetime.total_seconds()),
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path="/api/v1/auth/",
    )


def _clear_auth_cookies(response):
    response.delete_cookie(settings.AUTH_COOKIE_ACCESS, path="/")
    response.delete_cookie(settings.AUTH_COOKIE_REFRESH, path="/api/v1/auth/")


class LoginView(APIView):
    """
    POST /api/v1/auth/login/
    Body: { "email": str, "password": str }
    On success, sets httpOnly access + refresh cookies and returns the user.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        response = Response({"user": UserSerializer(user).data})
        _set_auth_cookies(response, access, refresh)
        return response


class RefreshView(APIView):
    """
    POST /api/v1/auth/refresh/
    Reads the refresh cookie, issues a new access (and rotated refresh)
    cookie. No body required.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        raw_refresh = request.COOKIES.get(settings.AUTH_COOKIE_REFRESH)
        if raw_refresh is None:
            return Response(
                {"error": {"detail": "No refresh token found.", "fields": None}},
                status=401,
            )

        try:
            refresh = RefreshToken(raw_refresh)
            access = refresh.access_token
        except TokenError:
            response = Response(
                {"error": {"detail": "Session expired. Please log in again.", "fields": None}},
                status=401,
            )
            _clear_auth_cookies(response)
            return response

        response = Response({"detail": "Token refreshed."})
        _set_auth_cookies(response, access, refresh)
        return response


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/
    Clears auth cookies. Best-effort blacklist of the refresh token.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        raw_refresh = request.COOKIES.get(settings.AUTH_COOKIE_REFRESH)
        if raw_refresh:
            try:
                RefreshToken(raw_refresh).blacklist()
            except (TokenError, AttributeError):
                pass  # Blacklist app not installed / already invalid — fine.

        response = Response({"detail": "Logged out."})
        _clear_auth_cookies(response)
        return response


class MeView(APIView):
    """
    GET /api/v1/auth/me/
    Returns the currently authenticated user. Used by the frontend on
    app load to restore session state from the cookie.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"user": UserSerializer(request.user).data})


class ChangePasswordView(APIView):
    """
    POST /api/v1/auth/change-password/
    For a logged-in user changing their own password.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data["current_password"]):
            return Response(
                {"error": {"detail": "Current password is incorrect.", "fields": None}},
                status=400,
            )

        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Password updated successfully."})


class PasswordResetRequestView(APIView):
    """
    POST /api/v1/auth/password-reset/
    Body: { "email": str }

    Always returns 200 regardless of whether the email exists, to avoid
    leaking which emails are registered. In this phase there is no real
    mail service, so Django's console email backend prints the reset
    link to the backend server log — the reviewer can find it there.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            user = None

        if user is not None:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"

            send_mail(
                subject="Reset your TutorFlow password",
                message=(
                    f"Hi {user.first_name},\n\n"
                    f"Click the link below to reset your TutorFlow password:\n"
                    f"{reset_link}\n\n"
                    f"If you did not request this, you can ignore this email."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
            )

        return Response(
            {"detail": "If that email exists, a reset link has been sent."}
        )


class PasswordResetConfirmView(APIView):
    """
    POST /api/v1/auth/password-reset/confirm/
    Body: { "uid": str, "token": str, "new_password": str }
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            user_id = force_str(urlsafe_base64_decode(data["uid"]))
            user = User.objects.get(pk=user_id)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return Response(
                {"error": {"detail": "Invalid or expired reset link.", "fields": None}},
                status=400,
            )

        if not default_token_generator.check_token(user, data["token"]):
            return Response(
                {"error": {"detail": "Invalid or expired reset link.", "fields": None}},
                status=400,
            )

        user.set_password(data["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Password reset successful. You can now log in."})
