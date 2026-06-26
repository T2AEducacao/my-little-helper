import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateEmployee,
  useUpdateEmployee,
  useDepartments,
  useEmployees,
  useCreateDepartment,
  SENIORITY_OPTIONS,
  STATUS_LABEL,
  type EmployeeRow,
  type EmployeeStatus,
  type EmployeeInput,
} from "@/lib/php-data";
import { DepartmentFormDialog } from "./DepartmentFormDialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: EmployeeRow | null;
  onSaved?: (e: EmployeeRow) => void;
};

const EMPTY: EmployeeInput = {
  name: "",
  email: "",
  role: "",
  department_id: null,
  manager_id: null,
  seniority: null,
  hire_date: null,
  avatar_url: null,
  notes: null,
  location: null,
  contract_type: null,
  behavioral_profile: null,
  status: "active",
};

export function EmployeeFormDialog({ open, onOpenChange, employee, onSaved }: Props) {
  const isEdit = !!employee;
  const [form, setForm] = useState<EmployeeInput>(EMPTY);
  const [deptOpen, setDeptOpen] = useState(false);

  const { data: departments = [] } = useDepartments();
  const { data: employees = [] } = useEmployees();
  const create = useCreateEmployee();
  const update = useUpdateEmployee();

  useEffect(() => {
    if (open) {
      if (employee) {
        setForm({
          name: employee.name,
          email: employee.email ?? "",
          role: employee.role ?? "",
          department_id: employee.department_id,
          manager_id: employee.manager_id,
          seniority: employee.seniority,
          hire_date: employee.hire_date,
          avatar_url: employee.avatar_url,
          notes: employee.notes,
          location: employee.location,
          contract_type: employee.contract_type,
          behavioral_profile: employee.behavioral_profile,
          status: employee.status,
        });
      } else {
        setForm(EMPTY);
      }
    }
  }, [open, employee]);

  function set<K extends keyof EmployeeInput>(key: K, value: EmployeeInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return toast.error("Informe o nome do colaborador.");
    const emailTrim = (form.email ?? "").trim();
    if (!emailTrim) return toast.error("Informe um e-mail válido.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim))
      return toast.error("E-mail inválido.");
    if (!form.role || !form.role.trim()) return toast.error("Informe o cargo.");
    if (!form.department_id) return toast.error("Selecione a área/departamento.");

    const input: EmployeeInput = {
      ...form,
      name,
      email: emailTrim,
      role: form.role.trim(),
    };

    try {
      if (isEdit && employee) {
        const saved = await update.mutateAsync({ id: employee.id, input });
        toast.success("Colaborador atualizado.");
        onSaved?.(saved);
      } else {
        const saved = await create.mutateAsync(input);
        toast.success("Colaborador cadastrado.");
        onSaved?.(saved);
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar.";
      if (msg.includes("employees_company_email_unique")) {
        toast.error("Já existe um colaborador com este e-mail nesta empresa.");
      } else {
        toast.error(msg);
      }
    }
  }

  const managerCandidates = employees.filter((e) => e.id !== employee?.id);
  const saving = create.isPending || update.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar colaborador" : "Novo colaborador"}</DialogTitle>
            <DialogDescription>
              Preencha as informações principais. O histórico de avaliações, metas e
              feedbacks é preservado.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" required>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Nome completo"
              />
            </Field>
            <Field label="E-mail" required>
              <Input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
                placeholder="pessoa@empresa.com"
              />
            </Field>
            <Field label="Cargo" required>
              <Input
                value={form.role ?? ""}
                onChange={(e) => set("role", e.target.value)}
                placeholder="Ex.: Analista de Marketing"
              />
            </Field>
            <Field label="Área / departamento" required>
              <div className="flex gap-2">
                <Select
                  value={form.department_id ?? ""}
                  onValueChange={(v) => set("department_id", v || null)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione a área" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setDeptOpen(true)} title="Nova área">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </Field>
            <Field label="Status" required>
              <Select
                value={form.status}
                onValueChange={(v) => set("status", v as EmployeeStatus)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as EmployeeStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Senioridade">
              <Select
                value={form.seniority ?? ""}
                onValueChange={(v) => set("seniority", v || null)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {SENIORITY_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Gestor responsável">
              <Select
                value={form.manager_id ?? ""}
                onValueChange={(v) => set("manager_id", v || null)}
              >
                <SelectTrigger><SelectValue placeholder="Sem gestor" /></SelectTrigger>
                <SelectContent>
                  {managerCandidates.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      Cadastre outras pessoas primeiro
                    </div>
                  )}
                  {managerCandidates.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Data de entrada">
              <Input
                type="date"
                value={form.hire_date ?? ""}
                onChange={(e) => set("hire_date", e.target.value || null)}
              />
            </Field>
            <Field label="Tipo de contrato">
              <Select
                value={form.contract_type ?? ""}
                onValueChange={(v) => set("contract_type", v || null)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLT">CLT</SelectItem>
                  <SelectItem value="PJ">PJ</SelectItem>
                  <SelectItem value="Estágio">Estágio</SelectItem>
                  <SelectItem value="Temporário">Temporário</SelectItem>
                  <SelectItem value="Freelancer">Freelancer</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Localidade">
              <Input
                value={form.location ?? ""}
                onChange={(e) => set("location", e.target.value || null)}
                placeholder="Ex.: São Paulo / Remoto"
              />
            </Field>
            <Field label="URL do avatar">
              <Input
                value={form.avatar_url ?? ""}
                onChange={(e) => set("avatar_url", e.target.value || null)}
                placeholder="https://..."
              />
            </Field>
            <Field label="Perfil comportamental">
              <Input
                value={form.behavioral_profile ?? ""}
                onChange={(e) => set("behavioral_profile", e.target.value || null)}
                placeholder="Ex.: Analítico, Comunicador"
              />
            </Field>
            <Field label="Observações" className="sm:col-span-2">
              <Textarea
                rows={3}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value || null)}
                placeholder="Notas internas (visíveis apenas ao RH e gestores)."
              />
            </Field>
            <DialogFooter className="sm:col-span-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DepartmentFormDialog
        open={deptOpen}
        onOpenChange={setDeptOpen}
        onCreated={(d) => set("department_id", d.id)}
      />
    </>
  );
}

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-medium text-foreground">
        {label} {required && <span className="text-status-critical">*</span>}
      </Label>
      {children}
    </div>
  );
}
