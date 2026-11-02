/** "00:24:18" o "24:18" → segundos. */
export const aSegundos = (hms: string) => hms.split(':').map(Number).reduce((total, n) => total * 60 + n, 0)

/** Segundos → "00:24:18". */
export const formatear = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return [h, m, s % 60].map((n) => String(n).padStart(2, '0')).join(':')
}