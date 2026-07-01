import { PageHeader } from "@/components/php/PageHeader";
import { SectionCard } from "@/components/php/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
  const qc = useQueryClient();
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

  const dirty = name.trim().length > 0 && name.trim() !== (company.data?.name ?? "");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title="Configurações" description="Ajustes essenciais da plataforma." />

      <SectionCard title="Empresa" description="Nome exibido em relatórios e na navegação.">
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
    </div>
  );
}

export const Route = createFileRoute("/_app/configuracoes")({
  component: ConfiguracoesPage,
});
