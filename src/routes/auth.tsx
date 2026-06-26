import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
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

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", company_name: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const parsed = signInSchema.parse({ email: form.email, password: form.password });
        const { error } = await supabase.auth.signInWithPassword(parsed);
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        navigate({ to: "/" });
      } else {
        const parsed = signUpSchema.parse(form);
        const { error } = await supabase.auth.signUp({
          email: parsed.email,
          password: parsed.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: parsed.full_name, company_name: parsed.company_name },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Entrando…");
        navigate({ to: "/" });
      }
    } catch (err) {
      const msg = err instanceof z.ZodError ? err.issues[0].message : err instanceof Error ? err.message : "Erro";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if ("error" in result && result.error) throw result.error;
      if (!("redirected" in result) || !result.redirected) navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no login Google");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">People Performance Hub</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Acesse sua conta" : "Crie sua conta e comece em minutos"}
          </p>
        </div>

        <Button type="button" variant="outline" className="w-full" onClick={google} disabled={loading}>
          Continuar com Google
        </Button>

        <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          ou
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <>
              <div>
                <Label htmlFor="full_name">Seu nome</Label>
                <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="company_name">Nome da empresa</Label>
                <Input id="company_name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} required />
              </div>
            </>
          )}
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
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
