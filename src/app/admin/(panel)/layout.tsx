import { Sidebar } from "@/components/admin/sidebar";
import { requireStaff } from "@/server/auth";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar email={staff.email} role={staff.role} />
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
