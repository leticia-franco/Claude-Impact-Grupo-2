/**
 * RASCUNHO da lógica de ordenação e simulação da fila (para revisão do grupo).
 *
 * A fila oficial ordena por pontuação declarada no questionário socioeconômico,
 * com dois desempates (irmão na rede, responsável menor de 18). Este módulo
 * mantém essa base e acrescenta três ideias em avaliação:
 *
 * 1. BLOCO DE VULNERABILIDADE: o CadÚnico vale 51 pontos, mais que a soma de
 *    todos os outros critérios, então na prática a régua já divide a fila em
 *    dois blocos estanques. Aqui isso vira explícito: bloco 1 (CadÚnico
 *    declarado) sempre à frente do bloco 2.
 *
 * 2. DISTÂNCIA VIÁRIA INFORMATIVA: a interface calcula a rota até a unidade e
 *    exibe quilômetros com duas casas decimais. Ela não reordena esta régua:
 *    quando os critérios oficiais empatam, continua valendo o tempo de fila.
 *
 * 3. LIBERAÇÃO AUTOMÁTICA: cada uma das até 5 opções da família é uma fila
 *    distinta. Quando a criança alcança a vez em uma delas (é selecionada), o
 *    espaço que ela ocupa nas outras filas deixa de existir na hora, em vez de
 *    segurar posição. A matriculada sai em definitivo; a selecionada retoma a
 *    posição se a seleção morrer sem matrícula (as chamadas se esgotarem). A
 *    simulação mostra a posição de cada criança hoje e a posição caso a
 *    liberação existisse.
 *
 * Limites conhecidos do rascunho (anotar na revisão):
 * - A origem da rota é aproximada por CEP, bairro ou CRE porque a base não
 *   guarda a coordenada exata da residência. A distância, porém, segue a malha
 *   viária e nunca é substituída por uma linha reta.
 * - A régua de 2025 quase não tem validação registrada (só 4,4 mil inscrições
 *   com pontuação confirmada > 0 em 72 mil), então a ordenação usa a pontuação
 *   DECLARADA, como a lista pública de convocação, e exibe a validada ao lado.
 */

export type Grupamento = "bercario" | "maternal_1" | "maternal_2";
export type Turno = "integral" | "parcial";

export type SituacaoOpcao =
  | "ativo"
  | "selecionado"
  | "selecionado_lista"
  | "confirmado"
  | "lista_espera"
  | "cancelado"
  | "cancelado_confirmacao"
  | "cancelado_sistema";

export type RespostaCriterio = {
  confirmado: boolean;
  criterio: { pergunta: string; pontuacao: number } | null;
};

/**
 * Uma opção de unidade dentro de uma inscrição, com o contexto da inscrição.
 * Os flags de critério e a situação fora da unidade já vêm calculados do
 * Postgres (função fv_fila_da_unidade), para a tela não carregar as respostas
 * do questionário linha a linha.
 */
export type EntradaFila = {
  opcaoId: number;
  situacao: SituacaoOpcao;
  situacaoEm: string | null;
  grupamento: Grupamento;
  turno: Turno;
  inscricaoId: number;
  criancaId: string;
  pontuacao: number;
  pontuacaoConfirmada: number;
  bairro: string | null;
  cep: string | null;
  creId: number | null;
  criadaEm: string;
  temCadunico: boolean;
  temIrmao: boolean;
  respMenor18: boolean;
  /** Texto pronto com os critérios declarados (tooltip da coluna de pontos). */
  criteriosResumo: string | null;
  confirmadaEmOutra: string[];
  aguardandoOutra: string[];
  /** Origem aproximada usada apenas para distância e mapa de rota. */
  localizacaoAproximada?: {
    latitude: number;
    longitude: number;
    base: string;
  } | null;
};

/** Por que a criança está fora da fila de prioridade desta unidade. */
export type MotivoForaDaFila = "matriculada_em_outra" | "selecionada_em_outra";

export type LinhaFila = EntradaFila & {
  bloco: 1 | 2;
  temIrmaoNaRede: boolean;
  responsavelMenor18: boolean;
  posicao: number;
  /** Posição com a liberação automática ligada; null = fora da fila de prioridade (ver foraDaFila). */
  posicaoSimulada: number | null;
  foraDaFila: MotivoForaDaFila | null;
};

function comparaLinhas(a: LinhaFila, b: LinhaFila): number {
  // 1. Bloco de vulnerabilidade (CadÚnico primeiro).
  if (a.bloco !== b.bloco) return a.bloco - b.bloco;
  // 2. Pontuação declarada, como na lista pública de convocação.
  if (a.pontuacao !== b.pontuacao) return b.pontuacao - a.pontuacao;
  // 3-4. Desempates da resolução, na ordem em que ela os lista.
  if (a.temIrmaoNaRede !== b.temIrmaoNaRede) return a.temIrmaoNaRede ? -1 : 1;
  if (a.responsavelMenor18 !== b.responsavelMenor18) {
    return a.responsavelMenor18 ? -1 : 1;
  }
  // 5. Tempo de fila (inscrição mais antiga primeiro).
  return Date.parse(a.criadaEm) - Date.parse(b.criadaEm);
}

