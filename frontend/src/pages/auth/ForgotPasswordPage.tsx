import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { requestPasswordReset } from "@/api/auth";
import { getApiErrorMessage } from "@/api/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { paths } from "@/routes/paths";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "@/schemas/auth";

export function ForgotPasswordPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: "" },
    });

    const onSubmit = async (values: ForgotPasswordFormValues) => {
        setIsSubmitting(true);
        try {
            await requestPasswordReset(values);
            setSubmitted(true);
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <AuthLayout
                title="Check your email"
                description="If an account exists for that email, we've sent a reset link."
                footer={
                    <Link to={paths.login} className="font-medium text-primary hover:underline">
                        Back to login
                    </Link>
                }
            >
                <p className="text-sm text-muted-foreground">
                    For this demo, the reset link is printed to the backend server console
                    instead of a real inbox. Copy the link from there to continue.
                </p>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="Forgot your password?"
            description="Enter your email and we'll send you a reset link."
            footer={
                <span className="text-muted-foreground">
                    Remembered it?{" "}
                    <Link to={paths.login} className="font-medium text-primary hover:underline">
                        Back to login
                    </Link>
                </span>
            }
        >
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        aria-invalid={!!errors.email}
                        {...register("email")}
                    />
                    {errors.email && (
                        <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Sending..." : "Send reset link"}
                </Button>
            </form>
        </AuthLayout>
    );
}