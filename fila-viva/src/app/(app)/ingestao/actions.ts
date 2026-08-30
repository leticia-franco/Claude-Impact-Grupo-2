"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { CHUNK, MAPEADORES, parseCsv, type TipoLote } from "@/lib/ingestao";

export type IngestaoState = {
  error?: string;
  ok?: boolean;
  resumo?: Record<string, number>;
};

const TIPOS: TipoLote[] = ["inscricoes", "respostas", "capacidade"];

const RPC: Record<TipoLote, "fv_ingerir_inscricoes" | "fv_ingerir_respostas" | "fv_ingerir_capacidade"> = {
  inscricoes: "fv_ingerir_inscricoes",
  respostas: "fv_ingerir_respostas",
  capacidade: "fv_ingerir_capacidade",
};

function somaResumos(acumulado: Record<string, number>, parcial: unknown) {
  if (!parcial || typeof parcial !== "object") return;
  for (const [chave, valor] of Object.entries(parcial)) {
    if (typeof valor === "number") {
      acumulado[chave] = (acumulado[chave] ?? 0) + valor;
    }
  }
}

export async function processarLote(
  _prev: IngestaoState,
  formData: FormData,
): Promise<IngestaoState> {
  const tipo = String(formData.get("tipo") ?? "") as TipoLote;
  const referencia = String(formData.get("referencia") ?? "");
  const arquivo = formData.get("arquivo");

  if (!TIPOS.includes(tipo)) return { error: "Escolha o tipo do arquivo." };
  if (!referencia) return { error: "Informe a data de referência do fechamento." };
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { error: "Escolha um arquivo CSV." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, entre de novo." };

  const { data: perfil } = await supabase
    .from("fv_perfil")
    .select("papel")
    .eq("user_id", user.id)
    .maybeSingle();
  if (perfil?.papel !== "sme") {
    return {
      error: `Ingestão de dados é restrita ao perfil SME (o seu é "${perfil?.papel ?? "sem perfil"}").`,
    };
  }

  const mapeado = MAPEADORES[tipo](parseCsv(await arquivo.text()));
  if (mapeado.erro) return { error: mapeado.erro };
  if (mapeado.linhas.length === 0) {
    return { error: "O arquivo não tem linhas de dados." };
  }

  // Lote que morreu no meio (timeout, deploy) não pode ficar "processando"
  // para sempre; o reenvio é seguro porque a consolidação é idempotente.
  await supabase
    .from("fv_lote")
    .update({ status: "erro", erro: "Interrompido no meio; reenvie o arquivo." })
    .eq("status", "processando")
    .lt("criado_em", new Date(Date.now() - 15 * 60_000).toISOString());

  const { data: lote, error: erroLote } = await supabase
    .from("fv_lote")
    .insert({
      tipo,
      nome_arquivo: arquivo.name,
      referencia,
      linhas_arquivo: mapeado.linhasArquivo,
      enviado_por: user.id,
    })
    .select("id")
    .single();
  if (erroLote || !lote) {
    return { error: `Não consegui registrar o lote: ${erroLote?.message}` };
  }

  const resumo: Record<string, number> = {};
  const tamanho = CHUNK[tipo];

  for (let i = 0; i < mapeado.linhas.length; i += tamanho) {
    const chunk = mapeado.linhas.slice(i, i + tamanho);
    const args =
      tipo === "capacidade"
        ? { p_lote: lote.id, p_linhas: chunk, p_referencia: referencia }
        : { p_lote: lote.id, p_linhas: chunk };

    const { data, error } = await supabase.rpc(RPC[tipo], args);
    if (error) {
      await supabase
        .from("fv_lote")
        .update({ status: "erro", erro: error.message, concluido_em: new Date().toISOString() })
        .eq("id", lote.id);
      revalidatePath("/ingestao");
      return { error: `Falha ao consolidar (lote ${lote.id}): ${error.message}` };
    }
    somaResumos(resumo, data);
  }

  await supabase
    .from("fv_lote")
    .update({
      status: "concluido",
      resumo,
      concluido_em: new Date().toISOString(),
    })
    .eq("id", lote.id);

  revalidatePath("/ingestao");
  return { ok: true, resumo };
}
