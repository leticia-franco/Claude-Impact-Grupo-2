import type { Metadata } from "next";
import {
  CalendarClock,
  GraduationCap,
  Hourglass,
  MessageCircleReply,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buscaCres,
  buscaIndicadores,
  buscaProcessos,
  buscaUnidades,
  PROCESSO_ATUAL,
} from "@/lib/fila/dados";
import {
  GRUPAMENTO_LABEL,
  GRUPAMENTOS,
  TURNO_LABEL,
  TURNOS,
  type Grupamento,
  type Turno,
} from "@/lib/fila/logica";

import { FiltrosIndicadores } from "./filtros";
import {
  GraficoCanais,
  GraficoDesfechos,
  GraficoSerieMensal,
  GraficoTempoEtapas,
} from "./graficos";

export const metadata: Metadata = { title: "Painel" };

const numero = new Intl.NumberFormat("pt-BR");

function pct(parte: number, todo: number): string {
  if (todo === 0) return "—";
  return `${((parte / todo) * 100).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
}

const KPI_TONS = {
  verde: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
  azul: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300",
  violeta: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300",
} as const;

function KpiCard({
  valor,
  rotulo,
  detalhe,
  icon: Icon,
  tom,
}: {
  valor: string;
  rotulo: string;
  detalhe: string;
  icon: LucideIcon;
  tom: keyof typeof KPI_TONS;
}) {
  return (
    <Card className="gap-1 py-4 shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 px-4">
        <div className="space-y-1">
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {valor}
          </p>
          <p className="text-foreground text-xs font-medium">{rotulo}</p>
          <p className="text-muted-foreground text-xs leading-relaxed text-pretty">
            {detalhe}
          </p>
        </div>
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${KPI_TONS[tom]}`}
        >
          <Icon className="size-5" aria-hidden />
        </span>
      </CardContent>
    </Card>
  );
}

