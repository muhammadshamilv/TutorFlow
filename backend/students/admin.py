from django.contrib import admin

from .models import Student


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ["user", "tutor", "subject", "current_level", "created_at"]
    list_filter = ["subject", "current_level"]
    search_fields = ["user__email", "user__first_name", "user__last_name", "tutor__email"]
    autocomplete_fields = ["tutor", "user"]
