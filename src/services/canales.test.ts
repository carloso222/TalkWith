import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('firebase/firestore', async () => (await import('../test/firestoreMock')).mockFirestore)
vi.mock('../lib/firebase', () => ({ db: { tipo: 'db' }, auth: { currentUser: { email: 'yo@test.com' } } }))
vi.mock('./authService', () => ({ cerrarSesion: vi.fn() }))

import { registro, reiniciar } from '../test/firestoreMock'
import { canal, iniciarComoYo, poblarServidor } from '../test/fixtures'
import { channelService } from './canales'

const datos = { nombre: 'recursos', tipo: 'texto' as const, descripcion: '', privado: false }

describe('channelService', () => {
  beforeEach(() => {
    reiniciar()
    iniciarComoYo()
    poblarServidor('A', [['yo', 'propietario']], [canal('A', 'general', 'general'), canal('A', 'sala', 'Sala', 'voz')])
  })

  it('create escribe en servidores/{sid}/canales/{cid} sin claves undefined', async () => {
    const nuevo = await channelService.create('A', datos)
    expect(registro.escrituras).toHaveLength(1)
    const [e] = registro.escrituras
    expect(e.op).toBe('set')
    expect(e.ruta).toBe(`servidores/A/canales/${nuevo.canalId}`)
    expect(nuevo.canalId).toMatch(/^recursos-[a-z0-9]{6}$/)
    expect(e.datos).toEqual({ servidorId: 'A', nombre: 'recursos', tipo: 'texto', privado: false })
    expect(Object.values(e.datos!).includes(undefined)).toBe(false)
    expect(nuevo).toMatchObject({ canalId: nuevo.canalId, servidorId: 'A', nombre: 'recursos' })
  })

  it('create con descripción la incluye recortada', async () => {
    await channelService.create('A', { ...datos, descripcion: '  Lecturas  ' })
    expect(registro.escrituras[0].datos).toMatchObject({ descripcion: 'Lecturas' })
  })

  it('update escribe el documento completo en el mismo id', async () => {
    const editado = await channelService.update('general', { ...datos, nombre: 'avisos' })
    expect(registro.escrituras).toEqual([
      { op: 'set', ruta: 'servidores/A/canales/general', datos: { servidorId: 'A', nombre: 'avisos', tipo: 'texto', privado: false } },
    ])
    expect(editado.canalId).toBe('general')
  })

  it('409 por nombre repetido (create y update) sin escribir; renombrarse a sí mismo sí se puede', async () => {
    await expect(channelService.create('A', { ...datos, tipo: 'voz', nombre: 'SALA' })).rejects.toMatchObject({ status: 409 })
    await expect(channelService.update('sala', { ...datos, tipo: 'voz', nombre: 'general' })).rejects.toMatchObject({ status: 409 })
    expect(registro.escrituras).toEqual([])
    await channelService.update('general', { ...datos, nombre: 'general', descripcion: 'x' })
    expect(registro.escrituras).toHaveLength(1)
  })

  it('404 al editar o borrar un canal inexistente', async () => {
    await expect(channelService.update('nada', datos)).rejects.toMatchObject({ status: 404 })
    await expect(channelService.remove('nada')).rejects.toMatchObject({ status: 404 })
    await expect(channelService.getById('nada')).rejects.toMatchObject({ status: 404 })
    expect(registro.escrituras).toEqual([])
  })

  it('remove borra el documento del canal', async () => {
    await channelService.remove('sala')
    expect(registro.escrituras).toEqual([{ op: 'delete', ruta: 'servidores/A/canales/sala' }])
  })

  it('con rol miembro en caché da 403 sin escribir', async () => {
    poblarServidor('B', [['yo', 'miembro']], [canal('B', 'b1', 'general')])
    await expect(channelService.create('B', datos)).rejects.toMatchObject({ status: 403 })
    await expect(channelService.update('b1', datos)).rejects.toMatchObject({ status: 403 })
    await expect(channelService.remove('b1')).rejects.toMatchObject({ status: 403 })
    expect(registro.escrituras).toEqual([])
  })

  it('un admin sí puede gestionar canales', async () => {
    poblarServidor('C', [['yo', 'admin']])
    await channelService.create('C', datos)
    expect(registro.escrituras).toHaveLength(1)
  })

  it('las lecturas salen de la caché', async () => {
    expect(channelService.listByServer('A').map((c) => c.canalId)).toEqual(['general', 'sala'])
    expect(channelService.find('sala')?.nombre).toBe('Sala')
    expect(channelService.find('zzz')).toBeUndefined()
    expect(channelService.listByServer('Z')).toEqual([])
    expect((await channelService.getByServer('A'))).toHaveLength(2)
  })
})
