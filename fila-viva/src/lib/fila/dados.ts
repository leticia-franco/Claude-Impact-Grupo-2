import { createClient } from "@/lib/supabase/server";

import type {
  EntradaFila,
  Grupamento,
  RespostaCriterio,
  SituacaoOpcao,
  Turno,
} from "./logica";

/** Processo 195 = seleção 2025, o último ano carregado da base do hackathon. */
export const PROCESSO_ATUAL = 195;

export type Cre = { id: number; nome: string };

export type Unidade = {
  id: string;
  nome: string;
  bairro: string | null;
  cep: string | null;
  gestao: string | null;
  cre_id: number | null;
  latitude: number | null;
  longitude: number | null;
};

/**
 * Cache em memória por instância do servidor para dados que praticamente não
 * mudam (CREs, unidades, geolocalização). Corta idas repetidas ao banco a cada
 * navegação; o TTL garante que uma carga nova de unidades apareça em minutos.
 */
const TTL_ESTATICO_MS = 10 * 60 * 1000;
const cacheEstatico = new Map<string, { validade: number; valor: unknown }>();

async function comCache<T>(chave: string, busca: () => Promise<T>): Promise<T> {
  const guardado = cacheEstatico.get(chave);
  if (guardado && guardado.validade > Date.now()) return guardado.valor as T;
  const valor = await busca();
  cacheEstatico.set(chave, { validade: Date.now() + TTL_ESTATICO_MS, valor });
  return valor;
}

export async function buscaCres(): Promise<Cre[]> {
  return comCache("cres", async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("fv_cre")
      .select("id, nome")
      .order("id");
    if (error) throw new Error(`fv_cre: ${error.message}`);
    return data;
  });
}

export async function buscaUnidades(creId: number): Promise<Unidade[]> {
  return comCache(`unidades:${creId}`, () => buscaUnidadesSemCache(creId));
}

async function buscaUnidadesSemCache(creId: number): Promise<Unidade[]> {
  const supabase = await createClient();
    const { data, error } = await supabase
      .from("fv_unidade")
      .select("id, nome, bairro, cep, gestao, cre_id, latitude, longitude")
    .eq("cre_id", creId)
    .order("nome");
  if (error) throw new Error(`fv_unidade: ${error.message}`);
  return data;
}

/**
 * Posições de fila (ativo/lista de espera) do processo atual por unidade da
 * CRE, para a tela abrir na maior fila. Agregado no Postgres (fv_fila_contagem).
 */
export async function contaFilaPorUnidade(
  creId: number,
): Promise<Map<string, number>> {
  const linhas = await comCache(`contagem:${creId}`, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("fv_fila_contagem", {
      p_cre_id: creId,
      p_processo_id: PROCESSO_ATUAL,
    });
    if (error) throw new Error(`fv_fila_contagem: ${error.message}`);
    return data as { unidade_id: string; total: number }[];
  });
  return new Map(linhas.map((l) => [l.unidade_id, Number(l.total)]));
}

type FilaRpcRow = {
  opcao_id: number;
  situacao: SituacaoOpcao;
  situacao_em: string | null;
  grupamento: Grupamento;
  turno: Turno;
  inscricao_id: number;
  crianca_id: string;
  pontuacao: number;
  pontuacao_confirmada: number;
  bairro: string | null;
  cep: string | null;
  cre_id: number | null;
  criada_em: string;
  tem_cadunico: boolean;
  tem_irmao: boolean;
  resp_menor18: boolean;
  criterios_resumo: string | null;
  confirmada_em_outra: string[] | null;
  aguardando_em_outra: string[] | null;
};

/**
 * Todas as opções da unidade no processo atual, em qualquer situação (a tela
 * separa fila, convocadas, matriculadas e encerradas). Uma chamada só: a
 * função fv_fila_da_unidade calcula no Postgres os flags de critério e a
 * situação de cada criança nas outras unidades, em vez de a tela baixar as
 * respostas do questionário linha a linha.
 */
