"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Moon, Sun } from "lucide-react";

import { useAuth } from "@/lib/contexts/auth-context";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useTheme } from "@/lib/contexts/theme-context";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { FieldError, Input, Label } from "@/components/ui/Input";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Logo } from "@/components/layout/Logo";
import { Splash } from "@/components/layout/Splash";

const schema = z
  .object({
    full_name: z.string().min(2, "Required"),
    email: z.string().email(),
    password: z.string().min(8, "At least 8 characters"),
    confirm_password: z.string().min(1, "Required"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "passwordMismatch",
    path: ["confirm_password"],
  });
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const { user, register: signUp, isLoading } = useAuth();
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!isLoading && user) router.replace("/dashboard");
  }, [isLoading, user, router]);

  // Still resolving the session, or already signed in and about to be redirected to
  // /dashboard above - render the shared splash instead of flashing the register form.
  if (isLoading || user) {
    return <Splash />;
  }

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await signUp(values.email, values.password, values.full_name);
      router.replace("/dashboard");
    } catch (err) {
      setServerError(
        err instanceof ApiError && err.code === "EMAIL_TAKEN"
          ? t("auth.emailTaken")
          : err instanceof ApiError
            ? err.message
            : t("common.somethingWentWrong")
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="absolute right-4 top-4 flex items-center gap-1 rtl:right-auto rtl:left-4">
        <LanguageSwitcher />
        <button
          onClick={toggleTheme}
          aria-label={t("common.toggleTheme")}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-card-hover"
        >
          {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="md" className="mb-3" />
          <h1 className="text-xl font-bold text-foreground">{t("app.name")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("app.tagline")}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold text-foreground">{t("auth.createAccount")}</h2>
          <p className="mb-5 text-sm text-muted-foreground">{t("auth.createAccountSubtitle")}</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="full_name">{t("auth.fullName")}</Label>
              <Input id="full_name" autoComplete="name" {...register("full_name")} />
              <FieldError>{errors.full_name?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              <FieldError>{errors.email?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
              <FieldError>{errors.password?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="confirm_password">{t("auth.confirmPassword")}</Label>
              <Input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                {...register("confirm_password")}
              />
              <FieldError>
                {errors.confirm_password?.message === "passwordMismatch"
                  ? t("auth.passwordMismatch")
                  : errors.confirm_password?.message}
              </FieldError>
            </div>
            {serverError && <p className="rounded-lg bg-danger-subtle px-3 py-2 text-sm text-danger">{serverError}</p>}
            <Button type="submit" className="w-full" isLoading={isSubmitting} size="lg">
              {isSubmitting ? t("auth.creatingAccount") : t("auth.signUp")}
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {t("auth.alreadyHaveAccount")}{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">
            {t("auth.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
