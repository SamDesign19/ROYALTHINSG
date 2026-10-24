/** Abstract hero illustration: four process-colour drops (CMYK) on the surface tone. Decorative only. */
export function HeroArt({ className }: { className?: string }) {
  const drop = "M0-46c18 21 32 39 32 55a32 32 0 0 1-64 0c0-16 14-34 32-55Z";
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden>
      <rect width="400" height="400" rx="24" fill="var(--ri-surface)" />
      <g opacity="0.95">
        <path d={drop} transform="translate(140 150) scale(1.15)" fill="#00a3e0" />
        <path d={drop} transform="translate(262 158) scale(1.15)" fill="#d6007e" />
        <path d={drop} transform="translate(150 280) scale(1.15)" fill="#ffd200" />
        <path d={drop} transform="translate(268 282) scale(1.15)" fill="var(--ri-ink)" />
      </g>
      <circle cx="204" cy="216" r="9" fill="var(--ri-red)" />
    </svg>
  );
}
