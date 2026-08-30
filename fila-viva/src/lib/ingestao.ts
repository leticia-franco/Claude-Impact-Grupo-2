/**
 * Parse e mapeamento dos arquivos de ingestão (tela /ingestao).
 *
 * Três formatos, todos CSV com separador ";" (o padrão das extrações da SME):
 * - inscricoes: layout da extração de inscrições (Query A do hackathon);
 * - respostas: layout da extração de respostas socioeconômicas (Query B);
 * - capacidade: uma linha por unidade, colunas por grupamento.
 *
 * Funções puras: quem fala com o banco é a server action.
 */

export type TipoLote = "inscricoes" | "respostas" | "capacidade";

export type Mapeado = {
  linhas: Record<string, unknown>[];
  /** Total de linhas de dados no arquivo, antes de qualquer filtro. */
  linhasArquivo: number;
  erro?: string;
};

/** CSV com aspas, CRLF e BOM. Separador ";". */
export function parseCsv(texto: string, separador = ";"): string[][] {
  if (texto.charCodeAt(0) === 0xfeff) texto = texto.slice(1);

  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let aspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];

    if (aspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          aspas = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      aspas = true;
    } else if (c === separador) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo);
      campo = "";
      if (linha.length > 1 || linha[0] !== "") linhas.push(linha);
      linha = [];
    } else {
      campo += c;
    }
  }

  if (campo !== "" || linha.length > 0) {
    linha.push(campo);
    if (linha.length > 1 || linha[0] !== "") linhas.push(linha);
  }

  return linhas;
}

