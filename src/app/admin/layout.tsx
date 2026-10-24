import type { Metadata } from "next";
import { inter } from "../fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s · Admin ROYAL INK" },
  robots: { index: false, follow: false },
};

// Back office root layout: French, left-to-right, never cached (every page depends on the session).
export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr" className={inter.variable}>
      <body className="min-h-dvh bg-surface">{children}</body>
    </html>
  );
}
