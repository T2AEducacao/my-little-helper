import { PageHeader } from "@/components/php/PageHeader";
import { SectionCard } from "@/components/php/SectionCard";
import { EmptyState } from "@/components/php/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useEmployees, initials } from "@/lib/php-data";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Languages, Loader2, UserCog } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Lang = "pt-BR" | "en";
const LANG_KEY = "php.language";

function useLanguage(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>("pt-BR");
  useEffect(() => {
    const stored = (typeof window !== "undefined" && window.localStorage.getItem(LANG_KEY)) as Lang | null;
    if (stored === "pt-BR" || stored === "en") setLang(stored);
  }, []);
  const update = (l: Lang) => {
    setLang(l);
    if (typeof window !== "undefined") window.localStorage.setItem(LANG_KEY, l);
  };
  return [lang, update];
}

function useCompany() {
  return useQuery({
    queryKey: ["company-current"],
    queryFn: async () => {
      const { data: companyId } = await supabase.rpc("get_user_company_id");
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("id,name")
        .eq("id", companyId as string)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function ConfiguracoesPage() {
  const company = useCompany();
  const employees = useEmployees();
  const qc = useQueryClient();
  const [lang, setLang] = useLanguage();
  const [name, setName] = useState("");

  useEffect(() => {
    if (company.data?.name) setName(company.data.name);
  }, [company.data?.name]);

  const saveCompany = useMutation({
    mutationFn: async (newName: string) => {
      if (!company.data?.id) throw new Error("Empresa não identificada.");
      const { error } = await supabase
        .from("companies")
        .update({ name: newName })
        .eq("id", company.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nome da empresa atualizado.");
      qc.invalidateQueries({ queryKey: ["company-current"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const managers = useMemo(() => {
    const list = employees.data ?? [];
    const managerIds = new Set(list.map((e) => e.manager_id).filter(Boolean) as string[]);
    return list.filter((e) => managerIds.has(e.id));
  }, [employees.data]);

  const dirty = name.trim().length > 0 && name.trim() !== (company.data?.name ?? "");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title="Configurações"
        description="Ajustes essenciais da plataforma."
      />

      <SectionCard
        title="Empresa"
        description="Nome exibido em relatórios e na navegação."
      >
        <form
          className="flex flex-col gap-3 sm:max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            if (dirty) saveCompany.mutate(name.trim());
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-name">Nome da empresa</Label>
            <Input
              id="company-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={company.isLoading ? "Carregando..." : "Ex.: Acme S.A."}
              disabled={company.isLoading || !company.data}
            />
          </div>
          <div>
            <Button type="submit" disabled={!dirty || saveCompany.isPending}>
              {saveCompany.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Idioma"
        description="Define o idioma da interface para todos os usuários do sistema."
      >
        <div className="flex flex-wrap gap-2">
          {([
            { value: "pt-BR", label: "Português (BR)" },
            { value: "en", label: "English" },
          ] as const).map((opt) => {
            const active = lang === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setLang(opt.value);
                  toast.success(
                    opt.value === "pt-BR" ? "Idioma definido: Português (BR)" : "Language set: English",
                  );
                }}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                <Languages className="h-4 w-4" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Gestores e líderes"
        description="Pessoas que lideram equipes e têm acesso ao sistema."
        contentClassName="px-2 pb-3 pt-1"
      >
        {employees.isLoading ? (
          <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando gestores...
          </div>
        ) : managers.length === 0 ? (
          <div className="px-3 py-2">
            <EmptyState
              icon={UserCog}
              title="Nenhum gestor cadastrado"
              description="Defina o gestor responsável ao cadastrar colaboradores em Pessoas para que apareçam aqui."
            />
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
            {managers.map((m) => (
              <li
                key={m.id}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-3 py-3"
              >
                <Avatar className="h-9 w-9">
                  {m.avatar_url && <AvatarImage src={m.avatar_url} alt={m.name} />}
                  <AvatarFallback className="text-xs">{initials(m.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{m.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {m.role ?? "Gestor"}
                    {m.email ? ` · ${m.email}` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

export const Route = createFileRoute("/_app/configuracoes")({
  component: ConfiguracoesPage,
});
