/** "00:24:18" o "24:18" → segundos. */
export const aSegundos = (hms: string) => hms.split(':').map(Number).reduce((total, n) => total * 60 + n, 0)

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const dosDigitos = (n: number) => String(n).padStart(2, '0')

// misma fecha de calendario
const mismoDia = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** Fecha de una sesión: "Hoy, 16:20", "Ayer, 18:30" o "29 sep, 10:00". */
export function fechaSesion(fecha: Date, ahora: Date = new Date()): string {
  const hora = `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`
  const ayer = new Date(ahora)
  ayer.setDate(ahora.getDate() - 1)
  if (mismoDia(fecha, ahora)) return `Hoy, ${hora}`
  if (mismoDia(fecha, ayer)) return `Ayer, ${hora}`
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]}, ${hora}`
}

/** Hora de un segmento: "16:21:04". */
export const horaTexto = (fecha: Date) => [fecha.getHours(), fecha.getMinutes(), fecha.getSeconds()].map(dosDigitos).join(':')

/** Segundos → "00:24:18". */
export const formatear = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return [h, m, s % 60].map((n) => String(n).padStart(2, '0')).join(':')
}