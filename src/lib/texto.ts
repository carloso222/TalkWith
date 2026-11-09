/** Quita acentos y pasa a minúsculas conservando la longitud del texto. */
export const normalizar = (s: string) => Array.from(s, (ch) => ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()).join('')

/** Palabras con significado de una consulta ("permisos del micrófono" → permisos, microfono). */
export const terminos = (q: string) =>
  normalizar(q)
    .split(/\s+/)
    .filter((w) => w.length > 3)
