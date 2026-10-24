import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/store/logo";
import { getStaff } from "@/server/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await getStaff()) redirect("/admin");
  const next = (await searchParams).next;
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 rounded-card border border-line bg-bg p-8 shadow-1">
        <div className="space-y-2">
          <Logo />
          <h1 className="text-xl font-semibold">Administration</h1>
          <p className="text-sm text-ink-2">Accès réservé à l&apos;équipe ROYAL INK.</p>
        </div>
        <LoginForm next={typeof next === "string" ? next : ""} />
      </div>
    </main>
  );
}
