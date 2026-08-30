import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  GRUPAMENTO_LABEL,
  STATUS_META,
  TURNO_LABEL,
  type EntradaFila,
  type LinhaFila,
} from "@/lib/fila/logica";

import {
  TAG_CADUNICO,
  TAG_FORA_CONVOCADA,
  TagStatus,
} from "./tags";
import { DistanciaRota } from "./distancia-rota";
import type { CoordenadaRota } from "./roteamento";

const dataCurta = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const LIMITE_COLUNA = 25;

function hrefCrianca(params: URLSearchParams, criancaId: string): string {
  const novos = new URLSearchParams(params);
  novos.set("crianca", criancaId);
  return `/fila?${novos.toString()}`;
}

function CartaoFila({
  linha,
  params,
  destinoRota,
}: {
  linha: LinhaFila;
  params: URLSearchParams;
  destinoRota: CoordenadaRota | null;
}) {
  return (
    <Link href={hrefCrianca(params, linha.criancaId)} scroll={false}>
      <Card className="hover:bg-muted/60 gap-0 py-3 transition-colors">
        <CardContent className="space-y-1.5 px-3">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">{linha.criancaId}</span>
            <Badge variant="outline" className="shrink-0 tabular-nums">
              {linha.posicao}º
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            {GRUPAMENTO_LABEL[linha.grupamento]} · {TURNO_LABEL[linha.turno]} ·{" "}
            {Number(linha.pontuacao)} pts
          </p>
          <div className="flex flex-wrap gap-1">
            {linha.bloco === 1 && <Badge className={TAG_CADUNICO}>CadÚnico</Badge>}
            <DistanciaRota
              origem={linha.localizacaoAproximada}
              destino={destinoRota}
              baseOrigem={linha.localizacaoAproximada?.base}
              compacta
            />
            {linha.foraDaFila === "selecionada_em_outra" && (
              <Badge className={TAG_FORA_CONVOCADA}>
                selecionada em outra unidade
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function CartaoSimples({
  entrada,
  params,
}: {
  entrada: EntradaFila;
  params: URLSearchParams;
}) {
  return (
    <Link href={hrefCrianca(params, entrada.criancaId)} scroll={false}>
      <Card className="hover:bg-muted/60 gap-0 py-3 transition-colors">
        <CardContent className="space-y-1.5 px-3">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">
              {entrada.criancaId}
            </span>
            <TagStatus situacao={entrada.situacao} className="shrink-0" />
          </div>
          <p className="text-muted-foreground text-xs">
            {GRUPAMENTO_LABEL[entrada.grupamento]} · {TURNO_LABEL[entrada.turno]}
            {entrada.situacaoEm &&
              ` · ${dataCurta.format(new Date(entrada.situacaoEm))}`}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function Coluna({
  titulo,
  cor,
  total,
  children,
}: {
  titulo: string;
  cor: string;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/40 flex min-w-0 flex-col gap-2 rounded-lg p-3">
      <div className="flex items-center gap-2">
        <span className={`size-2.5 rounded-full ${cor}`} />
        <h3 className="text-sm font-medium">{titulo}</h3>
        <Badge variant="secondary" className="ml-auto tabular-nums">
          {total}
        </Badge>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
      {total > LIMITE_COLUNA && (
        <p className="text-muted-foreground text-xs">
          e mais {total - LIMITE_COLUNA} não exibidas
        </p>
      )}
    </div>
  );
}

/** Visão Kanban do processo na unidade: inscrita → selecionada (em
 * convocação) → matriculada, com a coluna de canceladas para o rastro de
 * recusas, chamadas esgotadas e desclassificações. */
export function KanbanFila({
  linhasFila,
  entradas,
  params,
  destinoRota,
}: {
  linhasFila: LinhaFila[];
  entradas: EntradaFila[];
  params: URLSearchParams;
  destinoRota: CoordenadaRota | null;
}) {
  const porColuna = (coluna: "convocada" | "matriculada" | "encerrada") =>
    entradas
      .filter((e) => STATUS_META[e.situacao].coluna === coluna)
      .sort((a, b) =>
        (b.situacaoEm ?? "").localeCompare(a.situacaoEm ?? ""),
      );

  const convocadas = porColuna("convocada");
  const matriculadas = porColuna("matriculada");
  const encerradas = porColuna("encerrada");

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Coluna titulo="Inscritas na fila" cor="bg-sky-500" total={linhasFila.length}>
        {linhasFila.slice(0, LIMITE_COLUNA).map((linha) => (
          <CartaoFila
            key={linha.opcaoId}
            linha={linha}
            params={params}
            destinoRota={destinoRota}
          />
        ))}
      </Coluna>
      <Coluna
        titulo="Selecionadas (em convocação)"
        cor="bg-amber-500"
        total={convocadas.length}
      >
        {convocadas.slice(0, LIMITE_COLUNA).map((entrada) => (
          <CartaoSimples key={entrada.opcaoId} entrada={entrada} params={params} />
        ))}
      </Coluna>
      <Coluna
        titulo="Matriculadas"
        cor="bg-emerald-500"
        total={matriculadas.length}
      >
        {matriculadas.slice(0, LIMITE_COLUNA).map((entrada) => (
          <CartaoSimples key={entrada.opcaoId} entrada={entrada} params={params} />
        ))}
      </Coluna>
      <Coluna titulo="Canceladas" cor="bg-rose-500" total={encerradas.length}>
        {encerradas.slice(0, LIMITE_COLUNA).map((entrada) => (
          <CartaoSimples key={entrada.opcaoId} entrada={entrada} params={params} />
        ))}
      </Coluna>
    </div>
  );
}