function GraficoCard({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-4 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SemRastro({ texto }: { texto: string }) {
  return (
    <div className="border-border text-muted-foreground flex min-h-40 items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm leading-relaxed text-pretty">
      {texto}
    </div>
  );
}

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const so = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : undefined;

  const [processos, cres] = await Promise.all([buscaProcessos(), buscaCres()]);

  const processoId =
    processos.find((p) => String(p.id) === so(params.processo))?.id ??
    PROCESSO_ATUAL;
  const creId = cres.find((c) => String(c.id) === so(params.cre))?.id;
  const unidades = creId ? await buscaUnidades(creId) : [];
  const unidadeId = unidades.find((u) => u.id === so(params.unidade))?.id;
  const grupamento = GRUPAMENTOS.find((g) => g === so(params.grupamento)) as
    | Grupamento
    | undefined;
  const turno = TURNOS.find((t) => t === so(params.turno)) as Turno | undefined;
  const de = DATA_RE.test(so(params.de) ?? "") ? so(params.de) : undefined;
  const ate = DATA_RE.test(so(params.ate) ?? "") ? so(params.ate) : undefined;

  const ind = await buscaIndicadores({
    processoId,
    creId,
    unidadeId,
    grupamento,
    turno,
    de,
    ate,
  });

  const { resumo, convocacoes, comunicados } = ind;
  const tempoDesfecho = ind.tempo_etapas.find(
    (t) => t.etapa === "convocacao_ate_desfecho",
  );

  const nomeCre = (id: number) => cres.find((c) => c.id === id)?.nome ?? `CRE ${id}`;
  const porRecorte = creId
    ? ind.por_unidade.map((u) => ({ ...u, rotulo: u.nome }))
    : ind.por_cre.map((c) => ({ ...c, rotulo: nomeCre(c.cre_id) }));
  const porTurma = ind.por_grupamento.map((g) => ({
    ...g,
    rotulo: GRUPAMENTO_LABEL[g.grupamento],
  }));
  const porPeriodo = ind.por_turno.map((t) => ({
    ...t,
    rotulo: TURNO_LABEL[t.turno],
  }));

  return (
    <>
      <PageHeader
        titulo="Painel"
        descricao="Indicadores da fila: quanto da coorte matriculou, quanto espera, quanto tempo cada etapa leva e como as famílias respondem aos comunicados."
      />

      <div className="space-y-4">
        <FiltrosIndicadores
          processos={processos.map((p) => ({
            valor: String(p.id),
            rotulo: `${p.ano} (nº ${p.id})`,
          }))}
          cres={cres.map((c) => ({ valor: String(c.id), rotulo: c.nome }))}
          unidades={unidades.map((u) => ({ valor: u.id, rotulo: u.nome }))}
          processoId={String(processoId)}
          creId={creId ? String(creId) : "todas"}
          unidadeId={unidadeId ?? "todas"}
          grupamento={grupamento ?? "todos"}
          turno={turno ?? "todos"}
          de={de ?? ""}
          ate={ate ?? ""}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            valor={pct(resumo.matriculadas, resumo.total)}
            rotulo="Matriculadas"
            detalhe={`${numero.format(resumo.matriculadas)} de ${numero.format(resumo.total)} crianças da coorte`}
            icon={GraduationCap}
            tom="verde"
          />
          <KpiCard
            valor={pct(resumo.lista_espera, resumo.total)}
            rotulo="Na lista de espera"
            detalhe={`${numero.format(resumo.lista_espera)} crianças sem vaga e sem convocação em curso`}
            icon={Hourglass}
            tom="azul"
          />
          <KpiCard
            valor={
              comunicados.total > 0
                ? pct(comunicados.atendidas, comunicados.total)
                : "—"
            }
            rotulo="Resposta aos comunicados"
            detalhe={
              comunicados.total > 0
                ? `${numero.format(comunicados.atendidas)} atendidas em ${numero.format(comunicados.total)} tentativas de contato`
                : "Sem tentativas de contato registradas neste recorte"
            }
            icon={MessageCircleReply}
            tom="amber"
          />
          <KpiCard
            valor={
              tempoDesfecho != null ? `${tempoDesfecho.mediana_dias} dias` : "—"
            }
            rotulo="Convocação até o desfecho"
            detalhe={
              tempoDesfecho != null
                ? `mediana de ${numero.format(tempoDesfecho.n)} convocações encerradas`
                : "Sem convocações encerradas com rastro neste recorte"
            }
            icon={CalendarClock}
            tom="violeta"
          />
        </div>

        <GraficoCard
          titulo={
            creId
              ? "Desfecho por unidade (12 maiores listas de espera)"
              : "Desfecho por CRE"
          }
          descricao="Proporção de crianças da coorte por desfecho; o número ao lado do nome é o total de crianças do recorte."
        >
          <GraficoDesfechos
            dados={porRecorte}
            altura={Math.max(220, 96 + porRecorte.length * 40)}
          />
        </GraficoCard>

        <div className="grid gap-4 lg:grid-cols-2">
          <GraficoCard
            titulo="Desfecho por turma"
            descricao="Berçário, Maternal I e Maternal II, na mesma coorte."
          >
            <GraficoDesfechos dados={porTurma} altura={220} />
          </GraficoCard>
          <GraficoCard
            titulo="Desfecho por período"
            descricao="Integral e parcial, na mesma coorte."
          >
            <GraficoDesfechos dados={porPeriodo} altura={190} />
          </GraficoCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <GraficoCard
            titulo="Inscrições por mês"
            descricao="Quando a coorte se inscreveu e quantas daquelas inscrições terminaram matriculadas."
          >
            {ind.serie_mensal.length > 0 ? (
              <GraficoSerieMensal dados={ind.serie_mensal} />
            ) : (
              <SemRastro texto="Nenhuma inscrição no recorte escolhido." />
            )}
          </GraficoCard>
          <GraficoCard
            titulo="Tempo de cada etapa"
            descricao="Mediana de dias entre as etapas, sobre os movimentos com rastro de data (convocações e mudanças feitas pelo painel)."
          >
            {ind.tempo_etapas.length > 0 ? (
              <GraficoTempoEtapas dados={ind.tempo_etapas} />
            ) : (
              <SemRastro texto="A base histórica não registra quando a situação mudou. Cada convocação, contato e matrícula feitos pelo painel passa a alimentar este gráfico daqui pra frente." />
            )}
          </GraficoCard>
        </div>

        <GraficoCard
          titulo="Comunicados por canal"
          descricao={`Taxa de resposta por canal de contato. Convocações do recorte: ${numero.format(convocacoes.total)} no total, ${numero.format(convocacoes.abertas)} em aberto, ${numero.format(convocacoes.confirmadas)} confirmadas, ${numero.format(convocacoes.nao_localizadas)} não localizadas, ${numero.format(convocacoes.recusadas)} recusadas, ${numero.format(convocacoes.expiradas)} expiradas.`}
        >
          {ind.por_canal.length > 0 ? (
            <GraficoCanais dados={ind.por_canal} />
          ) : (
            <SemRastro texto="Nenhuma tentativa de contato registrada neste recorte. A convocação hoje corre por canais sem rastreio; o registro no painel constrói este indicador." />
          )}
        </GraficoCard>
      </div>
    </>
  );
}
