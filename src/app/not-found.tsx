import Link from "next/link";
import "./globals.css";

// Requests outside /ar, /fr, /en that the proxy did not redirect (rare). Kept language-neutral.
export default function GlobalNotFound() {
  return (
    <html lang="fr">
      <body className="flex min-h-dvh items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <p className="text-4xl font-semibold">404</p>
          <p className="text-ink-2">Page introuvable · الصفحة غير موجودة · Page not found</p>
          <Link href="/" className="inline-flex min-h-11 items-center rounded-control bg-accent px-5 text-sm font-medium text-accent-ink">
            ROYAL INK
          </Link>
        </div>
      </body>
    </html>
  );
}
