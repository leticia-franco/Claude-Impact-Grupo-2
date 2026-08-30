import type { Metadata } from "next";
import Link from "next/link";
import { Info, LayoutGrid, List } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  aproximaLocalizacoes,
  buscaCapacidade,
  buscaCres,
  buscaFilaDaUnidade,
  buscaUnidades,
  contaFilaPorUnidade,
} from "@/lib/fila/dados";
import {
  GRUPAMENTO_LABEL,
  GRUPAMENTOS,
  SITUACOES_CONVOCADA,
  SITUACOES_FILA,
  TURNO_LABEL,
  TURNOS,
  ordenaFila,
  type EntradaFila,
  type Grupamento,
  type LinhaFila,
  type Turno,
} from "@/lib/fila/logica";

import { DetalheCriancaView } from "./detalhe";
import { DrawerCrianca } from "./drawer";
import { DistanciaRota } from "./distancia-rota";
import { FiltrosFila } from "./filtros";
import { KanbanFila } from "./kanban";
import { LinhaClicavel } from "./linha";
import { RotinaChamadas } from "./rotina-chamadas";
import type { CoordenadaRota } from "./roteamento";
import {
  TAG_CADUNICO,
  TAG_VAGA,
  TagStatus,
} from "./tags";

export const metadata: Metadata = { title: "Fila" };

const dataCurta = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});

/** Linhas renderizadas por turma antes do "mostrar todas" (HTML sob controle). */
const LIMITE_LINHAS = 100;

function diasDesde(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86_400_000));
}

function tituloResumoRespostas(linha: LinhaFila): string {
  return linha.criteriosResumo
    ? `Critérios declarados:\n${linha.criteriosResumo}`
    : "Nenhum critério declarado";
}

function RegrasCard() {
  return (
    <Card className="border-primary/15 bg-primary/[0.025] shadow-sm">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl">
            <Info className="size-4" aria-hidden />
          </span>
          Como esta fila está ordenada
          <Badge variant="secondary" className="sm:ml-auto">
            Modelo em revisão
          </Badge>
        </CardTitle>
        <CardDescription className="max-w-3xl leading-relaxed text-pretty">
          A régua oficial continua sendo a base. A distância viária e o estado
          da convocação aparecem de forma explícita para facilitar a conferência.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="bg-card text-muted-foreground grid list-decimal gap-2 rounded-xl border py-4 pr-4 pl-9 text-sm leading-relaxed shadow-xs text-pretty md:grid-cols-2 md:gap-x-8">
          <li>
            <span className="text-foreground font-medium">
              Bloco de vulnerabilidade:
            </span>{" "}
            quem declara CadÚnico (51 pts, mais que todos os outros critérios
            somados) vem antes de qualquer combinação sem CadÚnico. A régua já
            faz isso na prática; aqui fica explícito.
          </li>
          <li>Pontuação declarada no questionário, da maior para a menor.</li>
          <li>Desempate da resolução: irmão matriculado na rede.</li>
          <li>Desempate da resolução: responsável menor de 18 anos.</li>
          <li>Tempo de fila: inscrição mais antiga primeiro.</li>
          <li>
            <span className="text-foreground font-medium">
              Distância viária informativa:
            </span>{" "}
            quilômetros pela rota até a unidade, com duas casas decimais. A
            origem é aproximada pela região do endereço e não reordena a régua.
          </li>
        </ol>
        <p className="bg-primary/8 text-muted-foreground mt-4 rounded-xl p-3 text-sm leading-relaxed text-pretty">
          Cada uma das até 5 opções da família é uma fila distinta. Quando a
          criança é selecionada ou matriculada, a liberação automática nas
          outras filas continua acontecendo no fluxo, sem ocupar uma coluna na
          tabela. A matriculada sai em definitivo; a selecionada retoma a
          posição se a convocação não virar matrícula. As opções escolhidas
          pela família nunca alteram a prioridade, apenas o destino.
        </p>
      </CardContent>
    </Card>
  );
}

