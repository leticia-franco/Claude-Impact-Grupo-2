import { cn } from "@/lib/utils";

/** Marca do Fila Viva: barras da fila, a primeira já chamada. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("size-6", className)}
    >
      <rect x="3" y="4" width="18" height="4" rx="2" fill="currentColor" />
      <rect x="3" y="10" width="13" height="4" rx="2" fill="currentColor" opacity="0.55" />
      <rect x="3" y="16" width="8" height="4" rx="2" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark className="text-primary" />
      Fila Viva
    </span>
  );
}
