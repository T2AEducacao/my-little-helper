import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import {
  Search,
  Plus,
  Upload,
  Download,
  Users,
  MoreHorizontal,
  Eye,
  Pencil,
  ClipboardCheck,
  MessageSquare,
  CalendarPlus,
  UserMinus,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  UserCheck,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/php/PageHeader";
import { EmptyState } from "@/components/php/EmptyState";
import { StatusBadge } from "@/components/php/StatusBadge";
import { EmployeeFormDialog } from "@/components/php/EmployeeFormDialog";
import { MetricCard } from "@/components/php/MetricCard";
import { scoreToStatus, scoreLabel } from "@/components/php/types";
import {
  useEmployees,
  useDepartments,
  useSnapshots,
  useDeactivateEmployee,
  latestSnapshotsByEmployee,
  initials,
  STATUS_LABEL,
  SENIORITY_OPTIONS,
  type EmployeeRow,
  type EmployeeStatus,
} from "@/lib/php-data";

export const Route = createFileRoute("/_app/colaboradores")({
  head: () => ({
    meta: [
      { title: "Colaboradores · People Performance Hub" },
      {
        name: "description",
        content:
          "Gerencie o efetivo, acompanhe KPIs individuais e identifique colaboradores em destaque ou atenção.",
      },
    ],
  }),
  component: ColaboradoresPage,
});

type ScoreFilter = "all" | "excellent" | "good" | "attention" | "risk" | "critical" | "none";

function ColaboradoresPage() {
  const { data: employees = [], isLoading } = useEmployees();
  const { data: departments = [] } = useDepartments();
  const { data: snapshots = [] } = useSnapshots();
  const deactivate = useDeactivateEmployee();

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [toDeactivate, setToDeactivate] = useState<EmployeeRow | null>(null);

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [managerFilter, setManagerFilter] = useState<string>("all");
  const [seniorityFilter, setSeniorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [view, setView] = useState<"table" | "cards">("table");

  const latest = useMemo(() => latestSnapshotsByEmployee(snapshots), [snapshots]);
  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);
  const empById = useMemo(() => new Map(employees.map((e) => [e.id, e.name])), [employees]);

  const performanceSummary = useMemo(() => {
    const active = employees.filter((employee) => employee.status === "active");
    const scores = active.map((employee) => latest.get(employee.id)?.current ?? null);
    const evaluatedScores = scores.filter((score): score is number => score !== null);
    const averageScore =
      evaluatedScores.length > 0
        ? evaluatedScores.reduce((sum, score) => sum + score, 0) / evaluatedScores.length
        : null;

    return {
      activeCount: active.length,
      evaluatedCount: evaluatedScores.length,
      averageScore,
      highPerformanceCount: evaluatedScores.filter((score) => score >= 90).length,
      attentionCount: evaluatedScores.filter((score) => score < 75).length,
      withoutScoreCount: scores.length - evaluatedScores.length,
    };
  }, [employees, latest]);

  const roleOptions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => e.role && set.add(e.role));
    return Array.from(set).sort();
  }, [employees]);
  const managerOptions = useMemo(() => {
    const ids = new Set<string>();
    employees.forEach((e) => e.manager_id && ids.add(e.manager_id));
    return Array.from(ids)
      .map((id) => ({ id, name: empById.get(id) ?? "—" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, empById]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (q) {
        const hay = [e.name, e.email ?? "", e.role ?? "", deptById.get(e.department_id ?? "") ?? ""]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (deptFilter !== "all" && e.department_id !== deptFilter) return false;
      if (managerFilter !== "all" && e.manager_id !== managerFilter) return false;
      if (roleFilter !== "all" && e.role !== roleFilter) return false;
      if (seniorityFilter !== "all" && e.seniority !== seniorityFilter) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      const score = latest.get(e.id)?.current ?? null;
      const status = scoreToStatus(score);
      if (scoreFilter !== "all") {
        if (scoreFilter === "none" && status !== "neutral") return false;
        if (scoreFilter !== "none" && status !== scoreFilter) return false;
      }
      return true;
    });
  }, [
    employees,
    search,
    deptFilter,
    managerFilter,
    roleFilter,
    seniorityFilter,
    statusFilter,
    scoreFilter,
    latest,
    deptById,
  ]);

  const hasAnyFilter =
    !!search ||
    deptFilter !== "all" ||
    managerFilter !== "all" ||
    roleFilter !== "all" ||
    seniorityFilter !== "all" ||
    statusFilter !== "all" ||
    scoreFilter !== "all";

  function clearFilters() {
    setSearch("");
    setDeptFilter("all");
    setManagerFilter("all");
    setRoleFilter("all");
    setSeniorityFilter("all");
    setStatusFilter("all");
    setScoreFilter("all");
  }

  async function handleDeactivate() {
    if (!toDeactivate) return;
    try {
      await deactivate.mutateAsync(toDeactivate.id);
      toast.success(`${toDeactivate.name} foi desativado.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao desativar.");
    } finally {
      setToDeactivate(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Colaboradores"
        description="Gerencie o efetivo, acompanhe KPIs individuais e identifique rapidamente destaques e pontos de atenção."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => toast("Disponível em breve.")}>
              <Upload className="mr-1.5 h-4 w-4" /> Importar
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast("Disponível em breve.")}>
              <Download className="mr-1.5 h-4 w-4" /> Exportar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setOpenForm(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Novo colaborador
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Efetivo ativo"
          icon={UserCheck}
          value={performanceSummary.activeCount}
          isEmpty={!isLoading && employees.length === 0}
          emptyMessage="Nenhum colaborador ativo ainda."
          footer={`${employees.length} colaborador(es) no total.`}
        />
        <MetricCard
          label="Score médio"
          icon={ClipboardCheck}
          value={
            performanceSummary.averageScore === null
              ? "—"
              : Math.round(performanceSummary.averageScore)
          }
          isEmpty={!isLoading && performanceSummary.evaluatedCount === 0}
          emptyMessage="Sem KPIs registrados ainda."
          footer={`${performanceSummary.evaluatedCount} colaborador(es) com KPI recente.`}
        />
        <MetricCard
          label="Alto desempenho"
          icon={Trophy}
          value={performanceSummary.highPerformanceCount}
          isEmpty={!isLoading && performanceSummary.evaluatedCount === 0}
          emptyMessage="Sem dados suficientes."
          footer="Score igual ou acima de 90."
        />
        <MetricCard
          label="Precisam de atenção"
          icon={AlertTriangle}
          value={performanceSummary.attentionCount}
          isEmpty={!isLoading && performanceSummary.evaluatedCount === 0}
          emptyMessage="Sem dados suficientes."
          footer={
            performanceSummary.withoutScoreCount > 0
              ? `${performanceSummary.withoutScoreCount} ativo(s) ainda sem KPI.`
              : "Score abaixo de 75."
          }
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail, cargo ou área..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={view === "table" ? "default" : "outline"}
              onClick={() => setView("table")}
            >
              Tabela
            </Button>
            <Button
              size="sm"
              variant={view === "cards" ? "default" : "outline"}
              onClick={() => setView("cards")}
            >
              Cards
            </Button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          <FilterSelect
            value={deptFilter}
            onChange={setDeptFilter}
            placeholder="Área"
            options={[
              { value: "all", label: "Todas as áreas" },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
          <FilterSelect
            value={managerFilter}
            onChange={setManagerFilter}
            placeholder="Gestor"
            options={[
              { value: "all", label: "Todos os gestores" },
              ...managerOptions.map((m) => ({ value: m.id, label: m.name })),
            ]}
          />
          <FilterSelect
            value={roleFilter}
            onChange={setRoleFilter}
            placeholder="Cargo"
            options={[
              { value: "all", label: "Todos os cargos" },
              ...roleOptions.map((r) => ({ value: r, label: r })),
            ]}
          />
          <FilterSelect
            value={seniorityFilter}
            onChange={setSeniorityFilter}
            placeholder="Senioridade"
            options={[
              { value: "all", label: "Todas senioridades" },
              ...SENIORITY_OPTIONS.map((s) => ({ value: s, label: s })),
            ]}
          />
          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Status"
            options={[
              { value: "all", label: "Todos os status" },
              ...(Object.keys(STATUS_LABEL) as EmployeeStatus[]).map((s) => ({
                value: s,
                label: STATUS_LABEL[s],
              })),
            ]}
          />
          <FilterSelect
            value={scoreFilter}
            onChange={(v) => setScoreFilter(v as ScoreFilter)}
            placeholder="Faixa de desempenho"
            options={[
              { value: "all", label: "Todos os scores" },
              { value: "excellent", label: "Alto desempenho (90-100)" },
              { value: "good", label: "Bom (75-89)" },
              { value: "attention", label: "Em atenção (60-74)" },
              { value: "risk", label: "Em risco (40-59)" },
              { value: "critical", label: "Crítico (<40)" },
              { value: "none", label: "Sem score" },
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Carregando colaboradores...
        </div>
      ) : employees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum colaborador cadastrado ainda"
          description="Cadastre a primeira pessoa da equipe para começar a acompanhar metas, avaliações e desenvolvimento."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setOpenForm(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Cadastrar primeiro colaborador
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhum colaborador encontrado com os filtros atuais"
          description="Tente ajustar os filtros ou limpar a busca."
          action={
            <Button variant="outline" onClick={clearFilters}>
              Limpar filtros
            </Button>
          }
        />
      ) : view === "table" ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pessoa</TableHead>
                  <TableHead>Cargo / Senioridade</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Gestor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Tendência</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <EmployeeTableRow
                    key={e.id}
                    employee={e}
                    deptName={deptById.get(e.department_id ?? "") ?? "—"}
                    managerName={empById.get(e.manager_id ?? "") ?? "—"}
                    score={latest.get(e.id)?.current ?? null}
                    previous={latest.get(e.id)?.previous ?? null}
                    onEdit={() => {
                      setEditing(e);
                      setOpenForm(true);
                    }}
                    onDeactivate={() => setToDeactivate(e)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
          {hasAnyFilter && (
            <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
              Mostrando {filtered.length} de {employees.length} colaboradores ·{" "}
              <button onClick={clearFilters} className="underline">
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((e) => (
            <EmployeeCard
              key={e.id}
              employee={e}
              deptName={deptById.get(e.department_id ?? "") ?? "—"}
              score={latest.get(e.id)?.current ?? null}
            />
          ))}
        </div>
      )}

      <EmployeeFormDialog open={openForm} onOpenChange={setOpenForm} employee={editing} />

      <AlertDialog open={!!toDeactivate} onOpenChange={(o) => !o && setToDeactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar colaborador?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao desativar {toDeactivate?.name}, ele não aparecerá mais como ativo nos cálculos
              principais, mas o histórico será preservado. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate}>Desativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function EmployeeTableRow({
  employee,
  deptName,
  managerName,
  score,
  previous,
  onEdit,
  onDeactivate,
}: {
  employee: EmployeeRow;
  deptName: string;
  managerName: string;
  score: number | null;
  previous: number | null;
  onEdit: () => void;
  onDeactivate: () => void;
}) {
  const status = scoreToStatus(score);
  const diff = score !== null && previous !== null ? score - previous : null;

  return (
    <TableRow>
      <TableCell>
        <Link
          to="/colaboradores/$id"
          params={{ id: employee.id }}
          className="flex items-center gap-3 hover:underline"
        >
          <Avatar className="h-9 w-9">
            {employee.avatar_url && <AvatarImage src={employee.avatar_url} alt={employee.name} />}
            <AvatarFallback className="text-xs">{initials(employee.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">{employee.name}</div>
            <div className="truncate text-xs text-muted-foreground">{employee.email ?? "—"}</div>
          </div>
        </Link>
      </TableCell>
      <TableCell className="text-sm">
        <div className="font-medium text-foreground">{employee.role ?? "—"}</div>
        <div className="text-xs text-muted-foreground">{employee.seniority ?? "—"}</div>
      </TableCell>
      <TableCell className="text-sm text-foreground">{deptName}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{managerName}</TableCell>
      <TableCell>
        <StatusBadge tone={employee.status === "active" ? "info" : "neutral"}>
          {STATUS_LABEL[employee.status]}
        </StatusBadge>
      </TableCell>
      <TableCell>
        {score === null ? (
          <span className="text-xs text-muted-foreground">Sem score</span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {Math.round(score)}
            </span>
            <StatusBadge tone={status}>{scoreLabel(status)}</StatusBadge>
          </div>
        )}
      </TableCell>
      <TableCell>
        {diff === null ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Minus className="h-3 w-3" /> —
          </span>
        ) : diff > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-status-good">
            <ArrowUpRight className="h-3 w-3" /> +{diff.toFixed(1)}
          </span>
        ) : diff < 0 ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-status-risk">
            <ArrowDownRight className="h-3 w-3" /> {diff.toFixed(1)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Minus className="h-3 w-3" /> 0
          </span>
        )}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/colaboradores/$id" params={{ id: employee.id }}>
                <Eye className="mr-2 h-4 w-4" /> Ver perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast("Disponível em breve.")}>
              <ClipboardCheck className="mr-2 h-4 w-4" /> Registrar KPI
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast("Disponível em breve.")}>
              <MessageSquare className="mr-2 h-4 w-4" /> Registrar feedback
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast("Disponível em breve.")}>
              <CalendarPlus className="mr-2 h-4 w-4" /> Agendar 1:1
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDeactivate}
              className="text-status-risk focus:text-status-risk"
            >
              <UserMinus className="mr-2 h-4 w-4" /> Desativar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function EmployeeCard({
  employee,
  deptName,
  score,
}: {
  employee: EmployeeRow;
  deptName: string;
  score: number | null;
}) {
  const status = scoreToStatus(score);
  return (
    <Link
      to="/colaboradores/$id"
      params={{ id: employee.id }}
      className="group rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-foreground/20 hover:shadow"
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11">
          {employee.avatar_url && <AvatarImage src={employee.avatar_url} alt={employee.name} />}
          <AvatarFallback>{initials(employee.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground group-hover:underline">
            {employee.name}
          </div>
          <div className="truncate text-xs text-muted-foreground">{employee.role ?? "—"}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate">{deptName}</span>
        <StatusBadge tone={employee.status === "active" ? "info" : "neutral"}>
          {STATUS_LABEL[employee.status]}
        </StatusBadge>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">Score atual</span>
        {score === null ? (
          <span className="text-xs text-muted-foreground">Sem score</span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold tabular-nums text-foreground">
              {Math.round(score)}
            </span>
            <StatusBadge tone={status}>{scoreLabel(status)}</StatusBadge>
          </div>
        )}
      </div>
    </Link>
  );
}
