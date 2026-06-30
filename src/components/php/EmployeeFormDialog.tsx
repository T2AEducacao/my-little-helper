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

const WORK_MODELS = ["Remoto", "Presencial", "Híbrido"] as const;
type WorkModel = (typeof WORK_MODELS)[number];

const EMPTY: EmployeeInput = {
  name: "",
  email: null,
  role: null,
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

function normalizeWorkModel(value: string | null | undefined): WorkModel | "" {
  if (!value) return "";
  const found = WORK_MODELS.find(
    (w) => w.toLowerCase() === value.trim().toLowerCase(),
  );
  return found ?? "";
}

export function EmployeeFormDialog({ open, onOpenChange, employee, onSaved }: Props) {
  const isEdit = !!employee;
  const [form, setForm] = useState<EmployeeInput>(EMPTY);
  const [deptOpen, setDeptOpen] = useState(false);

  const { data: departments = [] } = useDepartments();
  const create = useCreateEmployee();
  const update = useUpdateEmployee();

  useEffect(() => {
    if (open) {
      if (employee) {
        setForm({
          name: employee.name,
          email: employee.email,
          role: employee.role,
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
    if (!form.department_id) return toast.error("Selecione a área.");
    if (!form.location) return toast.error("Selecione o modelo de trabalho.");

    const input: EmployeeInput = { ...form, name };

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
      toast.error(msg);
    }
  }

  const saving = create.isPending || update.isPending;
  const workModel = normalizeWorkModel(form.location);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar colaborador" : "Novo colaborador"}</DialogTitle>
            <DialogDescription>
              Preencha as informações essenciais.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <Field label="Nome" required>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Nome completo"
              />
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
            <Field label="Área" required>
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
            <Field label="Modelo de trabalho" required>
              <Select
                value={workModel}
                onValueChange={(v) => set("location", v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {WORK_MODELS.map((w) => (
                    <SelectItem key={w} value={w}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <DialogFooter>
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
