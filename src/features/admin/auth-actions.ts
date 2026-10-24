"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { createSessionClient } from "@/server/supabase";
import { headers } from "next/headers";

export type LoginState = { error?: string } | null;

export async function signIn(_prev: LoginState, form: FormData): Promise<LoginState> {
  const parsed = z
    .object({ email: z.email(), password: z.string().min(1).max(200), next: z.string().optional() })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "E-mail ou mot de passe incorrect." };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`login:${ip}`, 10, 60_000)) return { error: "Trop de tentatives. Réessayez dans une minute." };

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error || !data.user) return { error: "E-mail ou mot de passe incorrect." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (profile?.role !== "staff" && profile?.role !== "admin") {
    await supabase.auth.signOut();
    return { error: "Ce compte n'a pas accès à l'administration." };
  }
  // Only same-site admin paths are accepted as a return address.
  const next = parsed.data.next?.startsWith("/admin") && !parsed.data.next.startsWith("//") ? parsed.data.next : "/admin";
  redirect(next);
}

export async function signOut() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
