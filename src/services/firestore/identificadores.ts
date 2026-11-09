const SIN_ACENTOS = /[\u0300-\u036f]/g

/** Alfabeto sin 0/1/i/l/o para que el código se lea bien; 31 símbolos. */
const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789'

/** "Club de Diseño UX" -> "CD" */
export function crearIniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/)
  const letras = palabras.length > 1 ? palabras[0][0] + palabras[1][0] : palabras[0].slice(0, 2)
  return letras.toUpperCase()
}

/** "Club de Diseño UX" -> "club-diseno-ux" (con `sinArticulos` quita de, del, la, el, y). */
export function crearSlug(texto: string, sinArticulos = true): string {
  const base = texto.normalize('NFD').replace(SIN_ACENTOS, '').toLowerCase()
  return (sinArticulos ? base.replace(/\b(de|del|la|el|y)\b/g, '') : base).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** `largo` símbolos del alfabeto con `crypto.getRandomValues`, sin sesgo de módulo. */
export function sufijoAleatorio(largo: number): string {
  const limite = 256 - (256 % ALFABETO.length)
  let salida = ''
  while (salida.length < largo) {
    const bytes = crypto.getRandomValues(new Uint8Array(largo * 2))
    for (const b of bytes) {
      if (b < limite && salida.length < largo) salida += ALFABETO[b % ALFABETO.length]
    }
  }
  return salida
}
