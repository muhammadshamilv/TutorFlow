from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import PasswordResetOTP, User
from .otp_utils import create_otp_for_user, verify_otp_code
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    PasswordResetVerifySerializer,
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
    POST /api/v1/auth/password-reset/request/
    Body: { "email": str }

    Always returns 200 regardless of whether the email exists, to avoid
    leaking which emails are registered. If the account exists, a fresh
    6-digit OTP is generated (invalidating any previous unused code for
    that user) and emailed via real SMTP.
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
            _, raw_code = create_otp_for_user(user)

            send_mail(
                subject="Your TutorFlow password reset code",
                message=(
                    f"Hi {user.first_name},\n\n"
                    f"Your TutorFlow password reset code is: {raw_code}\n\n"
                    f"This code expires in {PasswordResetOTP.OTP_VALID_MINUTES} minutes "
                    f"and can only be used once.\n\n"
                    f"If you did not request this, you can safely ignore this email."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
            )

        return Response(
            {"detail": "If that email exists, a verification code has been sent."}
        )


class PasswordResetVerifyView(APIView):
    """
    POST /api/v1/auth/password-reset/verify/
    Body: { "email": str, "code": str }

    Checks the code without changing the password yet. On success,
    marks the OTP as verified so the confirm step can proceed — this
    step existing separately (rather than combining verify+confirm
    into one call) is what lets the frontend show "code correct, now
    set your new password" as its own screen.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()
        code = serializer.validated_data["code"]

        otp = self._get_active_otp(email)
        if otp is None:
            return Response(
                {"error": {"detail": "Invalid or expired code. Please request a new one.", "fields": None}},
                status=400,
            )

        if not otp.is_valid():
            return Response(
                {"error": {"detail": "This code has expired or has too many failed attempts. Please request a new one.", "fields": None}},
                status=400,
            )

        if not verify_otp_code(otp, code):
            remaining = max(PasswordResetOTP.MAX_ATTEMPTS - otp.attempts, 0)
            return Response(
                {
                    "error": {
                        "detail": f"Incorrect code. {remaining} attempt(s) remaining.",
                        "fields": None,
                    }
                },
                status=400,
            )

        otp.verified_at = timezone.now()
        otp.save(update_fields=["verified_at"])
        return Response({"detail": "Code verified. You can now set a new password."})

    @staticmethod
    def _get_active_otp(email):
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return None
        return (
            PasswordResetOTP.objects.filter(user=user, is_used=False)
            .order_by("-created_at")
            .first()
        )


class PasswordResetConfirmView(APIView):
    """
    POST /api/v1/auth/password-reset/confirm/
    Body: { "email": str, "code": str, "new_password": str }

    Requires the OTP to have already been verified (verified_at set)
    by PasswordResetVerifyView — this prevents skipping straight to
    this endpoint with a guessed code in one shot, since a code that
    was never separately verified can never reach here successfully
    even if the digits happen to be correct.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        email = data["email"].strip().lower()

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": {"detail": "Invalid or expired code. Please request a new one.", "fields": None}},
                status=400,
            )

        otp = (
            PasswordResetOTP.objects.filter(user=user, is_used=False)
            .order_by("-created_at")
            .first()
        )

        if otp is None or otp.is_expired() or otp.verified_at is None:
            return Response(
                {"error": {"detail": "This code has not been verified or has expired. Please start again.", "fields": None}},
                status=400,
            )

        if not verify_otp_code(otp, data["code"]):
            return Response(
                {"error": {"detail": "Incorrect code.", "fields": None}},
                status=400,
            )

        user.set_password(data["new_password"])
        user.save(update_fields=["password"])

        otp.is_used = True
        otp.save(update_fields=["is_used"])

        return Response({"detail": "Password reset successful. You can now log in."})
