import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Placeholder } from "@/components/placeholder";

export const metadata: Metadata = { title: "Unidades" };

export default function UnidadesPage() {
  return (
    <>
      <PageHeader
        titulo="Unidades"
        descricao="872 unidades da rede direta, conveniada e em parceria, com oferta e ocupação."
      />
      <Placeholder
        titulo="Oferta e ocupação"
        descricao="Capacidade por grupamento e turno contra a demanda do território."
      />
    </>
  );
}
