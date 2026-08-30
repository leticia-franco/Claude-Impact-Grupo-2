import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  aproximaLocalizacao,
  buscaDetalheCrianca,
} from "@/lib/fila/dados";
import {
  CHAMADAS_MAX,
  GRUPAMENTO_LABEL,
  SITUACOES_CONVOCADA,
  SITUACOES_FILA,
  TURNO_LABEL,
  type LinhaFila,
} from "@/lib/fila/logica";

import {
  confirmarMatricula,
  desclassificar,
  registrarContato,
  registrarExpiracao,
  registrarNaoLocalizada,
  registrarRecusa,
  voltarParaFila,
} from "./acoes";
import { BotaoDispararChamada } from "./botao-disparar-chamada";
import { BotaoSelecionar } from "./selecionar-botao";
import { DistanciaRota } from "./distancia-rota";
import { MapaPosicionamento, type PontoMapa } from "./mapa";
import { TAG_CADUNICO, TAG_CRITERIO, TagStatus } from "./tags";

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});
const dataCurta = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const CANAL_LABEL: Record<string, string> = {
  whatsapp: "chamada automática (e-mail + WhatsApp)",
  telefone: "ligação",
  sms: "SMS",
  email: "e-mail",
  visita: "visita à família",
  painel: "registro no painel",
};

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

