/** Convierte "00:24:18", "24:18" o "16:21:04" a segundos. */
export function aSegundos(hms: string): number {
  return hms
    .split(':')
    .map(Number)
    .reduce((acc, n) => acc * 60 + n, 0)
}

/** Formatea segundos como "6:58" o "1:02:05". */
export function formatoTiempo(seg: number): string {
  const s = Math.max(0, Math.floor(seg))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`
}

/**
 * Alturas de la forma de onda (0–1). Son pseudoaleatorias pero estables para
 * cada sesión, así la misma grabación siempre se dibuja igual.
 */
export function formaDeOnda(semilla: string, barras = 96): number[] {
  let h = 0
  for (const ch of semilla) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return Array.from({ length: barras }, (_, i) => {
    h = (h * 1664525 + 1013904223) >>> 0
    const ruido = (h % 1000) / 1000
    const envolvente = 0.45 + 0.35 * Math.sin(i / 7) * Math.sin(i / 17)
    return Math.min(1, Math.max(0.12, envolvente + (ruido - 0.5) * 0.6))
  })
}
