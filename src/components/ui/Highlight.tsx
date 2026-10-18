import { Fragment } from 'react'
import { normalizar, terminos } from '../../services'

/**
 * Resalta en `texto` las palabras de `consulta`, sin importar acentos ni mayúsculas
 * ("microfono" encuentra "micrófono").
 */
export default function Highlight({ texto, consulta, activo = false }: { texto: string; consulta: string; activo?: boolean }) {
  const palabras = terminos(consulta)
  if (!palabras.length) return <>{texto}</>
  const base = normalizar(texto)
  const marcas: [number, number][] = []
  for (const w of palabras) {
    let i = base.indexOf(w)
    while (i !== -1) {
      marcas.push([i, i + w.length])
      i = base.indexOf(w, i + w.length)
    }
  }
  if (!marcas.length) return <>{texto}</>
  marcas.sort((a, b) => a[0] - b[0])
  const partes: { t: string; m: boolean }[] = []
  let cursor = 0
  for (const [ini, fin] of marcas) {
    if (ini < cursor) continue
    if (ini > cursor) partes.push({ t: texto.slice(cursor, ini), m: false })
    partes.push({ t: texto.slice(ini, fin), m: true })
    cursor = fin
  }
  if (cursor < texto.length) partes.push({ t: texto.slice(cursor), m: false })
  return (
    <>
      {partes.map((p, i) =>
        p.m ? (
          <mark key={i} className={activo ? 'rounded-[3px] bg-warning px-0.5 text-base' : 'rounded-[3px] bg-warning/25 px-0.5 text-fg'}>
            {p.t}
          </mark>
        ) : (
          <Fragment key={i}>{p.t}</Fragment>
        ),
      )}
    </>
  )
}