export async function buscaFilaDaUnidade(
  unidadeId: string,
): Promise<EntradaFila[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fv_fila_da_unidade", {
    p_unidade_id: unidadeId,
    p_processo_id: PROCESSO_ATUAL,
  });
  if (error) throw new Error(`fv_fila_da_unidade: ${error.message}`);

  return (data as FilaRpcRow[]).map((row) => ({
    opcaoId: row.opcao_id,
    situacao: row.situacao,
    situacaoEm: row.situacao_em,
    grupamento: row.grupamento,
    turno: row.turno,
    inscricaoId: row.inscricao_id,
    criancaId: row.crianca_id,
    pontuacao: Number(row.pontuacao ?? 0),
    pontuacaoConfirmada: Number(row.pontuacao_confirmada ?? 0),
    bairro: row.bairro,
    cep: row.cep,
    creId: row.cre_id,
    criadaEm: row.criada_em,
    temCadunico: row.tem_cadunico,
    temIrmao: row.tem_irmao,
    respMenor18: row.resp_menor18,
    criteriosResumo: row.criterios_resumo,
    confirmadaEmOutra: row.confirmada_em_outra ?? [],
    aguardandoOutra: row.aguardando_em_outra ?? [],
  }));
}

export type Processo = { id: number; ano: number };

export async function buscaProcessos(): Promise<Processo[]> {
  return comCache("processos", async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("fv_processo")
      .select("id, ano")
      .order("ano", { ascending: false });
    if (error) throw new Error(`fv_processo: ${error.message}`);
    return data;
  });
}

// ---------------------------------------------------------------------------
// Indicadores da fila (tela /painel)
// ---------------------------------------------------------------------------

export type FiltrosIndicadores = {
  processoId: number;
  creId?: number;
  unidadeId?: string;
  grupamento?: Grupamento;
  turno?: Turno;
  /** Intervalo sobre a data de criação da inscrição (coorte), yyyy-mm-dd. */
  de?: string;
  ate?: string;
};

/** Desfecho por criança: matriculada > em convocação > na fila > cancelada. */
export type DesfechoContagem = {
  total: number;
  matriculadas: number;
  convocadas: number;
  lista_espera: number;
  canceladas: number;
};

export type Indicadores = {
  resumo: DesfechoContagem;
  situacoes: { situacao: SituacaoOpcao; opcoes: number }[];
  por_cre: (DesfechoContagem & { cre_id: number })[];
  por_unidade: (DesfechoContagem & { unidade_id: string; nome: string })[];
  por_grupamento: (DesfechoContagem & { grupamento: Grupamento })[];
  por_turno: (DesfechoContagem & { turno: Turno })[];
  serie_mensal: { mes: string; inscricoes: number; matriculadas: number }[];
  convocacoes: {
    total: number;
    abertas: number;
    confirmadas: number;
    nao_localizadas: number;
    recusadas: number;
    expiradas: number;
  };
  comunicados: {
    total: number;
    atendidas: number;
    nao_atendidas: number;
    invalidas: number;
    aguardando: number;
  };
  por_canal: { canal: string; total: number; atendidas: number }[];
  tempo_etapas: {
    etapa: string;
    n: number;
    mediana_dias: number;
    p90_dias: number;
  }[];
};

/**
 * Todos os agregados da tela de indicadores em UMA chamada (fv_indicadores):
 * o volume de fv_opcao inviabiliza agregar no cliente. O recorte é a coorte
 * de inscrições do período; convocações e tempos seguem a mesma coorte.
 */
export async function buscaIndicadores(
  filtros: FiltrosIndicadores,
): Promise<Indicadores> {
  return comCache(`indicadores:${JSON.stringify(filtros)}`, () =>
    buscaIndicadoresSemCache(filtros),
  );
}

async function buscaIndicadoresSemCache(
  filtros: FiltrosIndicadores,
): Promise<Indicadores> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fv_indicadores", {
    p_processo_id: filtros.processoId,
    p_cre_id: filtros.creId ?? null,
    p_unidade_id: filtros.unidadeId ?? null,
    p_grupamento: filtros.grupamento ?? null,
    p_turno: filtros.turno ?? null,
    p_de: filtros.de ?? null,
    p_ate: filtros.ate ?? null,
  });
  if (error) throw new Error(`fv_indicadores: ${error.message}`);
  return data as Indicadores;
}

export type Capacidade = { grupamento: Grupamento; vagas: number };

