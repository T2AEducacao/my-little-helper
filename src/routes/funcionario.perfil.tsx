import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2, Trash2, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_employee/perfil")({
  component: EmployeeProfilePage,
});

type Me = {
  userId: string;
  employeeId: string | null;
  name: string;
  avatarPath: string | null;
  avatarSignedUrl: string | null;
};

const SIGNED_TTL = 60 * 60; // 1h

async function fetchMe(): Promise<Me | null> {
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) return null;
  const { data: emp } = await supabase
    .from("employees")
    .select("id,name,avatar_url")
    .eq("profile_id", user.id)
    .maybeSingle();
  let signed: string | null = null;
  const path = emp?.avatar_url ?? null;
  if (path && !/^https?:\/\//.test(path)) {
    const { data } = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, SIGNED_TTL);
    signed = data?.signedUrl ?? null;
  } else if (path) {
    signed = path;
  }
  return {
    userId: user.id,
    employeeId: emp?.id ?? null,
    name: emp?.name ?? user.email ?? "Colaborador",
    avatarPath: path,
    avatarSignedUrl: signed,
  };
}

function EmployeeProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    setLoading(true);
    const m = await fetchMe();
    setMe(m);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const onPick = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !me) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB.");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${me.userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      if (me.employeeId) {
        const { error: dbErr } = await supabase
          .from("employees")
          .update({ avatar_url: path })
          .eq("id", me.employeeId);
        if (dbErr) throw dbErr;
      }

      // remove old file if existed and differs
      if (me.avatarPath && me.avatarPath !== path && !/^https?:\/\//.test(me.avatarPath)) {
        await supabase.storage.from("avatars").remove([me.avatarPath]);
      }

      toast.success("Foto atualizada.");
      await refresh();
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível enviar a foto.");
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async () => {
    if (!me || !me.avatarPath) return;
    setBusy(true);
    try {
      if (!/^https?:\/\//.test(me.avatarPath)) {
        await supabase.storage.from("avatars").remove([me.avatarPath]);
      }
      if (me.employeeId) {
        await supabase
          .from("employees")
          .update({ avatar_url: null })
          .eq("id", me.employeeId);
      }
      toast.success("Foto removida.");
      await refresh();
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível remover a foto.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Editar Perfil</h2>
        <p className="text-sm text-muted-foreground">Atualize sua foto de perfil.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : !me?.employeeId ? (
          <div className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">
            Sua conta ainda não está vinculada a um colaborador. Peça ao seu líder para
            concluir o vínculo.
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <Avatar className="h-28 w-28">
              {me.avatarSignedUrl && (
                <AvatarImage src={me.avatarSignedUrl} alt={me.name} />
              )}
              <AvatarFallback className="bg-primary/10 text-2xl text-primary">
                {me.name
                  .split(" ")
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase() ?? "")
                  .join("") || <UserRound className="h-8 w-8" />}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-1 flex-col gap-2">
              <div>
                <div className="text-base font-semibold">{me.name}</div>
                <div className="text-xs text-muted-foreground">
                  PNG, JPG ou WEBP, até 5MB.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={onPick} disabled={busy} size="sm">
                  <Camera className="h-4 w-4" />
                  {me.avatarPath ? "Trocar foto" : "Enviar foto"}
                </Button>
                {me.avatarPath && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRemove}
                    disabled={busy}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </Button>
                )}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFile}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
