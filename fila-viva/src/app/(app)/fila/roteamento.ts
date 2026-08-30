export type CoordenadaRota = {
  latitude: number;
  longitude: number;
};

export type RotaViaria = {
  distanciaKm: number;
  geometria: [number, number][];
};

const OSRM_BASE_URL = "https://router.project-osrm.org";
const cacheDistancias = new Map<string, number | null>();
const cacheRotas = new Map<string, RotaViaria | null>();

function opcoesFetch(): RequestInit {
  return typeof window === "undefined"
    ? { headers: { "User-Agent": "FilaViva/0.1 (protótipo SME-Rio)" } }
    : {};
}

function serializa({ latitude, longitude }: CoordenadaRota) {
  return `${longitude.toFixed(6)},${latitude.toFixed(6)}`;
}

export function chaveRota(origem: CoordenadaRota, destino: CoordenadaRota) {
  return `${serializa(origem)}>${serializa(destino)}`;
}

/**
 * Consulta a rota viária no servidor público de demonstração do OSRM.
 * Não usa chave e não substitui a distância por linha reta quando não há rota.
 */
export async function buscaRotaViaria(
  origem: CoordenadaRota,
  destino: CoordenadaRota,
): Promise<RotaViaria | null> {
  const chave = chaveRota(origem, destino);
  if (cacheRotas.has(chave)) return cacheRotas.get(chave) ?? null;
  const url = new URL(
    `/route/v1/driving/${serializa(origem)};${serializa(destino)}`,
    OSRM_BASE_URL,
  );
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("steps", "false");

  try {
    const resposta = await fetch(url, opcoesFetch());
    if (!resposta.ok) {
      cacheRotas.set(chave, null);
      return null;
    }
    const corpo = (await resposta.json()) as {
      code?: string;
      routes?: {
        distance: number;
        geometry: { coordinates: [number, number][] };
      }[];
    };
    const rota = corpo.code === "Ok" ? corpo.routes?.[0] : null;
    if (!rota) {
      cacheRotas.set(chave, null);
      return null;
    }
    const resultado: RotaViaria = {
      distanciaKm: rota.distance / 1000,
      geometria: rota.geometry.coordinates.map(([longitude, latitude]) => [
        latitude,
        longitude,
      ] as [number, number]),
    };
    cacheRotas.set(chave, resultado);
    return resultado;
  } catch {
    cacheRotas.set(chave, null);
    return null;
  }
}

/** Distâncias das rotas mais rápidas, em quilômetros, até um único destino. */
export async function buscaDistanciasViarias(
  origens: CoordenadaRota[],
  destino: CoordenadaRota,
): Promise<(number | null)[]> {
  if (origens.length === 0) return [];
  const chaves = origens.map((origem) => chaveRota(origem, destino));
  const resultado: (number | null | undefined)[] = chaves.map((chave) =>
    cacheDistancias.has(chave) ? cacheDistancias.get(chave) : undefined,
  );
  const faltantes = origens
    .map((origem, indice) => ({ origem, indice }))
    .filter(({ indice }) => resultado[indice] === undefined);
  if (faltantes.length === 0) return resultado as (number | null)[];

  const coordenadas = [...faltantes.map(({ origem }) => origem), destino]
    .map(serializa)
    .join(";");
  const indiceDestino = faltantes.length;
  const url = new URL(
    `/table/v1/driving/${coordenadas}`,
    OSRM_BASE_URL,
  );
  url.searchParams.set(
    "sources",
    faltantes.map((_, indice) => String(indice)).join(";"),
  );
  url.searchParams.set("destinations", String(indiceDestino));
  url.searchParams.set("annotations", "distance");

  try {
    const resposta = await fetch(url, opcoesFetch());
    if (!resposta.ok) throw new Error("OSRM indisponível");
    const corpo = (await resposta.json()) as {
      code?: string;
      distances?: (number | null)[][];
    };
    if (corpo.code !== "Ok" || !corpo.distances) {
      throw new Error("OSRM não retornou a matriz de distâncias");
    }
    faltantes.forEach(({ indice }, indiceFaltante) => {
      const metros = corpo.distances?.[indiceFaltante]?.[0];
      const valor = metros == null ? null : metros / 1000;
      resultado[indice] = valor;
      cacheDistancias.set(chaves[indice], valor);
    });
  } catch {
    faltantes.forEach(({ indice }) => {
      resultado[indice] = null;
      cacheDistancias.set(chaves[indice], null);
    });
  }
  return resultado as (number | null)[];
}