/** Vagas medidas por grupamento (SME jul/2025; só rede pública tem fonte). */
export async function buscaCapacidade(
  unidadeId: string,
): Promise<Capacidade[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fv_capacidade")
    .select("grupamento, vagas, referencia")
    .eq("unidade_id", unidadeId)
    .order("referencia", { ascending: false });
  if (error) throw new Error(`fv_capacidade: ${error.message}`);

  // Fica a medição mais recente de cada grupamento.
  const porGrupamento = new Map<Grupamento, number>();
  for (const row of data as { grupamento: Grupamento; vagas: number }[]) {
    if (!porGrupamento.has(row.grupamento)) {
      porGrupamento.set(row.grupamento, row.vagas);
    }
  }
  return [...porGrupamento].map(([grupamento, vagas]) => ({ grupamento, vagas }));
}

// ---------------------------------------------------------------------------
// Detalhe da criança (aba lateral)
// ---------------------------------------------------------------------------

export type TentativaContato = {
  id: number;
  canal: string;
  resultado: string;
  tentada_em: string;
};

export type Convocacao = {
  id: number;
  opcao_id: number;
  aberta_em: string;
  prazo_comparecimento_em: string | null;
  desfecho: string | null;
  desfecho_em: string | null;
  tentativas: TentativaContato[];
};

export type DetalheCrianca = {
  crianca: {
    id: string;
    sexo: string | null;
    nascimento_anomes: string | null;
  } | null;
  inscricoes: {
    id: number;
    bairro: string | null;
    cep: string | null;
    cre_id: number | null;
    pontuacao: number;
    pontuacao_confirmada: number;
    criada_em: string;
    respostas: RespostaCriterio[];
  }[];
  opcoes: {
    opcaoId: number;
    inscricaoId: number;
    ordem: number;
    situacao: SituacaoOpcao;
    situacaoEm: string | null;
    grupamento: Grupamento;
    turno: Turno;
    unidade: {
      id: string;
      nome: string;
      bairro: string | null;
      cep: string | null;
      creId: number | null;
      latitude: number | null;
      longitude: number | null;
    };
  }[];
  convocacoes: Convocacao[];
};

/** Tudo da criança no processo atual: inscrições, respostas, opções (com a
 * unidade e sua localização) e o rastro de convocações e tentativas. */
export async function buscaDetalheCrianca(
  criancaId: string,
): Promise<DetalheCrianca> {
  const supabase = await createClient();

  const [criancaRes, inscricoesRes] = await Promise.all([
    supabase
      .from("fv_crianca")
      .select("id, sexo, nascimento_anomes")
      .eq("id", criancaId)
      .maybeSingle(),
    supabase
      .from("fv_inscricao")
      .select(
        `id, bairro, cep, cre_id, pontuacao, pontuacao_confirmada, criada_em,
         respostas:fv_resposta(confirmado, criterio:fv_criterio(pergunta, pontuacao)),
         opcoes:fv_opcao(
           id, ordem, situacao, situacao_em, grupamento, turno,
           unidade:fv_unidade(id, nome, bairro, cep, cre_id, latitude, longitude)
         )`,
      )
      .eq("crianca_id", criancaId)
      .eq("processo_id", PROCESSO_ATUAL),
  ]);
  if (criancaRes.error) throw new Error(`fv_crianca: ${criancaRes.error.message}`);
  if (inscricoesRes.error)
    throw new Error(`fv_inscricao (detalhe): ${inscricoesRes.error.message}`);

  type InscricaoRow = {
    id: number;
    bairro: string | null;
    cep: string | null;
    cre_id: number | null;
    pontuacao: number | null;
    pontuacao_confirmada: number | null;
    criada_em: string;
    respostas: RespostaCriterio[];
    opcoes: {
      id: number;
      ordem: number;
      situacao: SituacaoOpcao;
      situacao_em: string | null;
      grupamento: Grupamento;
      turno: Turno;
      unidade: {
        id: string;
        nome: string;
        bairro: string | null;
        cep: string | null;
        cre_id: number | null;
        latitude: number | null;
        longitude: number | null;
      } | null;
    }[];
  };

  const inscricoes = (inscricoesRes.data as unknown as InscricaoRow[]) ?? [];
  const opcoes = inscricoes.flatMap((i) =>
    i.opcoes
      .filter((o) => o.unidade)
      .map((o) => ({
        opcaoId: o.id,
        inscricaoId: i.id,
        ordem: o.ordem,
        situacao: o.situacao,
        situacaoEm: o.situacao_em,
        grupamento: o.grupamento,
        turno: o.turno,
        unidade: {
          id: o.unidade!.id,
          nome: o.unidade!.nome,
          bairro: o.unidade!.bairro,
          cep: o.unidade!.cep,
          creId: o.unidade!.cre_id,
          latitude: o.unidade!.latitude,
          longitude: o.unidade!.longitude,
        },
      })),
  );
  opcoes.sort((a, b) => a.ordem - b.ordem);

  let convocacoes: Convocacao[] = [];
  if (opcoes.length > 0) {
    const { data, error } = await supabase
      .from("fv_convocacao")
      .select(
        `id, opcao_id, aberta_em, prazo_comparecimento_em, desfecho, desfecho_em,
         tentativas:fv_tentativa_contato(id, canal, resultado, tentada_em)`,
      )
      .in(
        "opcao_id",
        opcoes.map((o) => o.opcaoId),
      )
      .order("aberta_em", { ascending: false });
    if (error) throw new Error(`fv_convocacao: ${error.message}`);
    convocacoes = (data as unknown as Convocacao[]) ?? [];
  }

  return {
    crianca: criancaRes.data,
    inscricoes: inscricoes.map((i) => ({
      id: i.id,
      bairro: i.bairro,
      cep: i.cep,
      cre_id: i.cre_id,
      pontuacao: Number(i.pontuacao ?? 0),
      pontuacao_confirmada: Number(i.pontuacao_confirmada ?? 0),
      criada_em: i.criada_em,
      respostas: i.respostas ?? [],
    })),
    opcoes,
    convocacoes,
  };
}