/** minúsculas, sem acento, sem espaços duplicados: "Berçário " -> "bercario" */
function normaliza(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function indice(cabecalho: string[], ...nomes: string[]): number {
  const normais = cabecalho.map(normaliza);
  for (const nome of nomes) {
    const i = normais.indexOf(nome);
    if (i >= 0) return i;
  }
  return -1;
}

function inteiro(v: string | undefined): number | null {
  const s = (v ?? "").trim();
  if (!s || normaliza(s) === "null") return null;
  const n = Number(s);
  return Number.isInteger(n) ? n : null;
}

function textoOuNulo(v: string | undefined): string | null {
  const s = (v ?? "").trim();
  return s && normaliza(s) !== "null" ? s : null;
}

/** Timestamp "2024-12-11 08:28:42.937" (ou ISO). Malformado vira null em vez
 *  de abortar o chunk inteiro no cast do Postgres. */
function timestampOuNulo(v: string | undefined): string | null {
  const s = textoOuNulo(v);
  return s && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?/.test(s) ? s : null;
}

const COLUNAS_INSCRICOES = [
  "ano", "prm_id", "plm_id", "ipl_id", "opcao", "unidade", "nome_unidade",
  "grupamento", "horario", "data_criacao", "aluno_anon", "sexo_crianca",
  "nascimento_aluno_anomes", "responsavel_anon", "cep", "bairro", "situacao",
] as const;

export function mapearInscricoes(celulas: string[][]): Mapeado {
  const [cabecalho, ...dados] = celulas;
  if (!cabecalho) return { linhas: [], linhasArquivo: 0, erro: "Arquivo vazio." };

  const pos: Record<string, number> = {};
  for (const col of COLUNAS_INSCRICOES) {
    const i = indice(cabecalho, col);
    if (i < 0) {
      return {
        linhas: [],
        linhasArquivo: dados.length,
        erro: `Coluna obrigatória ausente: ${col}. O arquivo precisa seguir o layout da extração de inscrições.`,
      };
    }
    pos[col] = i;
  }

  const vistos = new Set<string>();
  const linhas = dados.map((l) => ({
    ano: inteiro(l[pos.ano]),
    prm_id: inteiro(l[pos.prm_id]),
    plm_id: inteiro(l[pos.plm_id]),
    ipl_id: inteiro(l[pos.ipl_id]),
    opcao: inteiro(l[pos.opcao]),
    unidade: textoOuNulo(l[pos.unidade]),
    nome_unidade: textoOuNulo(l[pos.nome_unidade]),
    grupamento: textoOuNulo(l[pos.grupamento]),
    horario: textoOuNulo(l[pos.horario]),
    data_criacao: timestampOuNulo(l[pos.data_criacao]),
    aluno_anon: textoOuNulo(l[pos.aluno_anon]),
    sexo_crianca: textoOuNulo(l[pos.sexo_crianca]),
    nascimento_aluno_anomes: textoOuNulo(l[pos.nascimento_aluno_anomes]),
    responsavel_anon: textoOuNulo(l[pos.responsavel_anon]),
    cep: textoOuNulo(l[pos.cep]),
    bairro: textoOuNulo(l[pos.bairro]),
    situacao: textoOuNulo(l[pos.situacao]),
  })).filter((l) => {
    const chave = `${l.prm_id}|${l.plm_id}|${l.ipl_id}|${l.opcao}`;
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });

  return { linhas, linhasArquivo: dados.length };
}

export function mapearRespostas(celulas: string[][]): Mapeado {
  const [cabecalho, ...dados] = celulas;
  if (!cabecalho) return { linhas: [], linhasArquivo: 0, erro: "Arquivo vazio." };

  const pos: Record<string, number> = {};
  for (const col of ["prm_id", "plm_id", "ipl_id", "ich_perg_id", "resposta", "confirmado"]) {
    const i = indice(cabecalho, col);
    if (i < 0) {
      return {
        linhas: [],
        linhasArquivo: dados.length,
        erro: `Coluna obrigatória ausente: ${col}. O arquivo precisa seguir o layout da extração de respostas.`,
      };
    }
    pos[col] = i;
  }

  // Sim e Não viajam: o banco guarda só os Sim (modelo esparso), mas precisa
  // do Não para retratar um Sim corrigido na origem.
  const vistos = new Set<string>();
  const linhas = dados
    .map((l) => ({
      prm_id: inteiro(l[pos.prm_id]),
      plm_id: inteiro(l[pos.plm_id]),
      ipl_id: inteiro(l[pos.ipl_id]),
      ich_perg_id: inteiro(l[pos.ich_perg_id]),
      resposta: (l[pos.resposta] ?? "").trim() === "Sim" ? "Sim" : "Nao",
      confirmado: textoOuNulo(l[pos.confirmado]),
    }))
    .filter((l) => {
      const chave = `${l.prm_id}|${l.plm_id}|${l.ipl_id}|${l.ich_perg_id}`;
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    });

  return { linhas, linhasArquivo: dados.length };
}

export function mapearCapacidade(celulas: string[][]): Mapeado {
  const [cabecalho, ...dados] = celulas;
  if (!cabecalho) return { linhas: [], linhasArquivo: 0, erro: "Arquivo vazio." };

  const iUnidade = indice(cabecalho, "designacao", "unidade", "codigo");
  const iBercario = indice(cabecalho, "bercario");
  const iM1 = indice(cabecalho, "maternal i", "maternal 1");
  const iM2 = indice(cabecalho, "maternal ii", "maternal 2");

  if (iUnidade < 0 || (iBercario < 0 && iM1 < 0 && iM2 < 0)) {
    return {
      linhas: [],
      linhasArquivo: dados.length,
      erro:
        "O arquivo de capacidade precisa da coluna Designação (código da unidade) e de ao menos uma coluna de grupamento (Berçário, Maternal I, Maternal II).",
    };
  }

  const linhas = dados
    .map((l) => {
      let unidade = textoOuNulo(l[iUnidade]);
      // Excel costuma comer o zero à esquerda do código de 7 dígitos
      if (unidade && /^[0-9]{6}$/.test(unidade)) unidade = `0${unidade}`;
      return {
        unidade,
        bercario: iBercario >= 0 ? inteiro(l[iBercario]) : null,
        maternal_1: iM1 >= 0 ? inteiro(l[iM1]) : null,
        maternal_2: iM2 >= 0 ? inteiro(l[iM2]) : null,
      };
    })
    .filter((l) => l.unidade);

  const vistos = new Set<string>();
  const unicas = linhas.filter((l) => {
    if (vistos.has(l.unidade!)) return false;
    vistos.add(l.unidade!);
    return true;
  });

  return { linhas: unicas, linhasArquivo: dados.length };
}

export const MAPEADORES: Record<TipoLote, (c: string[][]) => Mapeado> = {
  inscricoes: mapearInscricoes,
  respostas: mapearRespostas,
  capacidade: mapearCapacidade,
};

/** Tamanho de chunk por chamada de RPC (payload alvo em torno de 1 a 2 MB). */
export const CHUNK: Record<TipoLote, number> = {
  inscricoes: 4000,
  respostas: 8000,
  capacidade: 2000,
};
