import Image from "next/image";

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
    <span className={cn("flex items-center gap-3", className)}>
      <span className="bg-primary text-primary-foreground shadow-primary/20 flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm">
        <LogoMark className="size-5" />
      </span>
      <span className="min-w-0 leading-none">
        <span className="block font-semibold tracking-tight">Fila Viva</span>
        <span className="text-muted-foreground mt-1 block text-[11px] font-medium tracking-wide">
          Gestão de vagas
        </span>
      </span>
    </span>
  );
}

export function RioEducacaoLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo-prefeitura-rio-educacao.png"
      alt="Prefeitura do Rio — Educação"
      width={1570}
      height={398}
      className={cn("h-auto w-full", className)}
    />
  );
}
