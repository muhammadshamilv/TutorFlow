"""
Django settings for config project.
"""

from datetime import timedelta
from pathlib import Path

import dj_database_url
import environ

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False)
)

environ.Env.read_env(BASE_DIR / ".env")

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env("SECRET_KEY")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env("DEBUG")

ALLOWED_HOSTS = env.list(
    "ALLOWED_HOSTS",
    default=["localhost", "127.0.0.1"]
)

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'corsheaders',

    'users',
    'students',
    'sessions_app',
    'ai_services',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    "corsheaders.middleware.CorsMiddleware",
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Database
DATABASES = {
    "default": dj_database_url.config(
        default=env("DATABASE_URL"),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# Custom user model
AUTH_USER_MODEL = "users.User"

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8},
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True


# Static files
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
WHITENOISE_MANIFEST_STRICT = False

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Email (console backend for now — Phase 5 bonus may add real SMTP)
# Email — real Gmail SMTP, used for the OTP password reset flow.
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("EMAIL_HOST_USER", default="noreply@tutorflow.local")

GEMINI_API_KEY = env("GEMINI_API_KEY", default="")
# Configurable so a future model retirement (Google does this periodically)
# only needs an env var change, not a code deploy.
GEMINI_MODEL = env("GEMINI_MODEL", default="gemini-flash-latest")
# Tried in order if the primary model is overloaded/unavailable.
GEMINI_MODEL_FALLBACKS = env.list(
    "GEMINI_MODEL_FALLBACKS",
    default=["gemini-2.5-flash-lite", "gemini-2.5-flash"],
)


# ---------------------------------------------------------------------------
# REST Framework + JWT (cookie-based)
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "users.authentication.CookieJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "EXCEPTION_HANDLER": "users.exceptions.custom_exception_handler",
    "DEFAULT_PAGINATION_CLASS": "config.pagination.StandardPagination",
    "PAGE_SIZE": 12,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# Names of the httpOnly cookies we set on login
AUTH_COOKIE_ACCESS = "tf_access"
AUTH_COOKIE_REFRESH = "tf_refresh"
# SameSite=None is required so the browser sends the auth cookies when
# the frontend and backend are on different domains in production
# (e.g. Vercel + Render). SameSite=None only works when Secure=True,
# which is why it's tied to DEBUG here — locally (DEBUG=True, plain
# HTTP) we use Lax instead, since None+Secure would silently fail to
# set the cookie at all over http://localhost.
AUTH_COOKIE_SAMESITE = "Lax" if DEBUG else "None"
AUTH_COOKIE_SECURE = not DEBUG  # True in production (HTTPS), False on localhost


# ---------------------------------------------------------------------------
# CORS — must allow credentials since we use cookies, not Authorization headers
# ---------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = [
    env("FRONTEND_URL", default="http://localhost:5173")
]
CORS_ALLOW_CREDENTIALS = True

# Required by Django for cross-domain POST requests (login, etc) to be
# accepted at all — without this, requests from the deployed frontend
# are rejected with a 403 before even reaching CORS checks.
CSRF_TRUSTED_ORIGINS = [
    env("FRONTEND_URL", default="http://localhost:5173")
]

FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:5173")

# ---------------------------------------------------------------------------
# Logging — Render captures stdout/stderr as logs, so route errors there
# instead of Django's default (which can otherwise swallow 500s silently
# in production once DEBUG=False).
# ---------------------------------------------------------------------------

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}
