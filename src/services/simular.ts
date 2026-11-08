export const LATENCIA_MS = 250

/** Regresa una copia del valor en una Promise con retardo (datos de ejemplo). */
export function simular<T>(valor: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(valor)), LATENCIA_MS))
}
