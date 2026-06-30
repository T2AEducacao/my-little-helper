import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const inputSchema = z.object({
  employee_id: z.string().uuid(),
  email: z.string().email(),
});

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out + "!7";
}

export const provisionEmployeeAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Confirm caller is admin
    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Apenas administradores podem criar acessos.");

    // Caller's company
    const { data: callerProfile, error: callerErr } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();
    if (callerErr) throw new Error(callerErr.message);
    const companyId = callerProfile?.company_id;
    if (!companyId) throw new Error("Empresa do administrador não encontrada.");

    // Target employee (RLS already scopes to company)
    const { data: employee, error: empErr } = await supabase
      .from("employees")
      .select("id, name, profile_id, company_id")
      .eq("id", data.employee_id)
      .eq("company_id", companyId)
      .maybeSingle();
    if (empErr) throw new Error(empErr.message);
    if (!employee) throw new Error("Colaborador não encontrado.");
    if (employee.profile_id) {
      throw new Error("Este colaborador já possui um acesso vinculado.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const password = generatePassword();

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: employee.name, company_id: companyId },
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Falha ao criar usuário.");
    }
    const newUserId = created.user.id;

    // Profile
    const { error: profErr } = await supabaseAdmin.from("profiles").upsert({
      id: newUserId,
      company_id: companyId,
      name: employee.name,
      email: data.email,
      user_type: "employee",
    });
    if (profErr) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error(profErr.message);
    }

    // Role
    const { error: roleInsertErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: newUserId,
      role: "employee",
      company_id: companyId,
    });
    if (roleInsertErr) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error(roleInsertErr.message);
    }

    const { error: elevatedRolesErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", newUserId)
      .eq("company_id", companyId)
      .in("role", ["admin", "manager"]);
    if (elevatedRolesErr) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error(elevatedRolesErr.message);
    }

    // Link employee
    const { error: linkErr } = await supabaseAdmin
      .from("employees")
      .update({ profile_id: newUserId })
      .eq("id", data.employee_id)
      .eq("company_id", companyId);
    if (linkErr) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error(linkErr.message);
    }

    return { email: data.email, password };
  });
