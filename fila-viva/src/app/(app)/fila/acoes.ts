"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { PROCESSO_ATUAL } from "@/lib/fila/dados";
import {
  CHAMADAS_MAX,
  INTERVALO_CHAMADA_MS,
  SITUACOES_VIVAS,
  type SituacaoOpcao,
} from "@/lib/fila/logica";

/**
 * Ações de gestão da fila. A permissão real vem do RLS (papéis sme/cre);
 * o trigger fv_opcao_mudanca grava situacao_em e o evento de auditoria a cada
 * mudança de situação.
 */

async function mudaSituacao(opcaoId: number, situacao: SituacaoOpcao) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("fv_opcao")
    .update({ situacao })
    .eq("id", opcaoId);
  if (error) throw new Error(`mudança de situação: ${error.message}`);
}

async function fechaConvocacaoAberta(opcaoId: number, desfecho: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fv_convocacao")
    .select("id")
    .eq("opcao_id", opcaoId)
    .is("desfecho", null)
    .order("aberta_em", { ascending: false })
    .limit(1);
  if (data && data.length > 0) {
    await supabase
      .from("fv_convocacao")
      .update({ desfecho, desfecho_em: new Date().toISOString() })
      .eq("id", data[0].id);
  }
}

/**
 * Seleciona a criança: ela alcançou a vez nesta fila. No mesmo ato, o espaço
 * que ela ocupa nas filas das outras unidades deixa de existir (a ordenação
 * deriva da situação atual, então as outras filas liberam a posição sozinhas
 * e a devolvem se a seleção morrer sem matrícula). A convocação propriamente
 * dita (chamadas por e-mail e WhatsApp) começa no primeiro disparo.
 */
export async function selecionar(opcaoId: number) {
  await mudaSituacao(opcaoId, "selecionado");
  // Sem revalidatePath aqui de propósito: o botão de seleção conduz o fluxo
  // selecionada → 1ª chamada no cliente e só revalida no disparo, para o
  // operador ver cada passo da transição.
}

/**
 * MOCK da integração de envio. Quando os disparos forem integrados, a chamada
 * real às APIs de e-mail, WhatsApp e ligação entra aqui, com os contatos da
 * família; o restante do fluxo (registro datado em fv_tentativa_contato, que
 * alimenta as métricas e o tracking) já está pronto e não muda.
 */
async function enviaComunicacoes(opcaoId: number, chamada: number) {
  void opcaoId;
  void chamada;
}

/** Canais registrados a cada chamada automática (um registro datado por canal). */
const CANAIS_CHAMADA = ["email", "whatsapp"] as const;

async function insereTentativasChamada(convocacaoId: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("fv_tentativa_contato").insert(
    CANAIS_CHAMADA.map((canal) => ({
      convocacao_id: convocacaoId,
      canal,
      resultado: "aguardando",
    })),
  );
  if (error) throw new Error(`tentativa de contato: ${error.message}`);
}

/**
 * Dispara uma chamada da convocação: comunicação à família por e-mail e
 * WhatsApp (envio mocado em enviaComunicacoes). A 1ª chamada abre a
 * convocação com os prazos de contato e comparecimento; cada disparo fica
 * registrado com data em fv_tentativa_contato, um registro por canal, para o
 * tracking e as métricas. O nº da chamada é contado pelos registros de
 * WhatsApp (um por chamada). No teto de chamadas, não dispara.
 */
