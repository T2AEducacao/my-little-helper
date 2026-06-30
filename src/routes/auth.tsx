import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lovableCloudAuth } from "@/integrations/lovable/auth";
import { getCurrentUserRole } from "@/lib/goals-data";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(72),
});

const signUpSchema = signInSchema.extend({
  full_name: z.string().trim().min(2, "Informe seu nome").max(120),
  company_name: z.string().trim().min(2, "Informe a empresa").max(120),
});

const AUTH_FALLBACK_MESSAGE =
  "Não foi possível concluir o acesso pelo Lovable Cloud. Tente novamente em instantes.";

function cleanAuthMessage(message: string) {
  const trimmed = message.replace(/\+/g, " ").trim();

  if (!trimmed || trimmed === "{}") return AUTH_FALLBACK_MESSAGE;

  const lower = trimmed.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "E-mail ou senha inválidos.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar.";
  }
  if (lower.includes("already registered") || lower.includes("user already exists")) {
    return "Este e-mail já possui cadastro. Entre com sua senha ou use outro e-mail.";
  }
  if (
    lower.includes("database error saving new user") ||
    lower.includes("ensure_current_user_profile")
  ) {
    return "Não foi possível finalizar seu perfil no Lovable Cloud. Aguarde a atualização do backend e tente novamente.";
  }

  return trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getAuthErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Verifique os dados informados.";
  }

  if (error instanceof Error) {
    return cleanAuthMessage(error.message);
  }

  if (typeof error === "string") {
    return cleanAuthMessage(error);
  }

  if (isRecord(error)) {
    for (const key of ["message", "error_description", "error", "details", "hint"]) {
      const value = error[key];
      if (typeof value === "string" && value.trim()) {
        return cleanAuthMessage(value);
      }
    }
  }

  return AUTH_FALLBACK_MESSAGE;
}

function readAuthErrorFromUrl() {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const message =
    search.get("error_description") ||
    hash.get("error_description") ||
    search.get("error") ||
    hash.get("error");

  return message ? cleanAuthMessage(message) : null;
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", company_name: "" });

  useEffect(() => {
    let cancelled = false;
    const authError = readAuthErrorFromUrl();
    const errorTimer = authError ? window.setTimeout(() => toast.error(authError), 0) : undefined;

    lovableCloudAuth
      .getVerifiedSession({ ensureProfile: true })
      .then((auth) => {
        if (!cancelled && auth) navigate({ to: "/", replace: true });
      })
      .catch((err) => console.error("Lovable Cloud session check error", err));

    const unsubscribe = lovableCloudAuth.onAuthStateChange((_event, session) => {
      if (!session) return;
      lovableCloudAuth
        .getVerifiedSession({ ensureProfile: true })
        .then((auth) => {
          if (!cancelled && auth) navigate({ to: "/", replace: true });
        })
        .catch((err) => console.error("Lovable Cloud auth state error", err));
    });

    return () => {
      cancelled = true;
      if (errorTimer) window.clearTimeout(errorTimer);
      unsubscribe();
    };
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const parsed = signInSchema.parse({ email: form.email, password: form.password });
        const auth = await lovableCloudAuth.signInWithPassword(parsed);
        if (!auth) throw new Error("Não foi possível validar sua sessão.");
        toast.success("Bem-vindo de volta!");
        navigate({ to: "/", replace: true });
      } else {
        const parsed = signUpSchema.parse(form);
        const { session } = await lovableCloudAuth.signUpWithPassword({
          email: parsed.email,
          password: parsed.password,
          fullName: parsed.full_name,
          companyName: parsed.company_name,
          emailRedirectTo: window.location.origin,
        });
        if (session) {
          toast.success("Conta criada! Entrando...");
          navigate({ to: "/", replace: true });
          return;
        }
        toast.success("Conta criada! Confirme seu e-mail para entrar no sistema.");
        setMode("signin");
        setForm({ email: parsed.email, password: "", full_name: "", company_name: "" });
      }
    } catch (err) {
      console.error("Lovable Cloud auth error", err);
      toast.error(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Performativo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Acesse sua conta" : "Crie sua conta e comece em minutos"}
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <>
              <div>
                <Label htmlFor="full_name">Seu nome</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="company_name">Nome da empresa</Label>
                <Input
                  id="company_name"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  required
                />
              </div>
            </>
          )}
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "Não tem conta?" : "Já tem conta?"}{" "}
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Criar agora" : "Entrar"}
          </button>
        </p>
      </div>
    </div>
  );
}
