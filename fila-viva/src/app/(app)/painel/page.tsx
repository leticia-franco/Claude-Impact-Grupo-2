import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Placeholder } from "@/components/placeholder";

export const metadata: Metadata = { title: "Painel" };

export default function PainelPage() {
  return (
    <>
      <PageHeader
        titulo="Painel"
        descricao="Fila real por unidade e turno, ofertas em aberto e prazo correndo."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Placeholder
          titulo="Fila real x fila publicada"
          descricao="Crianças distintas contra posições em lista de espera, por CRE."
        />
        <Placeholder
          titulo="Ofertas em risco"
          descricao="Vagas selecionadas com prazo de confirmação vencendo nas próximas 24h."
        />
      </div>
    </>
  );
}
