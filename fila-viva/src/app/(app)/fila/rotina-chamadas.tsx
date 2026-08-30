"use client";

import { useEffect, useRef, useState } from "react";
import { processaChamadasDaUnidade } from "./acoes";
import { ComunicacaoConfirmada } from "./comunicacao-confirmada";

type Resultado = { total: number; criancas: string[] };

/**
 * Dispara a rotina das chamadas seguintes ao abrir a tela da fila (mock do
 * job diário: convocação sem resposta há mais de um dia recebe a 2ª ou 3ª
 * chamada) e informa quando algum disparo aconteceu agora. Quando o envio for
 * integrado e agendado no servidor, este componente sai.
 */
export function RotinaChamadas({ unidadeId }: { unidadeId: string }) {
  const rodou = useRef(false);
  const [resultado, setResultado] = useState<Resultado>({
    total: 0,
    criancas: [],
  });

  useEffect(() => {
    if (rodou.current) return;
    rodou.current = true;
    processaChamadasDaUnidade(unidadeId).then(setResultado).catch(() => {});
  }, [unidadeId]);

  if (resultado.total === 0) return null;
  return (
    <div className="space-y-2">
      <ComunicacaoConfirmada
        criancaId={resultado.criancas[0]}
        criancaIds={resultado.criancas}
        total={resultado.total}
      />
      <p className="text-muted-foreground px-1 text-xs">
        Aluno{resultado.criancas.length > 1 ? "s" : ""}: {resultado.criancas.join(", ")}
        {" · "}nova chamada por e-mail e WhatsApp para convocação sem resposta.
      </p>
    </div>
  );
}
