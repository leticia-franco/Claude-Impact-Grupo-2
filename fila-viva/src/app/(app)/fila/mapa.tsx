"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

import { buscaRotaViaria } from "./roteamento";

export type PontoMapa = {
  latitude: number;
  longitude: number;
  rotulo: string;
  cor: string;
  origem?: boolean;
  destaque?: boolean;
};

/** Mapa do posicionamento: criança (aproximada) x unidades das opções. */
export function MapaPosicionamento({ pontos }: { pontos: PontoMapa[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [estadoRota, setEstadoRota] = useState<
    { tipo: "carregando" } | { tipo: "pronta"; distanciaKm: number } | { tipo: "erro" }
  >({ tipo: "carregando" });

  useEffect(() => {
    if (!container.current || pontos.length === 0) return;

    let mapa: import("leaflet").Map | null = null;
    let ativo = true;

    const destaque = pontos.find((p) => p.destaque);
    const casa = pontos.find((p) => p.origem);
    const promessaRota =
      destaque && casa && destaque !== casa
        ? buscaRotaViaria(casa, destaque)
        : Promise.resolve(null);
    setEstadoRota({ tipo: "carregando" });

    // Leaflet acessa window no import, então só carrega no navegador.
    Promise.all([import("leaflet"), promessaRota]).then(([{ default: L }, rota]) => {
      if (!ativo || !container.current) return;

      mapa = L.map(container.current, { zoomControl: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · rota <a href="https://project-osrm.org/">OSRM</a>',
      }).addTo(mapa);

      const grupo: [number, number][] = [];
      for (const ponto of pontos) {
        const coords: [number, number] = [ponto.latitude, ponto.longitude];
        grupo.push(coords);
        L.circleMarker(coords, {
          radius: ponto.destaque ? 9 : 6,
          color: ponto.cor,
          fillColor: ponto.cor,
          fillOpacity: 0.85,
          weight: ponto.destaque ? 3 : 1,
        })
          .addTo(mapa)
          .bindTooltip(ponto.rotulo);
      }

      if (rota) {
        L.polyline(rota.geometria, {
          color: "#2563eb",
          opacity: 0.9,
          weight: 4,
        }).addTo(mapa);
        grupo.push(...rota.geometria);
        setEstadoRota({ tipo: "pronta", distanciaKm: rota.distanciaKm });
      } else {
        setEstadoRota({ tipo: "erro" });
      }
      mapa.fitBounds(L.latLngBounds(grupo).pad(0.35));
    });

    return () => {
      ativo = false;
      mapa?.remove();
    };
  }, [pontos]);

  return (
    <div className="relative overflow-hidden rounded-xl border">
      <div
        ref={container}
        className="h-64 w-full"
        aria-label="Mapa da rota viária entre a localização aproximada da criança e a unidade"
      />
      <div
        className="bg-background/92 absolute top-3 left-3 z-[500] rounded-lg border px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur"
        aria-live="polite"
      >
        {estadoRota.tipo === "carregando" && "Calculando rota…"}
        {estadoRota.tipo === "erro" && "Rota viária indisponível"}
        {estadoRota.tipo === "pronta" &&
          `${estadoRota.distanciaKm.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} km pela rota`}
      </div>
    </div>
  );
}
