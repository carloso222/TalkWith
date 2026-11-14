import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { collectionGroup, getDocs, limit, orderBy, query, where } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import { como, fs, prepararEntorno } from './entorno.ts'

const entorno = prepararEntorno()

// Misma forma de consulta que src/services/busqueda.ts (TW 11).
const buscar = (uid: string, grupo: 'mensajes' | 'segmentos', servidorId: string | null, termino: string) => {
  const filtros = [
    ...(servidorId ? [where('servidorId', '==', servidorId)] : []),
    where('terminos', 'array-contains', termino),
    orderBy('creadoEn', 'desc'),
    limit(30),
  ]
  return getDocs(query(collectionGroup(fs(como(entorno(), uid)), grupo), ...filtros))
}

describe('[TW 11] búsqueda de mensajes y transcripciones', () => {
  it('un miembro encuentra mensajes de su servidor por término', async () => {
    const r = await assertSucceeds(buscar('ana', 'mensajes', 'A', 'equipo'))
    expect(r.size).toBe(1)
  })

  it('un miembro puede buscar en los segmentos de su servidor', async () => {
    await assertSucceeds(buscar('luis', 'segmentos', 'A', 'hola'))
  })

  it('alguien de otro servidor o sin servidores no puede buscar en A', async () => {
    await assertFails(buscar('bruno', 'mensajes', 'A', 'equipo'))
    await assertFails(buscar('forastero', 'segmentos', 'A', 'hola'))
  })

  it('buscar sin filtrar por servidorId se rechaza (abarcaría servidores ajenos)', async () => {
    await assertFails(buscar('ana', 'mensajes', null, 'equipo'))
    await assertFails(buscar('ana', 'segmentos', null, 'hola'))
  })
})
