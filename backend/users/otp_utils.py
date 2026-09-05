import secrets

from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone

from .models import PasswordResetOTP


def generate_otp_code() -> str:
    """
    Generates a random 6-digit numeric code using `secrets` (not
    `random`), since this is a security-sensitive token, not a
    cosmetic ID. Zero-padded so it's always exactly 6 digits.
    """
    return f"{secrets.randbelow(10**PasswordResetOTP.OTP_LENGTH):06d}"


def create_otp_for_user(user) -> tuple[PasswordResetOTP, str]:
    """
    Invalidates any previous unused OTPs for this user (so only the
    most recently requested code is ever valid — requesting a new code
    should retire the old one, not leave two valid codes floating
    around) and creates a new one.

    Returns (otp_instance, raw_code) — the raw code is only available
    here, at creation time, so it can be emailed; it is never stored
    or retrievable again after this point.
    """
    PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)

    raw_code = generate_otp_code()
    otp = PasswordResetOTP.objects.create(
        user=user,
        code_hash=make_password(raw_code),
        expires_at=timezone.now() + timezone.timedelta(minutes=PasswordResetOTP.OTP_VALID_MINUTES),
    )
    return otp, raw_code


def verify_otp_code(otp: PasswordResetOTP, submitted_code: str) -> bool:
    """
    Checks the submitted code against the stored hash and increments
    the attempt counter regardless of outcome, so repeated wrong
    guesses count down toward MAX_ATTEMPTS even across separate
    requests.
    """
    otp.attempts += 1
    otp.save(update_fields=["attempts"])

    return check_password(submitted_code, otp.code_hash)
