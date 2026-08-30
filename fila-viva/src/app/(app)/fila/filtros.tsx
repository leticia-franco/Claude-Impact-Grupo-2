"use client";

import { useRouter } from "next/navigation";
import { Filter } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  GRUPAMENTO_LABEL,
  GRUPAMENTOS,
  TURNO_LABEL,
  TURNOS,
} from "@/lib/fila/logica";

type Opcao = { valor: string; rotulo: string };

const selectClasses =
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
        className={selectClasses}
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

export function FiltrosFila({
  cres,
  unidades,
  creId,
  unidadeId,
  grupamento,
  turno,
}: {
  cres: Opcao[];
  unidades: Opcao[];
  creId: string;
  unidadeId: string;
  grupamento: string;
  turno: string;
}) {
  const router = useRouter();

  function navega(mudanca: Partial<Record<string, string>>) {
    const params = new URLSearchParams({
      cre: creId,
      unidade: unidadeId,
      grupamento,
      turno,
      ...mudanca,
    });
    // Trocar de CRE invalida a unidade escolhida.
    if (mudanca.cre) params.delete("unidade");
    for (const chave of ["grupamento", "turno"]) {
      if (params.get(chave) === "todos") params.delete(chave);
    }
    router.push(`/fila?${params.toString()}`);
  }

  return (
    <Card className="gap-4 py-4 shadow-sm">
      <CardHeader className="flex-row items-center gap-3 px-4">
        <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl">
          <Filter className="size-4" aria-hidden />
        </span>
        <div>
          <CardTitle className="text-sm">Encontre a fila certa</CardTitle>
          <p className="text-muted-foreground mt-0.5 text-xs">
            A lista atualiza automaticamente ao trocar um filtro.
          </p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 px-4 sm:grid-cols-2 lg:grid-cols-[10rem_1fr_11rem_11rem]">
        <Seletor
          id="filtro-cre"
          rotulo="CRE"
          valor={creId}
          opcoes={cres}
          aoMudar={(cre) => navega({ cre })}
        />
        <Seletor
          id="filtro-unidade"
          rotulo="Unidade"
          valor={unidadeId}
          opcoes={unidades}
          aoMudar={(unidade) => navega({ unidade })}
        />
        <Seletor
          id="filtro-grupamento"
          rotulo="Grupamento"
          valor={grupamento}
          opcoes={[
            { valor: "todos", rotulo: "Todos" },
            ...GRUPAMENTOS.map((g) => ({ valor: g, rotulo: GRUPAMENTO_LABEL[g] })),
          ]}
          aoMudar={(g) => navega({ grupamento: g })}
        />
        <Seletor
          id="filtro-turno"
          rotulo="Turno"
          valor={turno}
          opcoes={[
            { valor: "todos", rotulo: "Todos" },
            ...TURNOS.map((t) => ({ valor: t, rotulo: TURNO_LABEL[t] })),
          ]}
          aoMudar={(t) => navega({ turno: t })}
        />
      </CardContent>
    </Card>
  );
}
