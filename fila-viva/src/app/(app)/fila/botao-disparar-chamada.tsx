"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";

import { dispararChamada } from "./acoes";
import { ComunicacaoConfirmada } from "./comunicacao-confirmada";

export function BotaoDispararChamada({
  opcaoId,
  criancaId,
  proximaChamada,
}: {
  opcaoId: number;
  criancaId: string;
  proximaChamada: number;
}) {
  const [estado, setEstado] = useState<"pronto" | "enviando" | "enviada">(
    "pronto",
  );
  const [chamada, setChamada] = useState(proximaChamada);

  async function dispara() {
    setEstado("enviando");
    try {
      const resultado = await dispararChamada(opcaoId);
      if (resultado.enviada) {
        setChamada(resultado.chamada);
        setEstado("enviada");
        window.setTimeout(() => setEstado("pronto"), 5000);
        return;
      }
      setEstado("pronto");
    } catch {
      setEstado("pronto");
    }
  }

  if (estado === "enviada") {
    return <ComunicacaoConfirmada criancaId={criancaId} chamada={chamada} />;
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={dispara}
      disabled={estado === "enviando"}
    >
      {estado === "enviando" ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Send className="size-4" aria-hidden />
      )}
      {estado === "enviando"
        ? "Enviando e-mail + WhatsApp…"
        : `Disparar ${proximaChamada}ª chamada`}
    </Button>
  );
}
