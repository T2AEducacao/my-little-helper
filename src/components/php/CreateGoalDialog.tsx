import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CreateGoalEmployeeOption = { id: string; name: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: CreateGoalEmployeeOption[];
  onCreate: (input: {
    nome: string;
    funcionario_id: string;
    funcionario_nome: string;
    prazo: string;
  }) => void;
}

export function CreateGoalDialog({ open, onOpenChange, employees, onCreate }: Props) {
  const [nome, setNome] = useState("");
  const [funcionarioId, setFuncionarioId] = useState<string>("");
  const [prazo, setPrazo] = useState<Date | undefined>();

  const reset = () => {
    setNome("");
    setFuncionarioId("");
    setPrazo(undefined);
  };

  const canSubmit = nome.trim().length > 0 && funcionarioId !== "" && !!prazo;

  const handleSubmit = () => {
    if (!canSubmit || !prazo) return;
    const employee = employees.find((e) => e.id === funcionarioId);
    onCreate({
      nome: nome.trim(),
      funcionario_id: funcionarioId,
      funcionario_nome: employee?.name ?? "—",
      prazo: format(prazo, "yyyy-MM-dd"),
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar meta</DialogTitle>
          <DialogDescription>
            Defina o nome, o responsável e o prazo da meta.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-name">Nome da meta</Label>
            <Input
              id="goal-name"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Reduzir tempo de resposta em 20%"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Funcionário atribuído</Label>
            <Select value={funcionarioId} onValueChange={setFuncionarioId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    employees.length === 0
                      ? "Nenhum colaborador cadastrado"
                      : "Selecione um colaborador"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Prazo</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !prazo && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {prazo
                    ? format(prazo, "PPP", { locale: ptBR })
                    : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={prazo}
                  onSelect={setPrazo}
                  initialFocus
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            Criar Meta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
