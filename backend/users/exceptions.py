from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """
    Wraps every DRF error response into a consistent shape:
        { "error": { "detail": str, "fields": {...} | None } }

    Frontend can always read `error.detail` for a toast/banner message,
    and `error.fields` when it needs to show inline field errors.
    """
    response = exception_handler(exc, context)

    if response is None:
        return None

    data = response.data
    fields = None
    detail = "Something went wrong. Please try again."

    if isinstance(data, dict):
        if "detail" in data and len(data) == 1:
            detail = str(data["detail"])
        else:
            # Field-level validation errors from a serializer
            fields = {
                key: [str(v) for v in value] if isinstance(value, list) else str(value)
                for key, value in data.items()
            }
            detail = "Please check the highlighted fields."
    elif isinstance(data, list):
        detail = str(data[0]) if data else detail

    response.data = {"error": {"detail": detail, "fields": fields}}
    return response
