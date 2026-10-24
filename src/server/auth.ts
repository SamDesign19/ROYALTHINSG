import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSessionClient } from "./supabase";

export type StaffRole = "staff" | "admin";
export type Staff = { id: string; email: string | null; name: string | null; role: StaffRole };

/** The signed-in staff member, or null (signed out, or a customer account). Checked on the Auth server. */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", data.user.id).maybeSingle();
  if (!profile || (profile.role !== "staff" && profile.role !== "admin")) return null;
  return { id: data.user.id, email: data.user.email ?? null, name: profile.full_name, role: profile.role };
});

/** For admin pages and Server Actions: redirects to the login page unless a staff member is signed in. */
export async function requireStaff(): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  return staff;
}

export async function requireAdmin(): Promise<Staff> {
  const staff = await requireStaff();
  if (staff.role !== "admin") redirect("/admin");
  return staff;
}
