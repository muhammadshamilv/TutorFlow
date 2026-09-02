import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { getApiErrorMessage, getApiFieldErrors } from "@/api/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { loginSchema, type LoginFormValues } from "@/schemas/auth";

export function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    });

    const onSubmit = async (values: LoginFormValues) => {
        setIsSubmitting(true);
        try {
            await login(values);
            const redirectTo = (location.state as { from?: string } | null)?.from;
            navigate(redirectTo ?? "/", { replace: true });
        } catch (error) {
            const fieldErrors = getApiFieldErrors(error);
            if (fieldErrors) {
                for (const [field, message] of Object.entries(fieldErrors)) {
                    setError(field as keyof LoginFormValues, { message });
                }
            } else {
                toast.error(getApiErrorMessage(error));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout
            title="Welcome back"
            description="Log in to your tutor or student account."
            footer={
                <span className="text-muted-foreground">
                    Having trouble?{" "}
                    <Link to="/forgot-password" className="font-medium text-primary hover:underline">
                        Reset your password
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

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                    </div>
                    <PasswordInput
                        id="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        aria-invalid={!!errors.password}
                        {...register("password")}
                    />
                    {errors.password && (
                        <p className="text-sm text-destructive">{errors.password.message}</p>
                    )}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Logging in..." : "Log in"}
                </Button>
            </form>
        </AuthLayout>
    );
}