export type EnderecoAproximado = {
  bairro: string | null;
  cep: string | null;
  creId: number | null;
};

export type LocalizacaoAproximada = {
  latitude: number;
  longitude: number;
  base: string;
};

type GeoRow = {
  bairro: string | null;
  cep: string | null;
  cre_id: number | null;
  latitude: number;
  longitude: number;
};

function normalizaLocalidade(valor: string | null) {
  return (valor ?? "").normalize("NFD").replace(/\p{M}/gu, "").trim().toUpperCase();
}

function prefixoCepLocalizacao(cep: string | null) {
  return (cep ?? "").replace(/\D/g, "").slice(0, 5);
}

async function buscaBaseGeografica(): Promise<GeoRow[]> {
  return comCache("geo", async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("fv_unidade")
      .select("bairro, cep, cre_id, latitude, longitude")
      .not("latitude", "is", null)
      .not("longitude", "is", null);
    if (error) throw new Error(`fv_unidade (geo): ${error.message}`);
    return (data as GeoRow[]) ?? [];
  });
}

function localizaNaBase(
  endereco: EnderecoAproximado,
  rows: GeoRow[],
): LocalizacaoAproximada | null {
  const centroide = (selecao: GeoRow[]) => {
    if (selecao.length === 0) return null;
    return {
      latitude: selecao.reduce((s, r) => s + r.latitude, 0) / selecao.length,
      longitude: selecao.reduce((s, r) => s + r.longitude, 0) / selecao.length,
    };
  };

  const prefixoCep = prefixoCepLocalizacao(endereco.cep);
  const doCep = prefixoCep
    ? centroide(rows.filter((row) => prefixoCepLocalizacao(row.cep) === prefixoCep))
    : null;
  if (doCep) return { ...doCep, base: `região do CEP ${prefixoCep}` };

  const doBairro = centroide(
    rows.filter(
      (row) => normalizaLocalidade(row.bairro) === normalizaLocalidade(endereco.bairro),
    ),
  );
  if (doBairro && endereco.bairro) {
    return { ...doBairro, base: `centroide do bairro ${endereco.bairro}` };
  }
  const daCre = centroide(rows.filter((r) => r.cre_id === endereco.creId));
  if (daCre) return { ...daCre, base: "centroide da CRE" };
  return null;
}

/** Resolve vários endereços com uma única leitura da base geográfica. */
export async function aproximaLocalizacoes(
  enderecos: EnderecoAproximado[],
): Promise<(LocalizacaoAproximada | null)[]> {
  const rows = await buscaBaseGeografica();
  return enderecos.map((endereco) => localizaNaBase(endereco, rows));
}

/**
 * Localização aproximada da criança: região do CEP; sem ela, centroide do
 * bairro e, por último, da CRE. A base não contém o endereço exato.
 */
export async function aproximaLocalizacao(
  endereco: EnderecoAproximado,
): Promise<LocalizacaoAproximada | null> {
  const [localizacao] = await aproximaLocalizacoes([endereco]);
  return localizacao;
}
