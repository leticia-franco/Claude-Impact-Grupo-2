import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Placeholder } from "@/components/placeholder";

export const metadata: Metadata = { title: "Convocações" };

export default function ConvocacoesPage() {
  return (
    <>
      <PageHeader
        titulo="Convocações"
        descricao="Tentativas de contato, prazo de comparecimento e desfecho de cada chamada."
      />
      <Placeholder
        titulo="Chamadas em andamento"
        descricao="Registro das 3 tentativas por dia e do prazo de 3 dias úteis previsto na resolução."
      />
    </>
  );
}
