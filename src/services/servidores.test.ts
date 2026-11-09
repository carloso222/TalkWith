import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('firebase/firestore', async () => (await import('../test/firestoreMock')).mockFirestore)
vi.mock('../lib/firebase', () => ({ db: { tipo: 'db' }, auth: { currentUser: { email: 'yo@test.com' } } }))
vi.mock('./authService', () => ({ cerrarSesion: vi.fn() }))
vi.mock('./firestore/escuchas', () => ({ esperarServidor: vi.fn(async () => {}), detenerEscuchas: vi.fn() }))

import { registro, reiniciar } from '../test/firestoreMock'
import { canal, iniciarComoYo, miembro, poblarServidor } from '../test/fixtures'
import { useDatosStore } from '../store/datosStore'
import { ApiError } from './errores'
import { esperarServidor } from './firestore/escuchas'
import { serverService } from './servidores'

const datos = { nombre: 'Club de Diseño UX', descripcion: 'Un club', privacidad: 'invitacion' as const }

describe('serverService', () => {
  beforeEach(() => {
    reiniciar()
    iniciarComoYo()
  })

  it('create hace un solo batch con servidor, miembro propietario, dos canales e invitación', async () => {
    const { servidor, invitacion } = await serverService.create(datos)
    expect(registro.escrituras).toEqual([])
    expect(registro.batches).toHaveLength(1)
    const [srv, mi, general, voz, inv] = registro.batches[0]
    const sid = srv.ruta.split('/')[1]

    expect(Object.keys(srv.datos!).sort()).toEqual(['color', 'creadoEn', 'descripcion', 'iniciales', 'nombre', 'privacidad', 'propietarioUid'])
    expect(srv.datos).toMatchObject({ nombre: 'Club de Diseño UX', iniciales: 'CD', propietarioUid: 'yo', creadoEn: 'MARCA_SERVIDOR' })

    expect(mi.ruta).toBe(`servidores/${sid}/miembros/yo`)
    expect(Object.keys(mi.datos!).sort()).toEqual(['correo', 'rol', 'servidorId', 'uid', 'unidoEn'])
    expect(mi.datos).toMatchObject({ rol: 'propietario', correo: 'yo@test.com', unidoEn: 'MARCA_SERVIDOR', servidorId: sid })

    expect(general.ruta).toBe(`servidores/${sid}/canales/${sid}-general`)
    expect(voz.ruta).toBe(`servidores/${sid}/canales/${sid}-voz`)
    for (const c of [general, voz]) {
      expect(Object.keys(c.datos!).every((k) => ['servidorId', 'nombre', 'tipo', 'descripcion', 'privado'].includes(k))).toBe(true)
      expect(c.datos).toMatchObject({ servidorId: sid })
    }
    expect(general.datos).toMatchObject({ nombre: 'general', tipo: 'texto' })
    expect(voz.datos).toMatchObject({ nombre: 'Sala de voz', tipo: 'voz' })

    expect(inv.ruta).toBe(`invitaciones/${invitacion.codigo}`)
    expect(invitacion.codigo).toMatch(/^[a-z0-9-]{12,64}$/)
    expect(Object.keys(inv.datos!).sort()).toEqual(['creadaEn', 'expiraEn', 'invitaUid', 'servidorColor', 'servidorId', 'servidorIniciales', 'servidorNombre'])
    expect(inv.datos).toMatchObject({ invitaUid: 'yo', servidorNombre: 'Club de Diseño UX', servidorIniciales: 'CD', servidorColor: srv.datos!.color })
    expect((inv.datos!.expiraEn as { toMillis: () => number }).toMillis()).toBeGreaterThan(Date.now() + 6 * 24 * 3_600_000)

    expect(esperarServidor).toHaveBeenCalledWith(sid)
    expect(servidor.servidorId).toBe(sid)
    expect(invitacion).toMatchObject({ servidorId: sid, expiraEn: '7 días' })
  })

  it('un nombre inválido da 400 y un nombre repetido da 409, sin escribir', async () => {
    await expect(serverService.create({ ...datos, nombre: 'ab' })).rejects.toMatchObject({ status: 400, campo: 'nombre' })
    poblarServidor('A', [['yo', 'miembro']], [], 'Club de Diseño UX')
    await expect(serverService.create({ ...datos, nombre: ' club de diseño ux ' })).rejects.toMatchObject({ status: 409 })
    expect(registro.batches).toEqual([])
  })

  it('traduce permission-denied del commit a ApiError 403', async () => {
    registro.falla = { code: 'permission-denied' }
    await expect(serverService.create(datos)).rejects.toBeInstanceOf(ApiError)
    expect(registro.batches).toEqual([])
  })

  it('las lecturas síncronas salen de la caché', async () => {
    poblarServidor('A', [['yo', 'propietario'], ['otra', 'miembro']], [canal('A', 'g', 'general'), canal('A', 'v', 'Sala', 'voz')], 'Alfa')
    poblarServidor('B', [['otra', 'propietario']], [], 'Beta')
    useDatosStore.getState().ponerMiembros('A', { yo: miembro('A', 'yo', 'propietario'), otra: miembro('A', 'otra', 'miembro') })

    expect(serverService.find('A')).toMatchObject({ nombre: 'Alfa', totalMiembros: 2 })
    expect(serverService.find('Z')).toBeUndefined()
    expect(serverService.list().map((s) => s.servidorId).sort()).toEqual(['A', 'B'])
    expect(serverService.defaultId()).toBe('A')
    expect(serverService.summary('A')).toMatchObject({ canales: 2, enLlamada: 0, actividad: 'Sin actividad todavía' })
    const mios = await serverService.getMine()
    expect(mios.map((s) => s.servidorId)).toEqual(['A'])
    expect(mios[0].totalMiembros).toBe(2)
  })

  it('sin servidores defaultId es vacío, y un servidor pendiente no se lista', async () => {
    expect(serverService.defaultId()).toBe('')
    poblarServidor('A', [['yo', 'propietario']])
    useDatosStore.getState().marcarPendiente('A')
    expect(serverService.find('A')).toBeUndefined()
    expect(await serverService.getMine()).toEqual([])
  })

  it('find cae a la vista previa de una invitación si no soy miembro', () => {
    useDatosStore.getState().ponerPrevia('P', {
      servidorId: 'P', nombre: 'Previa', descripcion: '', iniciales: 'PR', color: '#fff', propietarioUid: 'x', privacidad: 'invitacion', totalMiembros: 0,
    })
    expect(serverService.find('P')?.nombre).toBe('Previa')
    expect(serverService.defaultId()).toBe('')
  })
})
