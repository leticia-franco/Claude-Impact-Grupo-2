"use client";

import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

/** Aba lateral direita; fecha removendo o parâmetro ?crianca da URL. */
export function DrawerCrianca({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fecha = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete("crianca");
    router.push(`/fila?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") fecha();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [fecha]);

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Fechar detalhe"
        className="absolute inset-0 bg-black/30"
        onClick={fecha}
      />
      <aside className="bg-background absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l shadow-xl">
        <header className="flex items-center justify-between gap-4 border-b p-4">
          <h2 className="truncate text-base font-semibold">{titulo}</h2>
          <Button variant="ghost" size="sm" onClick={fecha}>
            Fechar
          </Button>
        </header>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
          {children}
        </div>
      </aside>
    </div>
  );
}
