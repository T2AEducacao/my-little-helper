import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { provisionEmployeeAccount } from "@/lib/employee-account.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { KeyRound, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  employeeId: string;
  employeeName: string;
  hasAccess: boolean;
  defaultEmail?: string | null;
  variant?: "button" | "menu-item";
};

export function EmployeeAccessButton({
  employeeId,
  employeeName,
  hasAccess,
  defaultEmail,
  variant = "button",
}: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const provision = useServerFn(provisionEmployeeAccount);
  const qc = useQueryClient();

  const reset = () => {
    setCredentials(null);
    setEmail(defaultEmail ?? "");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const result = await provision({ data: { employee_id: employeeId, email: email.trim() } });
      setCredentials(result);
      toast.success("Acesso criado com sucesso");
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["employee", employeeId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar acesso");
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado");
  };

  const trigger =
    variant === "menu-item" ? (
      <DropdownMenuItem
        disabled={hasAccess}
        onSelect={(e) => {
          e.preventDefault();
          if (!hasAccess) setOpen(true);
        }}
      >
        {hasAccess ? (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4 text-status-excellent" /> Acesso ativo
          </>
        ) : (
          <>
            <KeyRound className="mr-2 h-4 w-4" /> Criar acesso
          </>
        )}
      </DropdownMenuItem>
    ) : hasAccess ? (
      <Button size="sm" variant="outline" disabled className="gap-1.5">
        <CheckCircle2 className="h-4 w-4 text-status-excellent" />
        Acesso ativo
      </Button>
    ) : (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <KeyRound className="h-4 w-4" />
        Criar acesso
      </Button>
    );

  return (
    <>
      {trigger}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar acesso para {employeeName}</DialogTitle>
            <DialogDescription>
              O colaborador entrará em <code>/auth</code> com o e-mail e senha temporária abaixo.
            </DialogDescription>
          </DialogHeader>

          {credentials ? (
            <div className="space-y-3">
              <CredField label="E-mail" value={credentials.email} onCopy={copy} />
              <CredField label="Senha temporária" value={credentials.password} onCopy={copy} mono />
              <p className="text-xs text-muted-foreground">
                Copie e envie ao colaborador. Esta senha não será exibida novamente.
              </p>
              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Concluir</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employee-access-email">E-mail do colaborador</Label>
                <Input
                  id="employee-access-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colaborador@empresa.com"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Criando..." : "Criar acesso"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CredField({
  label,
  value,
  onCopy,
  mono,
}: {
  label: string;
  value: string;
  onCopy: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
        <span className={`flex-1 truncate text-sm ${mono ? "font-mono" : ""}`}>{value}</span>
        <Button type="button" size="sm" variant="ghost" onClick={() => onCopy(value)}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
