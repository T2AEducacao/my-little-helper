import { useState, useEffect } from "react";
import { toast } from "sonner";
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
import { useCreateDepartment, useEmployees, type DepartmentRow } from "@/lib/php-data";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (dept: DepartmentRow) => void;
};

export function DepartmentFormDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [managerId, setManagerId] = useState<string>("");
  const { data: employees = [] } = useEmployees();
  const create = useCreateDepartment();

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setManagerId("");
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Informe o nome da área.");
    try {
      const dept = await create.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        manager_id: managerId || null,
      });
      toast.success("Área criada.");
      onCreated?.(dept);
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar área.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova área</DialogTitle>
          <DialogDescription>
            Organize as pessoas em áreas/departamentos. Você pode definir um
            gestor responsável.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div>
            <Label className="mb-1.5 block text-xs font-medium">Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Marketing" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium">Descrição</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição da área (opcional)."
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium">Gestor responsável</Label>
            <Select value={managerId} onValueChange={setManagerId}>
              <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
              <SelectContent>
                {employees.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    Cadastre colaboradores primeiro
                  </div>
                )}
                {employees.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={create.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Criando..." : "Criar área"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
