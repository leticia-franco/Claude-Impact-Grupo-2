import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Placeholder } from "@/components/placeholder";

export const metadata: Metadata = { title: "Fila" };

export default function FilaPage() {
  return (
    <>
      <PageHeader
        titulo="Fila"
        descricao="Ordenação por unidade, turno e grupamento, com a régua de pontuação do processo vigente."
      />
      <Placeholder
        titulo="Fila por unidade e turno"
        descricao="Lista de espera deduplicada por criança, com a pontuação que gerou a posição."
      />
    </>
  );
}
