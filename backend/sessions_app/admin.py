from django.contrib import admin

from .models import Session


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ["topic", "tutor", "student", "status", "scheduled_start", "scheduled_end"]
    list_filter = ["status"]
    search_fields = ["topic", "tutor__email", "student__user__email"]
    autocomplete_fields = ["tutor", "student"]
    readonly_fields = ["id", "created_at", "updated_at"]
