"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DesfechoContagem } from "@/lib/fila/dados";

/**
 * Cores por desfecho, as mesmas famílias das tags de situação do app
 * (emerald = matriculada, amber = convocação, blue = fila, rose = cancelada).
 * Os hex vivem em CSS vars (globals.css) com passo próprio no modo escuro,
 * validados para CVD e contraste na ordem em que as séries se tocam.
 */
const DESFECHOS = [
  { chave: "matriculadas", rotulo: "Matriculadas", cor: "var(--viz-matriculada)" },
  { chave: "convocadas", rotulo: "Em convocação", cor: "var(--viz-convocada)" },
  { chave: "lista_espera", rotulo: "Na lista de espera", cor: "var(--viz-fila)" },
  { chave: "canceladas", rotulo: "Canceladas", cor: "var(--viz-cancelada)" },
] as const;

const numero = new Intl.NumberFormat("pt-BR");
const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const pct1 = (v: number) =>
  `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

const TICK = { fill: "var(--muted-foreground)", fontSize: 12 } as const;

type PontoTooltip = {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
};

/** Tooltip nos tokens do app; para barras 100% mostra contagem e proporção. */
function TooltipCard({
  active,
  label,
  payload,
  total,
  sufixo,
}: {
  active?: boolean;
  label?: string | number;
  payload?: PontoTooltip[];
  total?: (linha: Record<string, unknown>) => number;
  sufixo?: string;
}) {
  if (!active || !payload?.length) return null;
  const soma = total ? total(payload[0].payload ?? {}) : 0;
  return (
    <div className="border-border bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p) => {
        const valor = Number(p.value ?? 0);
        return (
          <p key={p.name} className="flex items-center gap-1.5 tabular-nums">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: p.color }}
              aria-hidden
            />
            <span className="text-muted-foreground">{p.name}:</span>
            {numero.format(valor)}
            {sufixo}
            {soma > 0 && (
              <span className="text-muted-foreground">({pct1(valor / soma)})</span>
            )}
          </p>
        );
      })}
    </div>
  );
}

function somaDesfechos(linha: Record<string, unknown>): number {
  return DESFECHOS.reduce((s, d) => s + Number(linha[d.chave] ?? 0), 0);
}

/**
 * Proporção de desfechos por recorte (CRE, unidade, turma ou período), em
 * barras horizontais 100% empilhadas: a pergunta é "que fração matriculou,
 * espera ou caiu", comparável entre linhas de tamanhos muito diferentes.
 * O total absoluto de cada linha vai no rótulo do eixo e no tooltip.
 */
export function GraficoDesfechos({
  dados,
  altura = 300,
}: {
  dados: (DesfechoContagem & { rotulo: string })[];
  altura?: number;
}) {
  const comRotulo = dados.map((d) => ({
    ...d,
    eixo: `${d.rotulo} · ${numero.format(d.total)}`,
  }));
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart
        data={comRotulo}
        layout="vertical"
        stackOffset="expand"
        margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
        barCategoryGap="28%"
      >
        <XAxis
          type="number"
          tickFormatter={pct}
          tick={TICK}
          axisLine={false}
          tickLine={false}
          domain={[0, 1]}
        />
        <YAxis
          type="category"
          dataKey="eixo"
          tick={TICK}
          axisLine={false}
          tickLine={false}
          width={168}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={<TooltipCard total={somaDesfechos} />}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          itemSorter={null}
          formatter={(valor) => (
            <span className="text-muted-foreground text-xs">{valor}</span>
          )}
        />
        {DESFECHOS.map((d) => (
          <Bar
            key={d.chave}
            dataKey={d.chave}
            name={d.rotulo}
            stackId="desfecho"
            fill={d.cor}
            stroke="var(--card)"
            strokeWidth={2}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Inscrições da coorte por mês e quantas terminaram matriculadas. */
export function GraficoSerieMensal({
  dados,
}: {
  dados: { mes: string; inscricoes: number; matriculadas: number }[];
}) {
  const formatados = dados.map((d) => {
    const [ano, mes] = d.mes.split("-");
    return { ...d, rotulo: `${mes}/${ano.slice(2)}` };
  });
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={formatados} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="0" vertical={false} />
        <XAxis dataKey="rotulo" tick={TICK} axisLine={false} tickLine={false} />
        <YAxis
          tick={TICK}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={(v: number) => numero.format(v)}
        />
        <Tooltip content={<TooltipCard />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(valor) => (
            <span className="text-muted-foreground text-xs">{valor}</span>
          )}
        />
        <Line
          type="monotone"
          dataKey="inscricoes"
          name="Inscrições no mês"
          stroke="var(--viz-fila)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="matriculadas"
          name="Que terminaram matriculadas"
          stroke="var(--viz-matriculada)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

const ETAPA_LABEL: Record<string, string> = {
  inscricao_ate_convocacao: "Inscrição → convocação",
  convocacao_ate_resposta: "Convocação → 1ª resposta",
  convocacao_ate_desfecho: "Convocação → desfecho",
  convocacao_ate_matricula: "Convocação → matrícula",
};

/** Mediana de dias por etapa (p90 e n no tooltip). Um matiz só: magnitude. */
export function GraficoTempoEtapas({
  dados,
}: {
  dados: { etapa: string; n: number; mediana_dias: number; p90_dias: number }[];
}) {
  const formatados = dados.map((d) => ({
    ...d,
    rotulo: ETAPA_LABEL[d.etapa] ?? d.etapa,
  }));
  return (
    <ResponsiveContainer width="100%" height={72 + formatados.length * 48}>
      <BarChart
        data={formatados}
        layout="vertical"
        margin={{ top: 4, right: 56, bottom: 0, left: 8 }}
        barCategoryGap="32%"
      >
        <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} unit=" d" />
        <YAxis
          type="category"
          dataKey="rotulo"
          tick={TICK}
          axisLine={false}
          tickLine={false}
          width={172}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const linha = payload[0].payload as {
              n: number;
              mediana_dias: number;
              p90_dias: number;
            };
            return (
              <div className="border-border bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
                <p className="mb-1 font-medium">{label}</p>
                <p className="tabular-nums">
                  mediana {linha.mediana_dias} dias · p90 {linha.p90_dias} dias
                </p>
                <p className="text-muted-foreground tabular-nums">
                  {numero.format(linha.n)} movimentos com rastro
                </p>
              </div>
            );
          }}
        />
        <Bar
          dataKey="mediana_dias"
          name="Mediana (dias)"
          fill="var(--viz-fila)"
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="mediana_dias"
            position="right"
            formatter={(v) => `${Number(v).toLocaleString("pt-BR")} d`}
            className="fill-foreground"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Taxa de resposta dos comunicados por canal (atendidas / enviadas). */
export function GraficoCanais({
  dados,
}: {
  dados: { canal: string; total: number; atendidas: number }[];
}) {
  const formatados = dados.map((d) => ({
    ...d,
    rotulo: d.canal,
    taxa: d.total > 0 ? d.atendidas / d.total : 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={72 + formatados.length * 44}>
      <BarChart
        data={formatados}
        layout="vertical"
        margin={{ top: 4, right: 56, bottom: 0, left: 8 }}
        barCategoryGap="32%"
      >
        <XAxis
          type="number"
          tickFormatter={pct}
          tick={TICK}
          axisLine={false}
          tickLine={false}
          domain={[0, 1]}
        />
        <YAxis
          type="category"
          dataKey="rotulo"
          tick={TICK}
          axisLine={false}
          tickLine={false}
          width={96}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const linha = payload[0].payload as {
              total: number;
              atendidas: number;
              taxa: number;
            };
            return (
              <div className="border-border bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
                <p className="mb-1 font-medium">{label}</p>
                <p className="tabular-nums">
                  {pct1(linha.taxa)} de resposta ·{" "}
                  {numero.format(linha.atendidas)} de {numero.format(linha.total)}{" "}
                  tentativas
                </p>
              </div>
            );
          }}
        />
        <Bar
          dataKey="taxa"
          name="Taxa de resposta"
          fill="var(--viz-fila)"
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="taxa"
            position="right"
            formatter={(v) => pct1(Number(v))}
            className="fill-foreground"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