function CelulasLinha({
  linha,
  vagas,
  destinoRota,
}: {
  linha: LinhaFila;
  vagas?: number;
  destinoRota: CoordenadaRota | null;
}) {
  const dentroDasVagas = vagas != null && linha.posicao <= vagas;
  return (
    <>
      <TableCell className="tabular-nums">
        {linha.posicao}
        {dentroDasVagas && (
          <Badge className={`${TAG_VAGA} ml-2`}>dentro das vagas</Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="font-medium">{linha.criancaId}</div>
        <div className="text-muted-foreground text-xs">
          {linha.bairro ?? "bairro não informado"}
        </div>
      </TableCell>
      <TableCell className="tabular-nums" title={tituloResumoRespostas(linha)}>
        {Number(linha.pontuacao)}
        {linha.pontuacaoConfirmada > 0 &&
          linha.pontuacaoConfirmada !== linha.pontuacao && (
            <span className="text-muted-foreground ml-1 text-xs">
              (val. {Number(linha.pontuacaoConfirmada)})
            </span>
          )}
      </TableCell>
      <TableCell>
        <TagStatus situacao={linha.situacao} />
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {linha.bloco === 1 && <Badge className={TAG_CADUNICO}>CadÚnico</Badge>}
          {linha.temIrmaoNaRede && (
            <Badge variant="outline">irmão na rede</Badge>
          )}
          {linha.responsavelMenor18 && (
            <Badge variant="outline">resp. &lt; 18</Badge>
          )}
          {linha.bloco !== 1 &&
            !linha.temIrmaoNaRede &&
            !linha.responsavelMenor18 && (
              <span className="text-muted-foreground text-xs">nenhum</span>
            )}
        </div>
      </TableCell>
      <TableCell>
        <DistanciaRota
          origem={linha.localizacaoAproximada}
          destino={destinoRota}
          baseOrigem={linha.localizacaoAproximada?.base}
        />
      </TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">
        {dataCurta.format(new Date(linha.criadaEm))}
        <span className="ml-1 text-xs">({diasDesde(linha.criadaEm)} d)</span>
      </TableCell>
    </>
  );
}

export default async function FilaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const primeiro = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  // As três consultas iniciais em paralelo; o creId do parâmetro é validado
  // contra as CREs (1..11) depois, sem custar uma ida a mais ao banco.
  const creIdBruto = Math.min(11, Math.max(1, Number(primeiro(params.cre)) || 1));
  const [cres, unidades, filaPorUnidade] = await Promise.all([
    buscaCres(),
    buscaUnidades(creIdBruto),
    contaFilaPorUnidade(creIdBruto),
  ]);
  const creId = cres.find((c) => c.id === creIdBruto)?.id ?? cres[0].id;

  // Sem unidade na URL, abre na maior fila da CRE (a tela nunca chega vazia).
  const unidadeParam = primeiro(params.unidade);
  const unidade =
    unidades.find((u) => u.id === unidadeParam) ??
    [...unidades].sort(
      (a, b) => (filaPorUnidade.get(b.id) ?? 0) - (filaPorUnidade.get(a.id) ?? 0),
    )[0];

  const filtroGrupamento = GRUPAMENTOS.includes(
    primeiro(params.grupamento) as Grupamento,
  )
    ? (primeiro(params.grupamento) as Grupamento)
    : undefined;
  const filtroTurno = TURNOS.includes(primeiro(params.turno) as Turno)
    ? (primeiro(params.turno) as Turno)
    : undefined;
  const visao = primeiro(params.visao) === "kanban" ? "kanban" : "lista";
  const criancaAberta = primeiro(params.crianca);
  const mostrarTodas = primeiro(params.todas) === "1";

  const paramsAtuais = new URLSearchParams();
  paramsAtuais.set("cre", String(creId));
  if (unidade) paramsAtuais.set("unidade", unidade.id);
  if (filtroGrupamento) paramsAtuais.set("grupamento", filtroGrupamento);
  if (filtroTurno) paramsAtuais.set("turno", filtroTurno);
  if (visao === "kanban") paramsAtuais.set("visao", "kanban");

  const filtros = (
    <FiltrosFila
      cres={cres.map((c) => ({ valor: String(c.id), rotulo: c.nome }))}
      unidades={unidades.map((u) => ({ valor: u.id, rotulo: u.nome }))}
      creId={String(creId)}
      unidadeId={unidade?.id ?? ""}
      grupamento={filtroGrupamento ?? "todos"}
      turno={filtroTurno ?? "todos"}
    />
  );

  if (!unidade) {
    return (
      <>
        <PageHeader
          titulo="Fila"
          descricao="Ordenação por unidade, turno e grupamento, com a régua de pontuação do processo vigente."
        />
        {filtros}
        <p className="text-muted-foreground mt-8 text-sm">
          Nenhuma unidade cadastrada nesta CRE.
        </p>
      </>
    );
  }

  const [entradasBase, capacidade] = await Promise.all([
    buscaFilaDaUnidade(unidade.id),
    buscaCapacidade(unidade.id),
  ]);
  const localizacoes = await aproximaLocalizacoes(
    entradasBase.map((entrada) => ({
      bairro: entrada.bairro,
      cep: entrada.cep,
      creId: entrada.creId,
    })),
  );
  const entradas = entradasBase.map((entrada, indice) => ({
    ...entrada,
    localizacaoAproximada: localizacoes[indice] ?? null,
  }));
  const destinoRota =
    unidade.latitude != null && unidade.longitude != null
      ? { latitude: unidade.latitude, longitude: unidade.longitude }
      : null;

  const filtraTurma = (e: EntradaFila) =>
    (!filtroGrupamento || e.grupamento === filtroGrupamento) &&
    (!filtroTurno || e.turno === filtroTurno);

  const naFila = entradas.filter(
    (e) => SITUACOES_FILA.includes(e.situacao) && filtraTurma(e),
  );
  const convocadas = entradas.filter(
    (e) => SITUACOES_CONVOCADA.includes(e.situacao) && filtraTurma(e),
  );

  // Uma fila por turma (grupamento + turno), como no processo oficial.
  const turmas: {
    grupamento: Grupamento;
    turno: Turno;
    linhas: LinhaFila[];
  }[] = [];
  for (const grupamento of filtroGrupamento ? [filtroGrupamento] : GRUPAMENTOS) {
    for (const turno of filtroTurno ? [filtroTurno] : TURNOS) {
      const daTurma = naFila.filter(
        (e) => e.grupamento === grupamento && e.turno === turno,
      );
      if (daTurma.length === 0) continue;
      turmas.push({
        grupamento,
        turno,
        linhas: ordenaFila(daTurma),
      });
    }
  }

  const linhasVisiveis = turmas.flatMap((t) => t.linhas);
  const vagasMedidas = new Map(capacidade.map((c) => [c.grupamento, c.vagas]));

  const linhaAberta = criancaAberta
    ? (linhasVisiveis.find((l) => l.criancaId === criancaAberta) ?? null)
    : null;

  return (
    <>
      <PageHeader
        titulo="Fila"
        descricao="Ordenação por unidade, turno e grupamento, com distância viária até a unidade e gestão da convocação."
      />

      <div className="space-y-6">
        {filtros}

        <RotinaChamadas unidadeId={unidade.id} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Visualização</p>
            <p className="text-muted-foreground text-xs">
              Escolha a forma mais confortável de acompanhar a fila.
            </p>
          </div>
          <div className="bg-muted flex items-center gap-1 rounded-xl p-1">
            {(
              [
                ["lista", "Lista", List],
                ["kanban", "Quadro de tarefas", LayoutGrid],
              ] as const
            ).map(([chave, rotulo, Icon]) => {
              const alvo = new URLSearchParams(paramsAtuais);
              if (chave === "kanban") alvo.set("visao", "kanban");
              else alvo.delete("visao");
              return (
                <Link
                  key={chave}
                  href={`/fila?${alvo.toString()}`}
                  scroll={false}
                  className={buttonVariants({
                    size: "lg",
                    variant: visao === chave ? "default" : "ghost",
                  })}
                >
                  <Icon className="size-4" aria-hidden />
                  {rotulo}
                </Link>
              );
            })}
          </div>
        </div>

        {visao === "kanban" ? (
          <KanbanFila
            linhasFila={linhasVisiveis}
            entradas={entradas.filter(filtraTurma)}
            params={paramsAtuais}
            destinoRota={destinoRota}
          />
        ) : (
          <>
            {turmas.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="text-muted-foreground text-sm">
                  Nenhuma criança na fila de 2025 para esta unidade com os
                  filtros atuais.
                </CardContent>
              </Card>
            )}

            {turmas.map(({ grupamento, turno, linhas }) => {
              const visiveis = mostrarTodas
                ? linhas
                : linhas.slice(0, LIMITE_LINHAS);
              return (
                <Card key={`${grupamento}-${turno}`}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {GRUPAMENTO_LABEL[grupamento]} · {TURNO_LABEL[turno]}
                    </CardTitle>
                    <CardDescription>
                      {linhas.length} na fila
                      {vagasMedidas.has(grupamento) &&
                        `, ${vagasMedidas.get(grupamento)} vagas medidas no grupamento (SME, jul/2025)`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Posição</TableHead>
                          <TableHead>Criança</TableHead>
                          <TableHead>Pontos</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Critérios</TableHead>
                          <TableHead>Distância pela rota</TableHead>
                          <TableHead>Na fila desde</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visiveis.map((linha) => (
                          <LinhaClicavel
                            key={linha.opcaoId}
                            criancaId={linha.criancaId}
                          >
                            <CelulasLinha
                              linha={linha}
                              vagas={vagasMedidas.get(grupamento)}
                              destinoRota={destinoRota}
                            />
                          </LinhaClicavel>
                        ))}
                      </TableBody>
                    </Table>
                    {visiveis.length < linhas.length && (
                      <p className="text-muted-foreground mt-3 text-sm">
                        Mostrando as {visiveis.length} primeiras posições.{" "}
                        <Link
                          className="underline underline-offset-2"
                          href={`/fila?${new URLSearchParams([...paramsAtuais, ["todas", "1"]]).toString()}`}
                          scroll={false}
                        >
                          Mostrar todas as {linhas.length}
                        </Link>
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {convocadas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Selecionadas nesta unidade, em convocação
                  </CardTitle>
                  <CardDescription className="text-pretty">
                    Cada linha é uma criança que alcançou a vez nesta fila e
                    está no ciclo de chamadas (até 3, por e-mail e WhatsApp)
                    até matricular ou ser cancelada. Sem data registrada = gap
                    da base histórica; daqui pra frente o rastro vem do evento
                    de mudança de situação.
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Criança</TableHead>
                        <TableHead>Turma</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead>Pontos</TableHead>
                        <TableHead>Aguardando desde</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {convocadas.map((c) => (
                        <LinhaClicavel key={c.opcaoId} criancaId={c.criancaId}>
                          <TableCell className="font-medium">
                            {c.criancaId}
                          </TableCell>
                          <TableCell>
                            {GRUPAMENTO_LABEL[c.grupamento]} ·{" "}
                            {TURNO_LABEL[c.turno]}
                          </TableCell>
                          <TableCell>
                            <TagStatus situacao={c.situacao} />
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {Number(c.pontuacao)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {c.situacaoEm
                              ? `${dataCurta.format(new Date(c.situacaoEm))} (${diasDesde(c.situacaoEm)} d)`
                              : "sem data registrada"}
                          </TableCell>
                        </LinhaClicavel>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <RegrasCard />
      </div>

      {criancaAberta && (
        <DrawerCrianca titulo={`Criança ${criancaAberta}`}>
          <DetalheCriancaView
            criancaId={criancaAberta}
            unidadeAtualId={unidade.id}
            linhaAtual={linhaAberta}
          />
        </DrawerCrianca>
      )}
    </>
  );
}