/** Conteúdo da aba lateral: consolidado da criança + ações de gestão. */
export async function DetalheCriancaView({
  criancaId,
  unidadeAtualId,
  linhaAtual,
}: {
  criancaId: string;
  unidadeAtualId: string;
  /** A linha desta criança na fila da unidade aberta, se estiver nela. */
  linhaAtual: LinhaFila | null;
}) {
  const detalhe = await buscaDetalheCrianca(criancaId);
  const inscricao = detalhe.inscricoes[0] ?? null;
  const endereco = {
    bairro: inscricao?.bairro ?? null,
    cep: inscricao?.cep ?? null,
    creId: inscricao?.cre_id ?? null,
  };

  const casa = inscricao ? await aproximaLocalizacao(endereco) : null;

  const opcaoAtual =
    detalhe.opcoes.find((o) => o.unidade.id === unidadeAtualId) ?? null;
  const opcaoMapa = opcaoAtual ?? detalhe.opcoes[0] ?? null;
  const opcaoAtualId = linhaAtual?.opcaoId ?? opcaoAtual?.opcaoId ?? null;
  const situacaoAtual = linhaAtual?.situacao ?? opcaoAtual?.situacao ?? null;

  const convocacaoAberta = detalhe.convocacoes.find((c) => !c.desfecho) ?? null;
  const tentativas = detalhe.convocacoes.flatMap((c) => c.tentativas);
  const semContato =
    tentativas.length === 0 && detalhe.convocacoes.length === 0;

  // Chamadas automáticas (e-mail + WhatsApp) já disparadas na convocação
  // aberta DESTA opção; na terceira sem matrícula, o caminho é o cancelamento.
  const convocacaoDaOpcao =
    opcaoAtualId != null
      ? (detalhe.convocacoes.find(
          (c) => c.opcao_id === opcaoAtualId && !c.desfecho,
        ) ?? null)
      : null;
  const chamadas = (convocacaoDaOpcao?.tentativas ?? []).filter(
    (t) => t.canal === "whatsapp",
  ).length;

  const pontosMapa: PontoMapa[] = [];
  if (casa) {
    pontosMapa.push({
      latitude: casa.latitude,
      longitude: casa.longitude,
      rotulo: `Residência (aprox.: ${casa.base})`,
      cor: "#0f172a",
      origem: true,
    });
  }
  for (const opcao of detalhe.opcoes) {
    if (opcao.unidade.latitude == null || opcao.unidade.longitude == null) continue;
    const emRota = opcaoMapa?.opcaoId === opcao.opcaoId;
    pontosMapa.push({
      latitude: opcao.unidade.latitude,
      longitude: opcao.unidade.longitude,
      rotulo: `${opcao.ordem}ª opção: ${opcao.unidade.nome}${emRota ? " (rota exibida)" : ""}`,
      cor: emRota ? "#2563eb" : "#a1a1aa",
      destaque: emRota,
    });
  }

  return (
    <>
      {linhaAtual && semContato && linhaAtual.posicao <= 5 && (
        <Alert className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <AlertTitle>Família ainda sem contato registrado</AlertTitle>
          <AlertDescription>
            A criança está na posição {linhaAtual.posicao} desta fila e não há
            nenhuma convocação ou tentativa de contato no histórico.
          </AlertDescription>
        </Alert>
      )}

      <Secao titulo="Criança">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">Código</span>
          <span className="font-medium">{criancaId}</span>
          <span className="text-muted-foreground">Nascimento</span>
          <span>{detalhe.crianca?.nascimento_anomes ?? "não informado"}</span>
          <span className="text-muted-foreground">Sexo</span>
          <span>{detalhe.crianca?.sexo ?? "não informado"}</span>
          <span className="text-muted-foreground">Bairro</span>
          <span>{inscricao?.bairro ?? "não informado"}</span>
          <span className="text-muted-foreground">CEP</span>
          <span>{inscricao?.cep ?? "não informado"}</span>
          <span className="text-muted-foreground">Inscrita em</span>
          <span>
            {inscricao ? dataCurta.format(new Date(inscricao.criada_em)) : "?"}
          </span>
        </div>
      </Secao>

      {linhaAtual && (
        <Secao titulo="Posição nesta unidade">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline" className="text-base font-semibold">
              {linhaAtual.posicao}º
            </Badge>
            {linhaAtual.foraDaFila === "selecionada_em_outra" && (
              <span className="text-muted-foreground">
                (fora desta fila de prioridade: selecionada em{" "}
                {linhaAtual.aguardandoOutra.join(", ")}; retoma a posição se a
                convocação não virar matrícula)
              </span>
            )}
            {linhaAtual.foraDaFila === "matriculada_em_outra" && (
              <span className="text-muted-foreground">
                (fora desta fila: matriculada em{" "}
                {linhaAtual.confirmadaEmOutra.join(", ")})
              </span>
            )}
            <span className="text-muted-foreground">
              {GRUPAMENTO_LABEL[linhaAtual.grupamento]} ·{" "}
              {TURNO_LABEL[linhaAtual.turno]}
            </span>
            <TagStatus situacao={linhaAtual.situacao} />
          </div>
        </Secao>
      )}

      <Secao titulo="Questionário socioeconômico">
        <p className="text-sm">
          <span className="font-semibold">
            {inscricao ? Number(inscricao.pontuacao) : 0} pontos declarados
          </span>
          {inscricao && inscricao.pontuacao_confirmada > 0 && (
            <span className="text-muted-foreground">
              {" "}
              ({Number(inscricao.pontuacao_confirmada)} validados)
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(inscricao?.respostas ?? [])
            .filter((r) => r.criterio)
            .map((r, i) => (
              <Badge
                key={i}
                className={
                  /cad[uú]nico|cadastro [uú]nico/i.test(r.criterio!.pergunta)
                    ? TAG_CADUNICO
                    : TAG_CRITERIO
                }
                title={r.criterio!.pergunta}
              >
                {r.criterio!.pergunta.slice(0, 40)}
                {r.criterio!.pergunta.length > 40 ? "…" : ""} ·{" "}
                {Number(r.criterio!.pontuacao)} pts
                {r.confirmado ? " ✓" : ""}
              </Badge>
            ))}
          {(inscricao?.respostas ?? []).length === 0 && (
            <span className="text-muted-foreground text-sm">
              Nenhum critério declarado.
            </span>
          )}
        </div>
      </Secao>

      <Secao titulo="Distância e rota">
        {opcaoMapa ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="text-pretty">
                Rota viária até <span className="font-medium">{opcaoMapa.unidade.nome}</span>
                {opcaoMapa.unidade.id === unidadeAtualId && " (esta unidade)"}.
              </p>
              <DistanciaRota
                origem={casa}
                destino={
                  opcaoMapa.unidade.latitude != null &&
                  opcaoMapa.unidade.longitude != null
                    ? {
                        latitude: opcaoMapa.unidade.latitude,
                        longitude: opcaoMapa.unidade.longitude,
                      }
                    : null
                }
                baseOrigem={casa?.base}
              />
            </div>
            {pontosMapa.length > 1 ? (
              <MapaPosicionamento pontos={pontosMapa} />
            ) : (
              <p className="text-muted-foreground text-sm">
                Sem coordenadas para desenhar o mapa.
              </p>
            )}
            <p className="text-muted-foreground text-xs text-pretty">
              A origem é aproximada por {casa?.base ?? "uma referência regional"},
              pois a base não contém o endereço exato. A distância e o traçado
              seguem a malha viária do OpenStreetMap; não são uma linha reta.
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Nenhuma opção disponível para calcular a rota.
          </p>
        )}
      </Secao>

      <Secao titulo="Opções da família">
        <ul className="space-y-1.5">
          {detalhe.opcoes.map((opcao) => (
            <li
              key={opcao.opcaoId}
              className="flex flex-wrap items-center gap-2 text-sm"
            >
              <span className="text-muted-foreground w-8 shrink-0">
                {opcao.ordem}ª
              </span>
              <span className="min-w-0 flex-1 truncate" title={opcao.unidade.nome}>
                {opcao.unidade.nome}
                {opcao.unidade.id === unidadeAtualId && (
                  <span className="text-muted-foreground"> (esta unidade)</span>
                )}
              </span>
              <span className="text-muted-foreground text-xs">
                {GRUPAMENTO_LABEL[opcao.grupamento]} · {TURNO_LABEL[opcao.turno]}
              </span>
              <DistanciaRota
                origem={casa}
                destino={
                  opcao.unidade.latitude != null && opcao.unidade.longitude != null
                    ? {
                        latitude: opcao.unidade.latitude,
                        longitude: opcao.unidade.longitude,
                      }
                    : null
                }
                baseOrigem={casa?.base}
                compacta
              />
              <TagStatus situacao={opcao.situacao} />
            </li>
          ))}
        </ul>
      </Secao>

      <Secao titulo="Convocações e contatos">
        {detalhe.convocacoes.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhuma convocação registrada.
          </p>
        ) : (
          <ul className="space-y-3">
            {detalhe.convocacoes.map((c) => (
              <li key={c.id} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    Convocação de {dataHora.format(new Date(c.aberta_em))}
                  </span>
                  {c.desfecho ? (
                    <Badge variant="secondary">{c.desfecho}</Badge>
                  ) : (
                    <Badge className="border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                      em aberto ·{" "}
                      {c.tentativas.filter((t) => t.canal === "whatsapp").length}
                      /{CHAMADAS_MAX} chamadas
                    </Badge>
                  )}
                </div>
                {c.prazo_comparecimento_em && !c.desfecho && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Prazo de comparecimento:{" "}
                    {dataCurta.format(new Date(c.prazo_comparecimento_em))}
                  </p>
                )}
                {c.tentativas.length > 0 && (
                  <ul className="text-muted-foreground mt-2 space-y-1 text-xs">
                    {c.tentativas.map((t) => (
                      <li key={t.id}>
                        {dataHora.format(new Date(t.tentada_em))} ·{" "}
                        {CANAL_LABEL[t.canal] ?? t.canal} · {t.resultado}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Secao>

      {opcaoAtualId != null && situacaoAtual && (
        <>
          <Separator />
          <Secao titulo="Ações nesta unidade">
            <div className="flex flex-wrap gap-2">
              {SITUACOES_FILA.includes(situacaoAtual) && (
                <>
                  <BotaoSelecionar
                    opcaoId={opcaoAtualId}
                    criancaId={criancaId}
                  />
                  <form action={desclassificar.bind(null, opcaoAtualId)}>
                    <Button size="sm" variant="destructive">
                      Desclassificar
                    </Button>
                  </form>
                </>
              )}
              {SITUACOES_CONVOCADA.includes(situacaoAtual) && (
                <>
                  <form action={confirmarMatricula.bind(null, opcaoAtualId)}>
                    <Button
                      size="sm"
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Confirmar matrícula
                    </Button>
                  </form>
                  {chamadas < CHAMADAS_MAX ? (
                    <BotaoDispararChamada
                      opcaoId={opcaoAtualId}
                      criancaId={criancaId}
                      proximaChamada={chamadas + 1}
                    />
                  ) : (
                    <form action={registrarExpiracao.bind(null, opcaoAtualId)}>
                      <Button size="sm" variant="destructive">
                        Cancelar ({CHAMADAS_MAX} chamadas sem matrícula)
                      </Button>
                    </form>
                  )}
                  <form
                    action={registrarContato.bind(null, opcaoAtualId, "telefone")}
                  >
                    <Button size="sm" variant="outline">
                      Registrar ligação
                    </Button>
                  </form>
                  <form
                    action={registrarContato.bind(null, opcaoAtualId, "visita")}
                  >
                    <Button size="sm" variant="outline">
                      Registrar visita à família
                    </Button>
                  </form>
                  <form action={registrarRecusa.bind(null, opcaoAtualId)}>
                    <Button size="sm" variant="destructive">
                      Família recusou
                    </Button>
                  </form>
                  <form action={registrarNaoLocalizada.bind(null, opcaoAtualId)}>
                    <Button size="sm" variant="outline">
                      Não localizada (volta à fila)
                    </Button>
                  </form>
                </>
              )}
              {situacaoAtual.startsWith("cancelado") && (
                <form action={voltarParaFila.bind(null, opcaoAtualId)}>
                  <Button size="sm" variant="outline">
                    Devolver à lista de espera
                  </Button>
                </form>
              )}
              {situacaoAtual === "confirmado" && (
                <p className="text-muted-foreground text-sm">
                  Matrícula confirmada; as demais opções da criança foram
                  liberadas automaticamente.
                </p>
              )}
            </div>
            {SITUACOES_FILA.includes(situacaoAtual) && convocacaoAberta && (
              <p className="text-muted-foreground text-xs">
                Há uma convocação em aberto em outra unidade.
              </p>
            )}
          </Secao>
        </>
      )}
    </>
  );
}
