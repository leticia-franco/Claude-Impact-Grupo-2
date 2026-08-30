"use client";

import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  GRUPAMENTO_LABEL,
  GRUPAMENTOS,
  TURNO_LABEL,
  TURNOS,
} from "@/lib/fila/logica";

type Opcao = { valor: string; rotulo: string };

const controleClasses =
  "border-input bg-background h-10 w-full min-w-0 rounded-lg border px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function Seletor({
  id,
  rotulo,
  valor,
  opcoes,
  aoMudar,
}: {
  id: string;
  rotulo: string;
  valor: string;
  opcoes: Opcao[];
  aoMudar: (valor: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <select
        id={id}
        className={controleClasses}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
      >
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoData({
  id,
  rotulo,
  valor,
  aoMudar,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <input
        id={id}
        type="date"
        className={controleClasses}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
      />
    </div>
  );
}

export function FiltrosIndicadores({
  processos,
  cres,
  unidades,
  processoId,
  creId,
  unidadeId,
  grupamento,
  turno,
  de,
  ate,
}: {
  processos: Opcao[];
  cres: Opcao[];
  unidades: Opcao[];
  processoId: string;
  creId: string;
  unidadeId: string;
  grupamento: string;
  turno: string;
  de: string;
  ate: string;
}) {
  const router = useRouter();

  function navega(mudanca: Partial<Record<string, string>>) {
    const params = new URLSearchParams({
      processo: processoId,
      cre: creId,
      unidade: unidadeId,
      grupamento,
      turno,
      de,
      ate,
      ...mudanca,
    });
    // Trocar de CRE (ou zerar) invalida a unidade escolhida.
    if (mudanca.cre !== undefined) params.delete("unidade");
    for (const chave of ["cre", "unidade", "grupamento", "turno"]) {
      if (params.get(chave) === "todos" || params.get(chave) === "todas") {
        params.delete(chave);
      }
    }
    for (const chave of ["de", "ate"]) {
      if (!params.get(chave)) params.delete(chave);
    }
    router.push(`/painel?${params.toString()}`);
  }

  return (
    <Card className="gap-4 py-4 shadow-sm">
      <CardHeader className="flex-row items-center gap-3 px-4">
        <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl">
          <SlidersHorizontal className="size-4" aria-hidden />
        </span>
        <div>
          <CardTitle className="text-sm">Recorte dos indicadores</CardTitle>
          <p className="text-muted-foreground mt-0.5 text-xs">
            O recorte é a coorte de inscrições: as datas filtram pela data de
            inscrição e todos os números seguem esse grupo.
          </p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Seletor
          id="ind-processo"
          rotulo="Processo"
          valor={processoId}
          opcoes={processos}
          aoMudar={(processo) => navega({ processo })}
        />
        <Seletor
          id="ind-cre"
          rotulo="CRE"
          valor={creId}
          opcoes={[{ valor: "todas", rotulo: "Todas" }, ...cres]}
          aoMudar={(cre) => navega({ cre })}
        />
        <Seletor
          id="ind-unidade"
          rotulo="Unidade"
          valor={unidadeId}
          opcoes={[{ valor: "todas", rotulo: "Todas" }, ...unidades]}
          aoMudar={(unidade) => navega({ unidade })}
        />
        <Seletor
          id="ind-grupamento"
          rotulo="Turma"
          valor={grupamento}
          opcoes={[
            { valor: "todos", rotulo: "Todas" },
            ...GRUPAMENTOS.map((g) => ({ valor: g, rotulo: GRUPAMENTO_LABEL[g] })),
          ]}
          aoMudar={(g) => navega({ grupamento: g })}
        />
        <Seletor
          id="ind-turno"
          rotulo="Período"
          valor={turno}
          opcoes={[
            { valor: "todos", rotulo: "Todos" },
            ...TURNOS.map((t) => ({ valor: t, rotulo: TURNO_LABEL[t] })),
          ]}
          aoMudar={(t) => navega({ turno: t })}
        />
        <CampoData
          id="ind-de"
          rotulo="Inscritas de"
          valor={de}
          aoMudar={(valor) => navega({ de: valor })}
        />
        <CampoData
          id="ind-ate"
          rotulo="até"
          valor={ate}
          aoMudar={(valor) => navega({ ate: valor })}
        />
      </CardContent>
    </Card>
  );
}
