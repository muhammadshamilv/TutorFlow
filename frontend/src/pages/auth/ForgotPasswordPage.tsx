import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  confirmPasswordReset,
  requestPasswordResetOTP,
  verifyPasswordResetOTP,
} from "@/api/auth";
import { getApiErrorMessage } from "@/api/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { OtpInput } from "@/components/auth/OtpInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { paths } from "@/routes/paths";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyOtpSchema,
  type ForgotPasswordFormValues,
  type ResetPasswordFormValues,
  type VerifyOtpFormValues,
} from "@/schemas/auth";

type Step = "email" | "otp" | "newPassword";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [verifiedCode, setVerifiedCode] = useState("");

  return (
    <AuthLayout
      title={
        step === "email"
          ? "Forgot your password?"
          : step === "otp"
            ? "Enter verification code"
            : "Set a new password"
      }
      description={
        step === "email"
          ? "Enter your email and we'll send you a 6-digit code."
          : step === "otp"
            ? `We sent a code to ${email}. It expires in 10 minutes.`
            : "Choose a strong password for your account."
      }
      footer={
        <Link to={paths.login} className="font-medium text-primary hover:underline">
          Back to login
        </Link>
      }
    >
      {step === "email" && (
        <EmailStep
          onSent={(submittedEmail) => {
            setEmail(submittedEmail);
            setStep("otp");
          }}
        />
      )}

      {step === "otp" && (
        <OtpStep
          email={email}
          onVerified={(code) => {
            setVerifiedCode(code);
            setStep("newPassword");
          }}
          onBack={() => setStep("email")}
        />
      )}

      {step === "newPassword" && (
        <NewPasswordStep
          email={email}
          code={verifiedCode}
          onSuccess={() => {
            toast.success("Password reset successful. Please log in.");
            navigate(paths.login, { replace: true });
          }}
        />
      )}
    </AuthLayout>
  );
}

function EmailStep({ onSent }: { onSent: (email: string) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      await requestPasswordResetOTP(values);
      onSent(values.email);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Sending code..." : "Send code"}
      </Button>
    </form>
  );
}

function OtpStep({
  email,
  onVerified,
  onBack,
}: {
  email: string;
  onVerified: (code: string) => void;
  onBack: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VerifyOtpFormValues>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { code: "" },
  });

  const code = watch("code");

  const onSubmit = async (values: VerifyOtpFormValues) => {
    setIsSubmitting(true);
    try {
      await verifyPasswordResetOTP({ email, code: values.code });
      onVerified(values.code);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await requestPasswordResetOTP({ email });
      toast.success("A new code has been sent.");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="space-y-2">
        <Label>Verification code</Label>
        <OtpInput value={code} onChange={(value) => setValue("code", value)} />
        {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || code.length !== 6}>
        {isSubmitting ? "Verifying..." : "Verify code"}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          Change email
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
          className="font-medium text-primary hover:underline disabled:opacity-50"
        >
          {isResending ? "Resending..." : "Resend code"}
        </button>
      </div>
    </form>
  );
}

function NewPasswordStep({
  email,
  code,
  onSuccess,
}: {
  email: string;
  code: string;
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      await confirmPasswordReset({ email, code, new_password: values.newPassword });
      onSuccess();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
  );
}