import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Search,
  Plus,
  Upload,
  Download,
  Users,
  MoreHorizontal,
  Pencil,
  UserMinus,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  SlidersHorizontal,
  X,
  LayoutGrid,
  List,
} from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { EmptyState } from "@/components/php/EmptyState";
import { StatusBadge } from "@/components/php/StatusBadge";
import { EmployeeFormDialog } from "@/components/php/EmployeeFormDialog";
import { EmployeeAccessButton } from "@/components/php/EmployeeAccessButton";
import { scoreToStatus, scoreLabel } from "@/components/php/types";
import { cn } from "@/lib/utils";
import {
  useEmployees,
  useDepartments,
  useDeactivateEmployee,
  latestSnapshotsByEmployee,
  initials,
  STATUS_LABEL,
  SENIORITY_OPTIONS,
  type EmployeeRow,
  type EmployeeStatus,
} from "@/lib/php-data";
import { usePerformanceWorkspaceData } from "@/features/performance/workspace-data";

export const Route = createFileRoute("/_app/colaboradores")({
  head: () => ({
    meta: [
      { title: "Colaboradores · Performativo" },
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

const SCORE_CHIPS: {
  value: ScoreFilter;
  label: string;
  tone: "excellent" | "good" | "attention" | "risk" | "critical" | "neutral" | "all";
}[] = [
  { value: "all", label: "Todos", tone: "all" },
  { value: "excellent", label: "Alto", tone: "excellent" },
  { value: "good", label: "Bom", tone: "good" },
  { value: "attention", label: "Atenção", tone: "attention" },
  { value: "risk", label: "Risco", tone: "risk" },
  { value: "critical", label: "Crítico", tone: "critical" },
  { value: "none", label: "Sem score", tone: "neutral" },
];

function ColaboradoresPage() {
  const { data: employees = [], isLoading } = useEmployees();
  const { data: departments = [] } = useDepartments();
  const performanceData = usePerformanceWorkspaceData(employees);
  const deactivate = useDeactivateEmployee();

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [toDeactivate, setToDeactivate] = useState<EmployeeRow | null>(null);

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [seniorityFilter, setSeniorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [view, setView] = useState<"table" | "cards">("table");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const latest = useMemo(
    () => latestSnapshotsByEmployee(performanceData.snapshots),
    [performanceData.snapshots],
  );
  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);

  const buckets = useMemo(() => {
    const active = employees.filter((e) => e.status === "active");
    const counts = { excellent: 0, good: 0, attention: 0, risk: 0, critical: 0, none: 0 };
    for (const e of active) {
      const score = latest.get(e.id)?.current ?? null;
      const status = scoreToStatus(score);
      if (status === "neutral") counts.none++;
      else counts[status]++;
    }
    return { active: active.length, total: employees.length, ...counts };
  }, [employees, latest]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (q) {
        const hay = [e.name, e.email ?? "", deptById.get(e.department_id ?? "") ?? ""]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (deptFilter !== "all" && e.department_id !== deptFilter) return false;
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
  }, [employees, search, deptFilter, seniorityFilter, statusFilter, scoreFilter, latest, deptById]);

  const activeFilters: { key: string; label: string; clear: () => void }[] = [];
  if (deptFilter !== "all") {
    activeFilters.push({
      key: "dept",
      label: `Área: ${deptById.get(deptFilter) ?? "—"}`,
      clear: () => setDeptFilter("all"),
    });
  }
  if (seniorityFilter !== "all") {
    activeFilters.push({
      key: "sen",
      label: `Senioridade: ${seniorityFilter}`,
      clear: () => setSeniorityFilter("all"),
    });
  }
  if (statusFilter !== "all") {
    activeFilters.push({
      key: "status",
      label: `Status: ${STATUS_LABEL[statusFilter as EmployeeStatus] ?? statusFilter}`,
      clear: () => setStatusFilter("all"),
    });
  }

  const popoverFilterCount = activeFilters.length;
  const hasAnyFilter = !!search || popoverFilterCount > 0 || scoreFilter !== "all";

  function clearFilters() {
    setSearch("");
    setDeptFilter("all");
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
    <div className="space-y-5">
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Colaboradores
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Encontre rapidamente quem está em destaque, quem precisa de atenção e quem ainda não foi
            avaliado.
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => toast("Disponível em breve.")}
          >
            <Upload className="h-4 w-4" /> Importar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => toast("Disponível em breve.")}
          >
            <Download className="h-4 w-4" /> Exportar
          </Button>
          <Button
            size="sm"
            className="col-span-2 w-full sm:col-span-1 sm:w-auto"
            onClick={() => {
              setEditing(null);
              setOpenForm(true);
            }}
          >
            <Plus className="h-4 w-4" /> Novo colaborador
          </Button>
        </div>
      </div>

      {/* Compact status strip */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <StatStripItem label="Ativos" value={buckets.active} hint={`${buckets.total} total`} />
        <StatStripDot tone="excellent" label="Alto" value={buckets.excellent} />
        <StatStripDot tone="good" label="Bom" value={buckets.good} />
        <StatStripDot tone="attention" label="Atenção" value={buckets.attention} />
        <StatStripDot tone="risk" label="Risco" value={buckets.risk} />
        <StatStripDot tone="critical" label="Crítico" value={buckets.critical} />
        <StatStripDot tone="neutral" label="Sem score" value={buckets.none} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou área..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 w-full sm:w-auto">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtros
                  {popoverFilterCount > 0 && (
                    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold tabular-nums text-primary-foreground">
                      {popoverFilterCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[calc(100vw-2rem)] max-w-80 p-3">
                <div className="grid grid-cols-1 gap-3">
                  <FilterField label="Área">
                    <FilterSelect
                      value={deptFilter}
                      onChange={setDeptFilter}
                      placeholder="Todas as áreas"
                      options={[
                        { value: "all", label: "Todas as áreas" },
                        ...departments.map((d) => ({ value: d.id, label: d.name })),
                      ]}
                    />
                  </FilterField>
                  <FilterField label="Senioridade">
                    <FilterSelect
                      value={seniorityFilter}
                      onChange={setSeniorityFilter}
                      placeholder="Todas senioridades"
                      options={[
                        { value: "all", label: "Todas senioridades" },
                        ...SENIORITY_OPTIONS.map((s) => ({ value: s, label: s })),
                      ]}
                    />
                  </FilterField>
                  <FilterField label="Status">
                    <FilterSelect
                      value={statusFilter}
                      onChange={setStatusFilter}
                      placeholder="Todos os status"
                      options={[
                        { value: "all", label: "Todos os status" },
                        ...(Object.keys(STATUS_LABEL) as EmployeeStatus[]).map((s) => ({
                          value: s,
                          label: STATUS_LABEL[s],
                        })),
                      ]}
                    />
                  </FilterField>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={clearFilters}
                    disabled={!hasAnyFilter}
                  >
                    Limpar tudo
                  </Button>
                  <Button size="sm" className="h-8 text-xs" onClick={() => setFiltersOpen(false)}>
                    Aplicar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <div className="inline-flex h-9 w-full items-center rounded-md border border-border bg-background p-0.5 sm:w-auto">
              <button
                type="button"
                onClick={() => setView("table")}
                className={cn(
                  "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-sm px-2 text-xs font-medium transition sm:flex-none",
                  view === "table"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="Tabela"
              >
                <List className="h-3.5 w-3.5" />
                Tabela
              </button>
              <button
                type="button"
                onClick={() => setView("cards")}
                className={cn(
                  "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-sm px-2 text-xs font-medium transition sm:flex-none",
                  view === "cards"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="Cards"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Cards
              </button>
            </div>
          </div>
        </div>

        {/* Score chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Desempenho
          </span>
          {SCORE_CHIPS.map((chip) => {
            const active = scoreFilter === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setScoreFilter(chip.value)}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {chip.tone !== "all" && (
                  <span
                    aria-hidden
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      chip.tone === "excellent" && "bg-status-excellent",
                      chip.tone === "good" && "bg-status-good",
                      chip.tone === "attention" && "bg-status-attention",
                      chip.tone === "risk" && "bg-status-risk",
                      chip.tone === "critical" && "bg-status-critical",
                      chip.tone === "neutral" && "bg-muted-foreground/50",
                    )}
                  />
                )}
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Active filters row */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Aplicados
            </span>
            {activeFilters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={f.clear}
                className="inline-flex h-7 items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs font-medium text-foreground hover:bg-muted/70"
              >
                {f.label}
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
            <button
              type="button"
              onClick={clearFilters}
              className="ml-1 text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
            >
              Limpar tudo
            </button>
          </div>
        )}
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
              <Plus className="h-4 w-4" /> Cadastrar primeiro colaborador
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
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-10 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Pessoa
                    </TableHead>
                    <TableHead className="h-10 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Área
                    </TableHead>
                    <TableHead className="h-10 w-[220px] text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Desempenho
                    </TableHead>
                    <TableHead className="h-10 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Tendência
                    </TableHead>
                    <TableHead className="h-10 w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e) => (
                    <EmployeeTableRow
                      key={e.id}
                      employee={e}
                      deptName={deptById.get(e.department_id ?? "") ?? "—"}
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
            <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
              <span>
                Mostrando{" "}
                <span className="font-medium tabular-nums text-foreground">{filtered.length}</span>{" "}
                de <span className="tabular-nums">{employees.length}</span> colaboradores
              </span>
              {hasAnyFilter && (
                <button onClick={clearFilters} className="underline-offset-2 hover:underline">
                  Limpar filtros
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filtered.map((e) => (
              <EmployeeCard
                key={e.id}
                employee={e}
                deptName={deptById.get(e.department_id ?? "") ?? "—"}
                score={latest.get(e.id)?.current ?? null}
                previous={latest.get(e.id)?.previous ?? null}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((e) => (
            <EmployeeCard
              key={e.id}
              employee={e}
              deptName={deptById.get(e.department_id ?? "") ?? "—"}
              score={latest.get(e.id)?.current ?? null}
              previous={latest.get(e.id)?.previous ?? null}
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

function StatStripItem({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-xl font-semibold tabular-nums text-foreground">{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

function StatStripDot({
  tone,
  label,
  value,
}: {
  tone: "excellent" | "good" | "attention" | "risk" | "critical" | "neutral";
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        aria-hidden
        className={cn(
          "h-2 w-2 rounded-full",
          tone === "excellent" && "bg-status-excellent",
          tone === "good" && "bg-status-good",
          tone === "attention" && "bg-status-attention",
          tone === "risk" && "bg-status-risk",
          tone === "critical" && "bg-status-critical",
          tone === "neutral" && "bg-muted-foreground/40",
        )}
      />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
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

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-24 rounded-full bg-muted" />
        <span className="text-xs text-muted-foreground">Sem score</span>
      </div>
    );
  }
  const status = scoreToStatus(score);
  const pct = Math.max(2, Math.min(100, Math.round(score)));
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            status === "excellent" && "bg-status-excellent",
            status === "good" && "bg-status-good",
            status === "attention" && "bg-status-attention",
            status === "risk" && "bg-status-risk",
            status === "critical" && "bg-status-critical",
            status === "neutral" && "bg-muted-foreground/40",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-7 text-sm font-semibold tabular-nums text-foreground">
        {Math.round(score)}
      </span>
      <StatusBadge tone={status}>{scoreLabel(status)}</StatusBadge>
    </div>
  );
}

function EmployeeTableRow({
  employee,
  deptName,
  score,
  previous,
  onEdit,
  onDeactivate,
}: {
  employee: EmployeeRow;
  deptName: string;
  score: number | null;
  previous: number | null;
  onEdit: () => void;
  onDeactivate: () => void;
}) {
  const diff = score !== null && previous !== null ? score - previous : null;
  const inactive = employee.status !== "active";
  const avatarUrl = employee.avatar_display_url ?? employee.avatar_url;

  return (
    <TableRow className={cn(inactive && "opacity-70")}>
      <TableCell className="py-2.5">
        <Link
          to="/colaboradores/$id"
          params={{ id: employee.id }}
          className="flex items-center gap-3 hover:underline"
        >
          <Avatar className="h-8 w-8">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={employee.name} />}
            <AvatarFallback className="bg-primary/10 text-[11px] font-medium text-primary">
              {initials(employee.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-medium text-foreground">{employee.name}</span>
              {inactive && (
                <StatusBadge tone="neutral">{STATUS_LABEL[employee.status]}</StatusBadge>
              )}
            </div>
            <div className="truncate text-xs text-muted-foreground">{employee.email ?? "—"}</div>
          </div>
        </Link>
      </TableCell>
      <TableCell className="py-2.5 text-sm text-foreground">{deptName}</TableCell>
      <TableCell className="py-2.5">
        <ScoreBar score={score} />
      </TableCell>
      <TableCell className="py-2.5">
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
      <TableCell className="py-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            <EmployeeAccessButton
              variant="menu-item"
              employeeId={employee.id}
              employeeName={employee.name}
              hasAccess={!!employee.profile_id}
              defaultEmail={employee.email}
            />
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
  previous,
}: {
  employee: EmployeeRow;
  deptName: string;
  score: number | null;
  previous: number | null;
}) {
  const diff = score !== null && previous !== null ? score - previous : null;
  const avatarUrl = employee.avatar_display_url ?? employee.avatar_url;
  const displayEmail = employee.email?.trim() || null;
  return (
    <Link
      to="/colaboradores/$id"
      params={{ id: employee.id }}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-foreground/20 hover:shadow"
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={employee.name} />}
          <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
            {initials(employee.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground group-hover:underline">
            {employee.name}
          </div>
          <div className="truncate text-xs text-muted-foreground">{deptName}</div>
        </div>
        {employee.status !== "active" && (
          <StatusBadge tone="neutral">{STATUS_LABEL[employee.status]}</StatusBadge>
        )}
      </div>
      <div
        className="h-5 truncate text-xs leading-5 text-muted-foreground"
        aria-label={displayEmail ? `E-mail: ${displayEmail}` : "E-mail ainda não cadastrado"}
      >
        {displayEmail ?? (
          <span aria-hidden="true" className="invisible">
            email@empresa.com
          </span>
        )}
      </div>
      <div className="border-t border-border pt-3">
        <ScoreBar score={score} />
        {diff !== null && diff !== 0 && (
          <div className="mt-1.5 text-[11px] text-muted-foreground">
            {diff > 0 ? (
              <span className="inline-flex items-center gap-1 text-status-good">
                <ArrowUpRight className="h-3 w-3" /> +{diff.toFixed(1)} vs. anterior
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-status-risk">
                <ArrowDownRight className="h-3 w-3" /> {diff.toFixed(1)} vs. anterior
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
