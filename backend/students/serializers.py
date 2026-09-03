from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from users.models import User, UserRole
from users.serializers import UserSerializer

from .models import Student


class StudentSerializer(serializers.ModelSerializer):
    """
    Read representation of a student profile, including basic info
    about the linked login account (name/email) for display purposes.
    """

    user = UserSerializer(read_only=True)

    class Meta:
        model = Student
        fields = [
            "id",
            "user",
            "subject",
            "current_level",
            "learning_goals",
            "weak_areas",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]


class StudentCreateSerializer(serializers.Serializer):
    """
    Creates a student's login account (User, role=student) and their
    Student profile in a single request, since a tutor-created student
    must be able to log in immediately.
    """

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    subject = serializers.CharField(max_length=150)
    current_level = serializers.CharField(max_length=50)
    learning_goals = serializers.CharField(required=False, allow_blank=True)
    weak_areas = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        tutor = self.context["request"].user

        with transaction.atomic():
            user = User.objects.create_user(
                email=validated_data["email"],
                password=validated_data["password"],
                first_name=validated_data["first_name"],
                last_name=validated_data.get("last_name", ""),
                role=UserRole.STUDENT,
            )
            student = Student.objects.create(
                tutor=tutor,
                user=user,
                subject=validated_data["subject"],
                current_level=validated_data["current_level"],
                learning_goals=validated_data.get("learning_goals", ""),
                weak_areas=validated_data.get("weak_areas", ""),
            )
        return student

    def to_representation(self, instance):
        return StudentSerializer(instance).data


class StudentUpdateSerializer(serializers.ModelSerializer):
    """
    Updates profile fields only. Login credentials (email/password) are
    changed via dedicated auth endpoints, not through this serializer,
    to keep account-security actions separate and auditable.
    """

    first_name = serializers.CharField(
        source="user.first_name", max_length=150, required=False
    )
    last_name = serializers.CharField(
        source="user.last_name", max_length=150, required=False, allow_blank=True
    )

    class Meta:
        model = Student
        fields = [
            "first_name",
            "last_name",
            "subject",
            "current_level",
            "learning_goals",
            "weak_areas",
        ]

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})

        with transaction.atomic():
            if user_data:
                for attr, value in user_data.items():
                    setattr(instance.user, attr, value)
                instance.user.save()

            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

        return instance

    def to_representation(self, instance):
        return StudentSerializer(instance).data
