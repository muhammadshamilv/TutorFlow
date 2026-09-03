import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { confirmPasswordReset } from "@/api/auth";
import { getApiErrorMessage } from "@/api/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { paths } from "@/routes/paths";
import { resetPasswordSchema, type ResetPasswordFormValues } from "@/schemas/auth";

export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const uid = searchParams.get("uid");
    const token = searchParams.get("token");
    const linkIsValid = Boolean(uid && token);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { newPassword: "", confirmPassword: "" },
    });

    const onSubmit = async (values: ResetPasswordFormValues) => {
        if (!uid || !token) return;

        setIsSubmitting(true);
        try {
            await confirmPasswordReset({
                uid,
                token,
                new_password: values.newPassword,
            });
            toast.success("Password reset successful. Please log in.");
            navigate(paths.login, { replace: true });
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!linkIsValid) {
        return (
            <AuthLayout
                title="Invalid reset link"
                description="This password reset link is missing or malformed."
                footer={
                    <Link to={paths.forgotPassword} className="font-medium text-primary hover:underline">
                        Request a new link
                    </Link>
                }
            >
                <p className="text-sm text-muted-foreground">
                    Make sure you used the full link from the reset email.
                </p>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="Set a new password"
            description="Choose a strong password for your account."
            footer={
                <Link to={paths.login} className="font-medium text-primary hover:underline">
                    Back to login
                </Link>
            }
        >
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="newPassword">New password</Label>
                    <PasswordInput
                        id="newPassword"
                        autoComplete="new-password"
                        placeholder="••••••••"
                        aria-invalid={!!errors.newPassword}
                        {...register("newPassword")}
                    />
                    {errors.newPassword && (
                        <p className="text-sm text-destructive">{errors.newPassword.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm new password</Label>
                    <PasswordInput
                        id="confirmPassword"
                        autoComplete="new-password"
                        placeholder="••••••••"
                        aria-invalid={!!errors.confirmPassword}
                        {...register("confirmPassword")}
                    />
                    {errors.confirmPassword && (
                        <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                    )}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Resetting..." : "Reset password"}
                </Button>
            </form>
        </AuthLayout>
    );
}