import json
import logging
import time

from django.conf import settings
from google import genai
from google.genai import errors as genai_errors
from google.genai import types

logger = logging.getLogger(__name__)

# HTTP status codes worth a short automatic retry on the SAME model —
# these mean "temporarily overloaded," not "broken."
_RETRYABLE_STATUS_CODES = {503, 500, 429}
_RETRY_DELAY_SECONDS = 2
_MAX_ATTEMPTS_PER_MODEL = 2  # 1 initial try + 1 retry


class AIServiceError(Exception):
    """
    Raised for any failure talking to the AI provider (network error,
    invalid response, missing API key, every candidate model failing,
    etc). Views catch this specifically so an AI outage never surfaces
    as a raw 500 or partially corrupts session state.
    """


def _get_client() -> genai.Client:
    api_key = getattr(settings, "GEMINI_API_KEY", None)
    if not api_key:
        raise AIServiceError("Gemini API key is not configured on the server.")
    return genai.Client(api_key=api_key)


def _status_code_of(exc: Exception) -> int | None:
    """
    google-genai raises ClientError (4xx) and ServerError (5xx), both
    subclasses of APIError, which exposes `.code` as the HTTP status.
    Different SDK versions have used `.status_code` in the past, so we
    check both defensively rather than assuming one attribute name.
    """
    return getattr(exc, "code", None) or getattr(exc, "status_code", None)


def _resolve_model_chain(model: str | None) -> list[str]:
    """
    Builds the ordered list of models to try. If the caller (or
    settings.GEMINI_MODEL) specifies one explicitly, that's tried
    first, then we fall through a short list of other currently-active
    models — so a single model being overloaded or newly retired
    doesn't take the whole AI feature down.

    NOTE: Google has been blocking gemini-2.5-flash and
    gemini-2.5-flash-lite for new API keys/projects ahead of their
    official October 2026 shutdown (both return 404 NOT_FOUND with
    "no longer available to new users"), so the fallback chain only
    uses 3.x-series models that are confirmed live for new keys as of
    September 2026. Update this list if Google's availability changes
    again — check https://ai.google.dev/gemini-api/docs/deprecations.
    """
    primary = model or getattr(settings, "GEMINI_MODEL", "gemini-3.6-flash")
    fallbacks = getattr(
        settings,
        "GEMINI_MODEL_FALLBACKS",
        ["gemini-3.5-flash", "gemini-3.1-flash-lite"],
    )
    chain = [primary] + [m for m in fallbacks if m != primary]
    return chain


def _call_gemini(client, model, prompt, response_schema):
    return client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=response_schema,
            # NOTE: temperature/top_p/top_k are deprecated sampling
            # parameters as of the May 2026 Gemini API changelog and
            # are intentionally omitted here.
        ),
    )


def generate_structured_json(
    *,
    prompt: str,
    response_schema: dict,
    model: str | None = None,
) -> dict:
    """
    Sends `prompt` to Gemini and forces the response to conform to
    `response_schema`, so we always get back predictable, parseable
    fields instead of loosely-formatted prose.

    Resilience strategy (Gemini model availability has been shifting
    frequently — models get retired or hit capacity limits with little
    notice):
      1. Try the configured primary model (settings.GEMINI_MODEL).
      2. On a transient error (503/500/429), retry that SAME model
         once after a short delay — Google explicitly describes these
         as "usually temporary."
      3. If it still fails, or fails with a different error, move to
         the next model in GEMINI_MODEL_FALLBACKS and repeat.
      4. Only after every model in the chain has failed do we raise
         AIServiceError — with the *last* error's detail, since that's
         most likely the most relevant one to show the tutor.

    This means a single overloaded or retired model never fully blocks
    an AI feature as long as at least one fallback is healthy.
    """
    client = _get_client()
    model_chain = _resolve_model_chain(model)

    last_exc: Exception | None = None

    for candidate_model in model_chain:
        for attempt in range(1, _MAX_ATTEMPTS_PER_MODEL + 1):
            try:
                response = _call_gemini(client, candidate_model, prompt, response_schema)
                raw_text = getattr(response, "text", None)
                if not raw_text:
                    raise AIServiceError("The AI service returned an empty response.")
                try:
                    return json.loads(raw_text)
                except (json.JSONDecodeError, TypeError) as exc:
                    logger.exception("Gemini returned non-JSON output: %s", raw_text)
                    raise AIServiceError("The AI service returned an unreadable response.") from exc

            except (genai_errors.ClientError, genai_errors.ServerError) as exc:
                status_code = _status_code_of(exc)
                last_exc = exc

                if status_code in _RETRYABLE_STATUS_CODES and attempt < _MAX_ATTEMPTS_PER_MODEL:
                    logger.warning(
                        "Gemini model '%s' returned %s, retrying in %ss (attempt %s/%s).",
                        candidate_model, status_code, _RETRY_DELAY_SECONDS,
                        attempt, _MAX_ATTEMPTS_PER_MODEL,
                    )
                    time.sleep(_RETRY_DELAY_SECONDS)
                    continue

                logger.warning(
                    "Gemini model '%s' failed (%s), moving to next fallback if available.",
                    candidate_model, status_code,
                )
                break  # stop retrying this model, move to the next candidate

            except Exception as exc:  # noqa: BLE001 - network or unexpected SDK error
                logger.exception("Unexpected error calling Gemini model '%s'.", candidate_model)
                last_exc = exc
                break  # move to the next candidate model

    logger.error("All Gemini models in the fallback chain failed: %s", model_chain)
    raise AIServiceError(
        f"The AI service could not complete this request after trying "
        f"{len(model_chain)} model(s) ({', '.join(model_chain)}). "
        f"Last error: {last_exc}"
    )
