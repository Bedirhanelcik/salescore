"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Moon, Sun } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { FieldError, Input, Label } from "@/components/ui/Input";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/contexts/auth-context";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useTheme } from "@/lib/contexts/theme-context";
import { useChangePassword } from "@/lib/hooks/use-account";
import { cn, formatDate } from "@/lib/utils";

const schema = z
  .object({
    current_password: z.string().min(1),
    new_password: z.string().min(8, "At least 8 characters"),
    confirm_password: z.string().min(1),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
  });
type FormValues = z.infer<typeof schema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const { theme, setTheme } = useTheme();
  const changePassword = useChangePassword();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await changePassword.mutateAsync({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      toast.success(t("settingsPage.passwordUpdated"));
      reset();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common.somethingWentWrong"));
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("settingsPage.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("settingsPage.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t("settingsPage.profile")}</CardTitle>
            <CardDescription>{t("settingsPage.profileHint")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar name={user.full_name} color={user.avatar_color} size="md" />
            <div>
              <p className="text-sm font-semibold text-foreground">{user.full_name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <Field label={t("settingsPage.role")} value={t(`roles.${user.role}`)} />
            <Field label={t("settingsPage.department")} value={user.department?.name} />
            <Field label={t("settingsPage.memberSince")} value={formatDate(user.created_at, locale)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t("settingsPage.security")}</CardTitle>
            <CardDescription>{t("settingsPage.securityHint")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>{t("auth.currentPassword")}</Label>
              <Input type="password" {...register("current_password")} />
              <FieldError>{errors.current_password?.message}</FieldError>
            </div>
            <div>
              <Label>{t("auth.newPassword")}</Label>
              <Input type="password" {...register("new_password")} />
              <FieldError>{errors.new_password?.message}</FieldError>
            </div>
            <div>
              <Label>
                {t("auth.newPassword")} ({t("common.confirm")})
              </Label>
              <Input type="password" {...register("confirm_password")} />
              <FieldError>{errors.confirm_password?.message}</FieldError>
            </div>
            <Button type="submit" isLoading={isSubmitting}>
              {t("settingsPage.security")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t("settingsPage.appearance")}</CardTitle>
            <CardDescription>{t("settingsPage.appearanceHint")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="mb-0">{t("settingsPage.language")}</Label>
            <LanguageSwitcher />
          </div>
          <div className="flex items-center justify-between">
            <Label className="mb-0">{t("settingsPage.theme")}</Label>
            <div className="flex overflow-hidden rounded-lg border border-border">
              <button
                onClick={() => setTheme("light")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium",
                  theme === "light" ? "bg-brand-subtle text-brand" : "text-muted-foreground hover:bg-card-hover"
                )}
              >
                <Sun className="h-3.5 w-3.5" />
                {t("settingsPage.themeLight")}
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={cn(
                  "flex items-center gap-1.5 border-s border-border px-3 py-1.5 text-xs font-medium",
                  theme === "dark" ? "bg-brand-subtle text-brand" : "text-muted-foreground hover:bg-card-hover"
                )}
              >
                <Moon className="h-3.5 w-3.5" />
                {t("settingsPage.themeDark")}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}
