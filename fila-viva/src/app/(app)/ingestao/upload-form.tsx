"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { processarLote, type IngestaoState } from "./actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INITIAL: IngestaoState = {};

const ROTULOS_RESUMO: Record<string, string> = {
  linhas: "linhas processadas",
  linhas_duplicadas: "duplicadas no arquivo",
  linhas_invalidas: "inválidas",
  processos_novos: "processos novos",
  unidades_novas: "unidades novas",
  criancas_novas: "crianças novas",
  inscricoes_novas: "inscrições novas",
  opcoes_novas: "opções novas",
  mudancas_situacao: "mudanças de situação",
  linhas_sim: "respostas Sim",
  sem_criterio: "sem critério correspondente",
  sem_inscricao: "sem inscrição correspondente",
  respostas_novas: "respostas novas",
  respostas_atualizadas: "respostas atualizadas",
  respostas_retratadas: "respostas retratadas",
  inscricoes_repontuadas: "inscrições repontuadas",
  unidades_no_arquivo: "unidades no arquivo",
  unidades_sem_cadastro: "unidades sem cadastro",
  capacidades_novas: "capacidades novas",
  capacidades_atualizadas: "capacidades atualizadas",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {pending ? "Consolidando..." : "Subir e consolidar"}
    </Button>
  );
}

function Feedback({ state }: { state: IngestaoState }) {
  if (state.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle aria-hidden />
        <AlertDescription>{state.error}</AlertDescription>
      </Alert>
    );
  }

  if (state.ok) {
    const itens = Object.entries(state.resumo ?? {}).filter(([, v]) => v > 0);

    return (
      <Alert>
        <CheckCircle2 aria-hidden />
        <AlertDescription>
          <p>Lote consolidado.</p>
          {itens.length > 0 && (
            <span className="mt-2 flex flex-wrap gap-1.5">
              {itens.map(([chave, valor]) => (
                <Badge key={chave} variant="secondary">
                  {valor.toLocaleString("pt-BR")} {ROTULOS_RESUMO[chave] ?? chave}
                </Badge>
              ))}
            </span>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

export function UploadForm() {
  const [state, action] = useActionState(processarLote, INITIAL);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo do arquivo</Label>
          <select
            id="tipo"
            name="tipo"
            required
            defaultValue="inscricoes"
            className="border-input bg-transparent dark:bg-input/30 h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none"
          >
            <option value="inscricoes">Extração de inscrições (opções e situações)</option>
            <option value="respostas">Respostas socioeconômicas</option>
            <option value="capacidade">Capacidade por unidade e grupamento</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="referencia">Data de referência do fechamento</Label>
          <Input id="referencia" name="referencia" type="date" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="arquivo">Arquivo CSV (separador ponto e vírgula)</Label>
        <Input id="arquivo" name="arquivo" type="file" accept=".csv,text/csv" required />
        <p className="text-muted-foreground text-xs">
          Mesmo layout das extrações da SME. Subir o mesmo arquivo duas vezes não duplica
          nada: o que já existe vira no-op e só as diferenças de situação geram eventos.
        </p>
      </div>

      <Feedback state={state} />
      <SubmitButton />
    </form>
  );
}