export async function dispararChamada(opcaoId: number) {
  const supabase = await createClient();

  const { data: abertas } = await supabase
    .from("fv_convocacao")
    .select("id, tentativas:fv_tentativa_contato(canal)")
    .eq("opcao_id", opcaoId)
    .is("desfecho", null)
    .order("aberta_em", { ascending: false })
    .limit(1);

  let convocacaoId = abertas?.[0]?.id;
  let chamadasFeitas = (abertas?.[0]?.tentativas ?? []).filter(
    (t) => t.canal === "whatsapp",
  ).length;

  if (!convocacaoId) {
    const agora = Date.now();
    const { data, error } = await supabase
      .from("fv_convocacao")
      .insert({
        opcao_id: opcaoId,
        prazo_contato_em: new Date(agora + 3 * 86_400_000).toISOString(),
        prazo_comparecimento_em: new Date(agora + 6 * 86_400_000).toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(`convocação: ${error.message}`);
    convocacaoId = data.id;
    chamadasFeitas = 0;
  }

  if (chamadasFeitas >= CHAMADAS_MAX) {
    revalidatePath("/fila");
    return { enviada: false, chamada: chamadasFeitas };
  }

  const chamada = chamadasFeitas + 1;
  await enviaComunicacoes(opcaoId, chamada);
  await insereTentativasChamada(convocacaoId);
  revalidatePath("/fila");
  return { enviada: true, chamada };
}

/**
 * Rotina das chamadas seguintes (mock do job diário do servidor): para cada
 * convocação aberta da unidade parada há mais de um dia e ainda abaixo do
 * teto, dispara a próxima chamada, garantindo que a família no 2º ou 3º dia
 * receba novos comunicados. Hoje roda quando a tela da fila abre; quando os
 * disparos forem integrados, vira um agendamento e esta função se aposenta.
 * Retorna quantos disparos fez, para a tela informar.
 */
export async function processaChamadasDaUnidade(
  unidadeId: string,
): Promise<{ total: number; criancas: string[] }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fv_convocacao")
    .select(
      `id, opcao_id,
       opcao:fv_opcao!inner(unidade_id, inscricao:fv_inscricao!inner(crianca_id)),
       tentativas:fv_tentativa_contato(canal, tentada_em)`,
    )
    .is("desfecho", null)
    .eq("opcao.unidade_id", unidadeId);
  if (error) throw new Error(`convocações abertas: ${error.message}`);

  let disparos = 0;
  const criancas = new Set<string>();
  for (const convocacao of data ?? []) {
    const autos = convocacao.tentativas.filter((t) => t.canal === "whatsapp");
    if (autos.length === 0 || autos.length >= CHAMADAS_MAX) continue;
    const ultima = Math.max(...autos.map((t) => Date.parse(t.tentada_em)));
    if (Date.now() - ultima < INTERVALO_CHAMADA_MS) continue;
    await enviaComunicacoes(convocacao.opcao_id, autos.length + 1);
    await insereTentativasChamada(convocacao.id);
    disparos++;
    const opcao = convocacao.opcao as unknown as {
      inscricao: { crianca_id: string };
    };
    criancas.add(opcao.inscricao.crianca_id);
  }

  if (disparos > 0) revalidatePath("/fila");
  return { total: disparos, criancas: [...criancas] };
}

/**
 * Confirma a matrícula e executa a LIBERAÇÃO AUTOMÁTICA: as demais opções
 * vivas da criança no processo saem das outras filas no mesmo ato, sem esperar
 * rotina manual. É o coração da proposta da fila dinâmica.
 */
export async function confirmarMatricula(opcaoId: number) {
  const supabase = await createClient();

  const { data: opcao, error: erroOpcao } = await supabase
    .from("fv_opcao")
    .select("id, inscricao:fv_inscricao!inner(crianca_id)")
    .eq("id", opcaoId)
    .single();
  if (erroOpcao) throw new Error(`opção: ${erroOpcao.message}`);
  const criancaId = (opcao as unknown as { inscricao: { crianca_id: string } })
    .inscricao.crianca_id;

  await mudaSituacao(opcaoId, "confirmado");
  await fechaConvocacaoAberta(opcaoId, "confirmada");

  const { data: outras, error: erroOutras } = await supabase
    .from("fv_opcao")
    .select("id, inscricao:fv_inscricao!inner(crianca_id, processo_id)")
    .neq("id", opcaoId)
    .eq("inscricao.crianca_id", criancaId)
    .eq("inscricao.processo_id", PROCESSO_ATUAL)
    .in("situacao", SITUACOES_VIVAS);
  if (erroOutras) throw new Error(`outras opções: ${erroOutras.message}`);

  const ids = (outras ?? []).map((o) => o.id);
  if (ids.length > 0) {
    const { error } = await supabase
      .from("fv_opcao")
      .update({ situacao: "cancelado_sistema" })
      .in("id", ids);
    if (error) throw new Error(`liberação automática: ${error.message}`);
  }
  revalidatePath("/fila");
}

/** Família recusou a vaga: encerra esta opção e libera a vaga para o próximo. */
export async function registrarRecusa(opcaoId: number) {
  await mudaSituacao(opcaoId, "cancelado_confirmacao");
  await fechaConvocacaoAberta(opcaoId, "recusada");
  revalidatePath("/fila");
}

/**
 * As chamadas se esgotaram (ou o prazo venceu) sem matrícula: cancela a
 * inscrição e libera a vaga para o próximo da fila. A família precisa se
 * inscrever de novo no próximo processo para pleitear vaga.
 */
export async function registrarExpiracao(opcaoId: number) {
  await mudaSituacao(opcaoId, "cancelado_confirmacao");
  await fechaConvocacaoAberta(opcaoId, "expirada");
  revalidatePath("/fila");
}

/** Não localizada: devolve à lista de espera e registra o desfecho. */
export async function registrarNaoLocalizada(opcaoId: number) {
  await mudaSituacao(opcaoId, "lista_espera");
  await fechaConvocacaoAberta(opcaoId, "nao_localizada");
  revalidatePath("/fila");
}

/** Desclassifica a opção (ex.: documentação não comprova o declarado). */
export async function desclassificar(opcaoId: number) {
  await mudaSituacao(opcaoId, "cancelado");
  await fechaConvocacaoAberta(opcaoId, "expirada");
  revalidatePath("/fila");
}

/** Devolve a opção à lista de espera (desfaz engano de operação). */
export async function voltarParaFila(opcaoId: number) {
  await mudaSituacao(opcaoId, "lista_espera");
  revalidatePath("/fila");
}

/**
 * Registra uma ação humana de contato com a família (ligação ou visita) na
 * convocação aberta da opção, com data, para o tracking. As chamadas
 * automáticas (e-mail + WhatsApp) passam por dispararChamada.
 */
export async function registrarContato(
  opcaoId: number,
  canal: "telefone" | "visita",
) {
  const supabase = await createClient();

  const { data: abertas } = await supabase
    .from("fv_convocacao")
    .select("id")
    .eq("opcao_id", opcaoId)
    .is("desfecho", null)
    .order("aberta_em", { ascending: false })
    .limit(1);

  let convocacaoId = abertas?.[0]?.id;
  if (!convocacaoId) {
    const agora = Date.now();
    const { data, error } = await supabase
      .from("fv_convocacao")
      .insert({
        opcao_id: opcaoId,
        prazo_contato_em: new Date(agora + 3 * 86_400_000).toISOString(),
        prazo_comparecimento_em: new Date(agora + 6 * 86_400_000).toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(`convocação: ${error.message}`);
    convocacaoId = data.id;
  }

  const { error } = await supabase.from("fv_tentativa_contato").insert({
    convocacao_id: convocacaoId,
    canal,
    resultado: "aguardando",
  });
  if (error) throw new Error(`tentativa de contato: ${error.message}`);
  revalidatePath("/fila");
}
