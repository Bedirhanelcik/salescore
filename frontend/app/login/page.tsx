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

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

const DEMO_ACCOUNTS = [
  { role: "admin", email: "admin@salescore.io", password: "Admin123!" },
  { role: "manager", email: "manager@salescore.io", password: "Manager123!" },
  { role: "sales_rep", email: "sales@salescore.io", password: "Sales123!" },
  { role: "analyst", email: "analyst@salescore.io", password: "Analyst123!" },
  { role: "viewer", email: "viewer@salescore.io", password: "Viewer123!" },
];

export default function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!isLoading && user) router.replace("/dashboard");
  }, [isLoading, user, router]);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
      router.replace("/dashboard");
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : t("auth.invalidCredentials"));
    }
  };

  const fillDemo = (email: string, password: string) => {
    setValue("email", email);
    setValue("password", password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="absolute right-4 top-4 flex items-center gap-1 rtl:right-auto rtl:left-4">
        <LanguageSwitcher />
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-card-hover"
        >
          {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">
            S
          </div>
          <h1 className="text-xl font-bold text-foreground">{t("app.name")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("app.tagline")}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold text-foreground">{t("auth.welcomeBack")}</h2>
          <p className="mb-5 text-sm text-muted-foreground">{t("auth.signInSubtitle")}</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              <FieldError>{errors.email?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
              <FieldError>{errors.password?.message}</FieldError>
            </div>
            {serverError && <p className="rounded-lg bg-danger-subtle px-3 py-2 text-sm text-danger">{serverError}</p>}
            <Button type="submit" className="w-full" isLoading={isSubmitting} size="lg">
              {isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
            </Button>
          </form>
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-semibold text-foreground">{t("auth.demoAccounts")}</p>
          <p className="mb-3 text-xs text-muted-foreground">{t("auth.demoHint")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => fillDemo(acc.email, acc.password)}
                className="rounded-lg border border-border px-2.5 py-2 text-xs font-medium text-foreground hover:border-brand hover:bg-brand-subtle hover:text-brand transition-colors"
              >
                {t(`roles.${acc.role}`)}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {t("auth.dontHaveAccount")}{" "}
          <Link href="/register" className="font-medium text-brand hover:underline">
            {t("auth.signUp")}
          </Link>
        </p>
      </div>
    </div>
  );
}
