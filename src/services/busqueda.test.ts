import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('firebase/firestore', async () => (await import('../test/firestoreMock')).mockFirestore)
vi.mock('../lib/firebase', () => ({ db: { tipo: 'db' }, auth: { currentUser: { email: 'yo@test.com' } } }))
vi.mock('./authService', () => ({ cerrarSesion: vi.fn() }))

import { registro, reiniciar } from '../test/firestoreMock'
import { canal, iniciarComoYo, poblarServidor } from '../test/fixtures'
import { searchService } from './busqueda'

const hace = (ms: number) => {
  const fecha = new Date(Date.now() - ms)
  return { toDate: () => fecha, toMillis: () => fecha.getTime() }
}
const HORA = 3_600_000

function mensaje(sid: string, canalId: string, id: string, contenido: string, terminos: string[], edadMs: number, autorUid = 'ana') {
  registro.docs.set(`servidores/${sid}/canales/${canalId}/mensajes/${id}`, { servidorId: sid, canalId, autorUid, contenido, terminos, creadoEn: hace(edadMs) })
}
function segmento(sid: string, sesionId: string, id: string, texto: string, terminos: string[], edadMs: number, hablanteUid = 'beto') {
  registro.docs.set(`servidores/${sid}/sesiones/${sesionId}/segmentos/${id}`, {
    servidorId: sid, sesionId, hablanteUid, texto, terminos, marcaTiempo: '16:20:01', creadoEn: hace(edadMs),
  })
}

describe('searchService (TW 11)', () => {
  beforeEach(() => {
    reiniciar()
    iniciarComoYo()
    poblarServidor('A', [['yo', 'miembro']], [canal('A', 'general', 'general'), canal('A', 'sala', 'Sala principal', 'voz')], 'Estudio')
  })

  it('sin palabras de más de 3 letras no consulta Firestore', async () => {
    expect(await searchService.search('  la de  ')).toEqual([])
    expect(registro.lecturas).toEqual([])
  })

  it('encuentra mensajes y transcripciones con todas las palabras, del más reciente al más antiguo', async () => {
    mensaje('A', 'general', 'm1', 'Revisemos los permisos del micrófono', ['revisemos', 'permisos', 'microfono'], 2 * HORA)
    mensaje('A', 'general', 'm2', 'Los permisos ya están', ['permisos', 'estan'], HORA)
    registro.docs.set('servidores/A/sesiones/s1', { servidorId: 'A', canalId: 'sala' })
    segmento('A', 's1', 'g1', 'El micrófono pide permisos al entrar', ['microfono', 'pide', 'permisos', 'entrar'], 30 * 60_000)

    const r = await searchService.search('Permisos del MICRÓFONO')

    expect(r.map((x) => x.resultadoId)).toEqual(['t-A-g1', 'm-A-m1'])
    expect(r[0]).toMatchObject({
      tipo: 'transcripcion', servidorNombre: 'Estudio', ubicacion: 'Sala principal', autorUid: 'beto', ruta: '/app/s/A/sesiones/s1',
    })
    expect(r[1]).toMatchObject({ tipo: 'mensaje', ubicacion: '#general', autorUid: 'ana', ruta: '/app/s/A/c/general' })
    expect(r[0].cuando).toMatch(/^Hoy, \d{2}:\d{2}$/)
    expect(r[0].fechaMs).toBeGreaterThan(r[1].fechaMs!)
  })

  it('solo consulta los servidores donde el usuario es miembro, siempre filtrando por servidorId', async () => {
    poblarServidor('B', [['otra', 'propietario']])
    mensaje('B', 'general', 'm9', 'permisos secretos', ['permisos', 'secretos'], HORA)

    expect(await searchService.search('permisos')).toEqual([])
    expect(registro.lecturas).toEqual(['grupo:mensajes', 'grupo:segmentos'])
  })

  it('sin índice desplegado (failed-precondition) da un 503 con mensaje claro', async () => {
    registro.falla = { code: 'failed-precondition' }
    await expect(searchService.search('permisos')).rejects.toMatchObject({ status: 503, message: expect.stringMatching(/preparando/) })
  })

  it('un permiso denegado se traduce a 403', async () => {
    registro.falla = { code: 'permission-denied' }
    await expect(searchService.search('permisos')).rejects.toMatchObject({ status: 403 })
  })
})
