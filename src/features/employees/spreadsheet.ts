import type { DepartmentRow, EmployeeInput, EmployeeRow, EmployeeStatus } from "@/lib/php-data";

type ImportContext = {
  departments: DepartmentRow[];
  employees: EmployeeRow[];
};

export type ImportedEmployee = {
  input: EmployeeInput;
  rowNumber: number;
};

export type EmployeeImportResult = {
  employees: ImportedEmployee[];
  skipped: { rowNumber: number; reason: string }[];
};

const EXPORT_HEADERS = [
  "ID",
  "Nome",
  "E-mail",
  "Status",
  "Área",
  "Cargo",
  "Gestor",
  "Senioridade",
  "Data de admissão",
  "Modelo de trabalho",
  "Tipo de contrato",
  "Perfil comportamental",
  "Observações",
  "URL da foto",
  "ID do perfil de acesso",
] as const;

const STATUS_BY_LABEL: Record<string, EmployeeStatus> = {
  ativo: "active",
  active: "active",
  ferias: "vacation",
  férias: "vacation",
  vacation: "vacation",
  afastado: "leave",
  afastada: "leave",
  leave: "leave",
  inativo: "inactive",
  inativa: "inactive",
  inactive: "inactive",
};

export async function parseEmployeesSpreadsheet(
  file: File,
  context: ImportContext,
): Promise<EmployeeImportResult> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return { employees: [], skipped: [{ rowNumber: 0, reason: "A planilha não possui abas." }] };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  const departmentByName = new Map(
    context.departments.map((department) => [normalizeKey(department.name), department.id]),
  );
  const employeeByName = new Map(
    context.employees.map((employee) => [normalizeKey(employee.name), employee.id]),
  );
  const imported: ImportedEmployee[] = [];
  const skipped: EmployeeImportResult["skipped"] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const name = getCell(row, ["nome", "nome completo", "colaborador", "pessoa", "name"]);

    if (!name) {
      skipped.push({ rowNumber, reason: "Linha sem nome." });
      return;
    }

    const departmentName = getCell(row, ["area", "área", "departamento", "setor", "time"]);
    const managerName = getCell(row, ["gestor", "lider", "líder", "manager"]);
    const status = normalizeStatus(getCell(row, ["status", "situacao", "situação"]));

    imported.push({
      rowNumber,
      input: {
        name,
        email: null,
        role: optional(getCell(row, ["cargo", "funcao", "função", "role"])),
        department_id: departmentName
          ? (departmentByName.get(normalizeKey(departmentName)) ?? null)
          : null,
        manager_id: managerName ? (employeeByName.get(normalizeKey(managerName)) ?? null) : null,
        seniority: optional(getCell(row, ["senioridade", "nivel", "nível", "seniority"])),
        hire_date: normalizeDate(
          getCell(row, ["data de admissão", "admissao", "admissão", "hire date"]),
        ),
        avatar_url: optional(getCell(row, ["foto", "avatar", "url da foto", "url foto"])),
        notes: optional(getCell(row, ["observacoes", "observações", "notas", "notes"])),
        location: optional(
          getCell(row, ["modelo de trabalho", "localizacao", "localização", "location"]),
        ),
        contract_type: optional(getCell(row, ["tipo de contrato", "contrato", "contract type"])),
        behavioral_profile: optional(
          getCell(row, ["perfil comportamental", "perfil", "behavioral profile"]),
        ),
        status,
      },
    });
  });

  return { employees: imported, skipped };
}

export async function exportEmployeesSpreadsheet(
  employees: EmployeeRow[],
  departments: DepartmentRow[],
) {
  const XLSX = await import("xlsx");
  const departmentById = new Map(departments.map((department) => [department.id, department.name]));
  const employeeById = new Map(employees.map((employee) => [employee.id, employee.name]));
  const data = employees.map((employee) => ({
    ID: employee.id,
    Nome: employee.name,
    "E-mail": employee.email ?? "",
    Status: employee.status,
    Área: employee.department_id ? (departmentById.get(employee.department_id) ?? "") : "",
    Cargo: employee.role ?? "",
    Gestor: employee.manager_id ? (employeeById.get(employee.manager_id) ?? "") : "",
    Senioridade: employee.seniority ?? "",
    "Data de admissão": employee.hire_date ?? "",
    "Modelo de trabalho": employee.location ?? "",
    "Tipo de contrato": employee.contract_type ?? "",
    "Perfil comportamental": employee.behavioral_profile ?? "",
    Observações: employee.notes ?? "",
    "URL da foto": employee.avatar_url ?? "",
    "ID do perfil de acesso": employee.profile_id ?? "",
  }));

  const sheet = XLSX.utils.json_to_sheet(data, { header: [...EXPORT_HEADERS] });
  sheet["!cols"] = EXPORT_HEADERS.map((header) => ({ wch: Math.max(14, header.length + 4) }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Colaboradores");
  XLSX.writeFile(workbook, buildExportFileName());
}

function getCell(row: Record<string, unknown>, aliases: string[]): string {
  const normalizedAliases = new Set(aliases.map(normalizeKey));
  for (const [key, value] of Object.entries(row)) {
    if (!normalizedAliases.has(normalizeKey(key))) continue;
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function optional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeStatus(value: string): EmployeeStatus {
  const normalized = normalizeKey(value);
  return STATUS_BY_LABEL[normalized] ?? "active";
}

function normalizeDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const brMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (brMatch) {
    const year = brMatch[3].length === 2 ? `20${brMatch[3]}` : brMatch[3];
    return `${year}-${brMatch[2].padStart(2, "0")}-${brMatch[1].padStart(2, "0")}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildExportFileName(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `colaboradores-${today}.xlsx`;
}
