"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { dispararChamada, selecionar } from "./acoes";
import {
  ComunicacaoConfirmada,
  DURACAO_CONFIRMACAO_MS,
} from "./comunicacao-confirmada";

type Fase = "pronto" | "selecionando" | "selecionada" | "disparando" | "enviada";

const ROTULO: Record<Fase, string> = {
  pronto: "Selecionar para a vaga",
  selecionando: "Selecionando…",
  selecionada: "Selecionada, preparando 1ª chamada…",
  disparando: "Disparando e-mail + WhatsApp…",
  enviada: "Comunicação enviada",
};

/** Pausa entre a seleção e a 1ª chamada, para a transição ficar visível. */
const PAUSA_MS = 3000;

/**
 * Conduz o fluxo completo da seleção: grava a criança como selecionada,
 * mostra a transição e dispara a 1ª chamada da convocação (registrada com
 * data no banco; envio mocado até a integração). A tela só revalida no
 * disparo final, para o operador acompanhar cada passo no botão.
 */
export function BotaoSelecionar({
  opcaoId,
  criancaId,
}: {
  opcaoId: number;
  criancaId: string;
}) {
  const [fase, setFase] = useState<Fase>("pronto");
  const [chamada, setChamada] = useState(1);

  async function executa() {
    setFase("selecionando");
    try {
      await selecionar(opcaoId);
      setFase("selecionada");
      await new Promise((resolve) => setTimeout(resolve, PAUSA_MS));
      setFase("disparando");
      const resultado = await dispararChamada(opcaoId);
      if (resultado.enviada) {
        setChamada(resultado.chamada);
        setFase("enviada");
        await new Promise((resolve) =>
          setTimeout(resolve, DURACAO_CONFIRMACAO_MS),
        );
      }
    } finally {
      setFase("pronto");
    }
  }

  if (fase === "enviada") {
    return <ComunicacaoConfirmada criancaId={criancaId} chamada={chamada} />;
  }

  return (
    <Button size="sm" onClick={executa} disabled={fase !== "pronto"}>
      {fase !== "pronto" && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {ROTULO[fase]}
    </Button>
  );
}
