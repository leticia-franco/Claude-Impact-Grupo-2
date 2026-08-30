"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { TableRow } from "@/components/ui/table";

/** Linha de tabela que abre a aba lateral da criança (?crianca=...). */
export function LinhaClicavel({
  criancaId,
  children,
}: {
  criancaId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <TableRow
      className="hover:bg-muted/60 cursor-pointer"
      onClick={() => {
        const params = new URLSearchParams(searchParams);
        params.set("crianca", criancaId);
        router.push(`/fila?${params.toString()}`, { scroll: false });
      }}
    >
      {children}
    </TableRow>
  );
}
