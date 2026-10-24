// The real root layout (with <html>) is src/app/[locale]/layout.tsx; this one only exists so that
// not-found pages outside a locale can render.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
