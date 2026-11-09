import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('firebase/firestore', async () => (await import('../test/firestoreMock')).mockFirestore)
vi.mock('../lib/firebase', () => ({ db: { tipo: 'db' }, auth: { currentUser: { email: 'yo@test.com' } } }))
vi.mock('./authService', () => ({ cerrarSesion: vi.fn() }))

import { registro, reiniciar } from '../test/firestoreMock'
import { iniciarComoYo } from '../test/fixtures'
import { sessionService } from './sesiones'

const marca = (fecha: Date) => ({ toDate: () => fecha })

describe('sessionService (TW 17)', () => {
  beforeEach(() => {
    reiniciar()
    iniciarComoYo()
  })

  it('getByServer lee las sesiones del servidor y las convierte', async () => {
    registro.docs.set('servidores/A/sesiones/s1', {
      servidorId: 'A',
      canalId: 'voz',
      inicio: marca(new Date()),
      duracion: '00:12:30',
      participantes: ['yo', 'ana'],
      totalSegmentos: 3,
      grabacion: 'sin-grabacion',
    })
    // sin duracion = la sala sigue abierta
    registro.docs.set('servidores/A/sesiones/s2', { servidorId: 'A', canalId: 'voz', inicio: marca(new Date()), participantes: ['yo'], totalSegmentos: 0, grabacion: 'rara' })
    registro.docs.set('servidores/A/sesiones/s1/segmentos/g1', { texto: 'no es una sesion' })

    const sesiones = await sessionService.getByServer('A')
    expect(registro.lecturas).toEqual(['servidores/A/sesiones'])
    expect(sesiones).toHaveLength(2)
    expect(sesiones[0]).toMatchObject({ sesionId: 's1', canalId: 'voz', duracion: '00:12:30', participantes: ['yo', 'ana'], totalSegmentos: 3 })
    expect(sesiones[0].inicio).toMatch(/^Hoy, \d{2}:\d{2}$/)
    expect(sesiones[1]).toMatchObject({ duracion: 'En curso', grabacion: 'sin-grabacion' })
  })

  it('getById regresa null si no existe', async () => {
    expect(await sessionService.getById('A', 'nada')).toBeNull()
    expect(await sessionService.getById('', 's1')).toBeNull()
  })

  it('getSegments regresa los segmentos con autor y hora', async () => {
    registro.docs.set('servidores/A/sesiones/s1/segmentos/g1', { sesionId: 's1', hablanteUid: 'ana', texto: 'Hola', marcaTiempo: '16:20:01' })
    registro.docs.set('servidores/A/sesiones/s1/segmentos/g2', { sesionId: 's1', hablanteUid: 'yo', texto: 'Qué tal', marcaTiempo: '16:20:05' })
    const segmentos = await sessionService.getSegments('A', 's1')
    expect(segmentos).toEqual([
      { segmentoId: 'g1', sesionId: 's1', hablanteUid: 'ana', texto: 'Hola', marcaTiempo: '16:20:01' },
      { segmentoId: 'g2', sesionId: 's1', hablanteUid: 'yo', texto: 'Qué tal', marcaTiempo: '16:20:05' },
    ])
  })

  it('addSegment guarda el segmento y suma uno al total en el mismo batch', async () => {
    const id = await sessionService.addSegment('A', 's1', '  Revisemos los permisos del micrófono  ')
    expect(registro.batches).toHaveLength(1)
    const [segmento, sesion] = registro.batches[0]
    expect(segmento).toMatchObject({ op: 'set', ruta: `servidores/A/sesiones/s1/segmentos/${id}` })
    expect(segmento.datos).toMatchObject({
      servidorId: 'A',
      sesionId: 's1',
      hablanteUid: 'yo',
      texto: 'Revisemos los permisos del micrófono',
      creadoEn: 'MARCA_SERVIDOR',
      terminos: ['revisemos', 'permisos', 'microfono'],
    })
    expect(segmento.datos?.marcaTiempo).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    expect(sesion).toEqual({ op: 'update', ruta: 'servidores/A/sesiones/s1', datos: { totalSegmentos: { incremento: 1 } } })
  })

  it('addSegment no guarda texto vacío', async () => {
    await expect(sessionService.addSegment('A', 's1', '   ')).rejects.toMatchObject({ status: 400 })
    expect(registro.batches).toHaveLength(0)
  })

  it('addSegment sin permiso lanza un 403', async () => {
    registro.falla = { code: 'permission-denied' }
    await expect(sessionService.addSegment('A', 's1', 'hola')).rejects.toMatchObject({ status: 403 })
  })

  it('listenSegments escucha la subcolección y avisa con la lista', () => {
    const recibidos: unknown[] = []
    const dejar = sessionService.listenSegments('A', 's1', (s) => recibidos.push(s))
    const [escucha] = registro.escuchas
    expect(escucha.ruta).toBe('servidores/A/sesiones/s1/segmentos')
    escucha.siguiente({ docs: [{ id: 'g1', data: () => ({ sesionId: 's1', hablanteUid: 'ana', texto: 'Hola', marcaTiempo: '10:00:00' }) }] })
    expect(recibidos).toEqual([[{ segmentoId: 'g1', sesionId: 's1', hablanteUid: 'ana', texto: 'Hola', marcaTiempo: '10:00:00' }]])
    dejar()
    expect(escucha.cancelada).toBe(true)
  })
})
