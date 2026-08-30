"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { Route } from "lucide-react";

import {
  buscaDistanciasViarias,
  chaveRota,
  type CoordenadaRota,
} from "./roteamento";

type ValorDistancia = number | null;
type Ouvinte = () => void;
type Pedido = {
  chave: string;
  origem: CoordenadaRota;
  destino: CoordenadaRota;
};

const cache = new Map<string, ValorDistancia>();
const ouvintes = new Map<string, Set<Ouvinte>>();
const pendentes = new Map<string, Pedido>();
let temporizador: ReturnType<typeof setTimeout> | null = null;

const formatador = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function publica(chave: string, valor: ValorDistancia) {
  cache.set(chave, valor);
  for (const ouvinte of ouvintes.get(chave) ?? []) ouvinte();
}

async function processaPendentes() {
  temporizador = null;
  const pedidos = [...pendentes.values()];
  pendentes.clear();

  const porDestino = new Map<string, Pedido[]>();
  for (const pedido of pedidos) {
    const chaveDestino = `${pedido.destino.longitude.toFixed(6)},${pedido.destino.latitude.toFixed(6)}`;
    const grupo = porDestino.get(chaveDestino) ?? [];
    grupo.push(pedido);
    porDestino.set(chaveDestino, grupo);
  }

  // Lotes pequenos evitam URLs extensas e respeitam melhor o servidor público.
  for (const grupo of porDestino.values()) {
    for (let inicio = 0; inicio < grupo.length; inicio += 40) {
      const lote = grupo.slice(inicio, inicio + 40);
      const valores = await buscaDistanciasViarias(
        lote.map((pedido) => pedido.origem),
        lote[0].destino,
      );
      lote.forEach((pedido, indice) => publica(pedido.chave, valores[indice] ?? null));
    }
  }
}

function agenda(pedido: Pedido) {
  if (cache.has(pedido.chave)) return;
  pendentes.set(pedido.chave, pedido);
  if (temporizador === null) temporizador = setTimeout(processaPendentes, 40);
}

export function DistanciaRota({
  origem,
  destino,
  baseOrigem,
  compacta = false,
}: {
  origem: CoordenadaRota | null | undefined;
  destino: CoordenadaRota | null | undefined;
  baseOrigem?: string | null;
  compacta?: boolean;
}) {
  const chave = useMemo(
    () => (origem && destino ? chaveRota(origem, destino) : null),
    [destino, origem],
  );
  const assina = useCallback(
    (ouvinte: Ouvinte) => {
      if (!chave) return () => {};
      const grupo = ouvintes.get(chave) ?? new Set<Ouvinte>();
      grupo.add(ouvinte);
      ouvintes.set(chave, grupo);
      return () => {
        grupo.delete(ouvinte);
        if (grupo.size === 0) ouvintes.delete(chave);
      };
    },
    [chave],
  );
  const leDistancia = useCallback(
    () => (chave && cache.has(chave) ? cache.get(chave) : undefined),
    [chave],
  );
  const distancia = useSyncExternalStore(
    assina,
    leDistancia,
    () => undefined,
  );

  useEffect(() => {
    if (!chave || !origem || !destino) return;
    if (!cache.has(chave)) agenda({ chave, origem, destino });
  }, [chave, destino, origem]);

  if (!chave) {
    return <span className="text-muted-foreground text-xs">sem coordenadas</span>;
  }

  const texto =
    distancia === undefined
      ? "calculando rota…"
      : distancia === null
        ? "rota indisponível"
        : `${formatador.format(distancia)} km`;

  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium tabular-nums"
      title={`Distância pela rota viária a partir de ${baseOrigem ?? "localização aproximada da residência"}. Fonte: OSRM/OpenStreetMap.`}
      aria-live="polite"
    >
      {!compacta && <Route className="text-primary size-3.5" aria-hidden />}
      {texto}
    </span>
  );
}