/**
 * Ordena as entradas de UMA turma (unidade + grupamento + turno) segundo o
 * rascunho, deduplicando criança que aparece em mais de uma inscrição, e
 * calcula a posição atual e a simulada com liberação automática.
 */
export function ordenaFila(
  entradas: EntradaFila[],
): LinhaFila[] {
  const linhas = entradas.map<LinhaFila>((entrada) => {
    return {
      ...entrada,
      bloco: entrada.temCadunico ? 1 : 2,
      temIrmaoNaRede: entrada.temIrmao,
      responsavelMenor18: entrada.respMenor18,
      posicao: 0,
      posicaoSimulada: null,
      foraDaFila: null,
    };
  });

  linhas.sort(comparaLinhas);

  // Mesma criança em mais de uma inscrição na mesma turma: fica só a mais bem
  // colocada (a fila real é de crianças, não de posições).
  const vistas = new Set<string>();
  const deduplicadas = linhas.filter((linha) => {
    if (vistas.has(linha.criancaId)) return false;
    vistas.add(linha.criancaId);
    return true;
  });

  let posicao = 0;
  let posicaoSimulada = 0;
  for (const linha of deduplicadas) {
    linha.posicao = ++posicao;
    // Liberação automática: quem matriculou em outra unidade sai desta fila
    // em definitivo; quem foi SELECIONADA em outra unidade (alcançou a vez lá)
    // libera a posição enquanto a convocação corre (se as chamadas se
    // esgotarem sem matrícula, o status na outra unidade muda e a criança
    // retoma a posição aqui sozinha, porque tudo deriva da situação atual).
    // Os demais sobem.
    linha.foraDaFila =
      linha.confirmadaEmOutra.length > 0
        ? "matriculada_em_outra"
        : linha.aguardandoOutra.length > 0
          ? "selecionada_em_outra"
          : null;
    linha.posicaoSimulada = linha.foraDaFila ? null : ++posicaoSimulada;
  }

  return deduplicadas;
}

export const GRUPAMENTO_LABEL: Record<Grupamento, string> = {
  bercario: "Berçário",
  maternal_1: "Maternal I",
  maternal_2: "Maternal II",
};

export const TURNO_LABEL: Record<Turno, string> = {
  integral: "Integral",
  parcial: "Parcial",
};

export const GRUPAMENTOS: Grupamento[] = ["bercario", "maternal_1", "maternal_2"];
export const TURNOS: Turno[] = ["integral", "parcial"];

/** Situações que compõem a fila de espera propriamente dita. */
export const SITUACOES_FILA: SituacaoOpcao[] = ["ativo", "lista_espera"];

/** Situações de convocação em aberto (vaga oferecida, aguardando resposta). */
export const SITUACOES_CONVOCADA: SituacaoOpcao[] = [
  "selecionado",
  "selecionado_lista",
];

/** Situações em que a opção ainda "vive" (fila ou convocação pendente). */
export const SITUACOES_VIVAS: SituacaoOpcao[] = [
  ...SITUACOES_FILA,
  ...SITUACOES_CONVOCADA,
];

/**
 * Chamadas automáticas (e-mail + WhatsApp) por convocação. Sem matrícula até
 * a última, a inscrição é cancelada e a família se reinscreve no próximo ano.
 */
export const CHAMADAS_MAX = 3;

/**
 * Intervalo mínimo entre chamadas automáticas: a família sem resposta recebe
 * novo comunicado a cada dia (2ª e 3ª chamadas). 20h em vez de 24h para a
 * rotina diária não pular um dia por rodar um pouco mais cedo que a véspera.
 */
export const INTERVALO_CHAMADA_MS = 20 * 60 * 60 * 1000;

/**
 * Rótulo e cor de cada situação, na linguagem do fluxo real (inscrita →
 * selecionada → em convocação → matriculada / cancelada), não a do sistema de
 * origem: o enum do banco vem da base histórica e não muda. As classes usam a
 * paleta padrão do Tailwind para as tags coloridas.
 */
export const STATUS_META: Record<
  SituacaoOpcao,
  { rotulo: string; classes: string; coluna: "fila" | "convocada" | "matriculada" | "encerrada" }
> = {
  ativo: {
    rotulo: "inscrita",
    classes: "border-transparent bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
    coluna: "fila",
  },
  lista_espera: {
    rotulo: "inscrita (lista de espera)",
    classes: "border-transparent bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
    coluna: "fila",
  },
  selecionado: {
    rotulo: "selecionada (em convocação)",
    classes: "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    coluna: "convocada",
  },
  selecionado_lista: {
    rotulo: "selecionada da lista (em convocação)",
    classes: "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    coluna: "convocada",
  },
  confirmado: {
    rotulo: "matriculada",
    classes: "border-transparent bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
    coluna: "matriculada",
  },
  cancelado: {
    rotulo: "cancelada (desclassificada)",
    classes: "border-transparent bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
    coluna: "encerrada",
  },
  cancelado_confirmacao: {
    rotulo: "cancelada (chamadas sem matrícula)",
    classes: "border-transparent bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
    coluna: "encerrada",
  },
  cancelado_sistema: {
    rotulo: "cancelada (vaga em outra unidade)",
    classes: "border-transparent bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
    coluna: "encerrada",
  },
};
