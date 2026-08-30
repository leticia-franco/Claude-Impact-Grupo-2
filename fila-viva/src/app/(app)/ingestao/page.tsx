import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { UploadForm } from "./upload-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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

export const metadata: Metadata = { title: "Ingestão" };

// Arquivos grandes: dá fôlego para a consolidação em chunks.
export const maxDuration = 60;

const TIPO_ROTULO: Record<string, string> = {
  inscricoes: "Inscrições",
  respostas: "Respostas",
  capacidade: "Capacidade",
};

const DESTAQUE_RESUMO: Record<string, string> = {
  mudancas_situacao: "mudanças de situação",
  inscricoes_novas: "inscrições novas",
  opcoes_novas: "opções novas",
  respostas_novas: "respostas novas",
  respostas_retratadas: "retratadas",
  inscricoes_repontuadas: "repontuadas",
  capacidades_novas: "capacidades novas",
  capacidades_atualizadas: "capacidades atualizadas",
  linhas_invalidas: "inválidas",
};

function formataData(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

function formataReferencia(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "concluido") return <Badge>concluído</Badge>;
  if (status === "erro") return <Badge variant="destructive">erro</Badge>;
  return <Badge variant="secondary">processando</Badge>;
}

function Resumo({ resumo }: { resumo: Record<string, number> | null }) {
  if (!resumo) return <span className="text-muted-foreground">—</span>;

  const itens = Object.entries(DESTAQUE_RESUMO)
    .map(([chave, rotulo]) => [resumo[chave] ?? 0, rotulo] as const)
    .filter(([valor]) => valor > 0);

  if (itens.length === 0) {
    return <span className="text-muted-foreground">sem novidades</span>;
  }

  return (
    <span className="flex flex-wrap gap-1">
      {itens.map(([valor, rotulo]) => (
        <Badge key={rotulo} variant="outline">
          {valor.toLocaleString("pt-BR")} {rotulo}
        </Badge>
      ))}
    </span>
  );
}

export default async function IngestaoPage() {
  const supabase = await createClient();

  const [{ data: perfil }, { data: lotes }] = await Promise.all([
    supabase.auth
      .getUser()
      .then(({ data: { user } }) =>
        supabase.from("fv_perfil").select("papel").eq("user_id", user?.id ?? "").maybeSingle(),
      ),
    supabase
      .from("fv_lote")
      .select(
        "id, tipo, nome_arquivo, referencia, status, linhas_arquivo, resumo, erro, criado_em, concluido_em",
      )
      .order("criado_em", { ascending: false })
      .limit(25),
  ]);

  return (
    <>
      <PageHeader
        titulo="Ingestão"
        descricao="Fechou o período, sobe o arquivo: o sistema consolida por chave natural e cada mudança de situação vira um evento datado, a linha do tempo que a origem não registra."
      />

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subir fechamento</CardTitle>
            <CardDescription className="text-pretty">
              Extração de inscrições, respostas socioeconômicas ou capacidade por unidade.
              Pode ser o fechamento do mês ou uma subida manual diária.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {perfil?.papel === "sme" ? (
              <UploadForm />
            ) : (
              <Alert>
                <AlertDescription>
                  A ingestão é restrita ao perfil SME. O seu perfil atual é{" "}
                  {perfil?.papel ?? "sem perfil"}; peça o ajuste a quem administra o
                  sistema.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lotes recebidos</CardTitle>
            <CardDescription>
              Cada subida vira um lote com o rastro do que mudou no banco.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!lotes || lotes.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum lote ainda. O primeiro fechamento subido aparece aqui.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead className="text-right">Linhas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>O que mudou</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lotes.map((lote) => (
                    <TableRow key={lote.id}>
                      <TableCell className="max-w-48 truncate font-medium">
                        {lote.nome_arquivo}
                      </TableCell>
                      <TableCell>{TIPO_ROTULO[lote.tipo] ?? lote.tipo}</TableCell>
                      <TableCell>{formataReferencia(lote.referencia)}</TableCell>
                      <TableCell>{formataData(lote.criado_em)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {lote.linhas_arquivo?.toLocaleString("pt-BR") ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={lote.status} />
                      </TableCell>
                      <TableCell>
                        {lote.status === "erro" ? (
                          <span className="text-destructive text-xs">{lote.erro}</span>
                        ) : (
                          <Resumo resumo={lote.resumo} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
