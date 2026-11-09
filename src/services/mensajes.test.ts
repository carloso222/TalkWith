import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('firebase/firestore', async () => (await import('../test/firestoreMock')).mockFirestore)
vi.mock('../lib/firebase', () => ({ db: { tipo: 'db' } }))

import { registro, reiniciar } from '../test/firestoreMock'
import { desdeSocket, messageService, ordenarMensajes } from './mensajes'

const marca = (ms: number) => ({ toMillis: () => ms })

describe('messageService (TW 09)', () => {
  beforeEach(() => reiniciar())

  it('lee el historial del canal y lo deja del mas viejo al mas nuevo', async () => {
    // firestore los regresa del mas nuevo al mas viejo (orderBy desc)
    registro.docs.set('servidores/A/canales/general/mensajes/m2', { autorUid: 'beto', contenido: 'segundo', creadoEn: marca(2000) })
    registro.docs.set('servidores/A/canales/general/mensajes/m1', { autorUid: 'ana', contenido: 'primero', creadoEn: marca(1000) })
    const mensajes = await messageService.getByChannel('A', 'general')
    expect(registro.lecturas).toEqual(['servidores/A/canales/general/mensajes'])
    expect(mensajes.map((m) => m.contenido)).toEqual(['primero', 'segundo'])
    expect(mensajes[0]).toMatchObject({ mensajeId: 'm1', canalId: 'general', autorUid: 'ana', creadoMs: 1000 })
    expect(mensajes[0].creadoEn).toMatch(/^\d{2}:\d{2}$/)
  })

  it('sin permiso lanza un 403', async () => {
    registro.falla = { code: 'permission-denied' }
    await expect(messageService.getByChannel('A', 'general')).rejects.toMatchObject({ status: 403 })
  })

  it('si dos mensajes tienen la misma hora los ordena por id', () => {
    const base = { canalId: 'c', autorUid: 'a', contenido: '', creadoEn: '' }
    const lista = ordenarMensajes([
      { ...base, mensajeId: 'b', creadoMs: 5 },
      { ...base, mensajeId: 'a', creadoMs: 5 },
      { ...base, mensajeId: 'z', creadoMs: 1 },
    ])
    expect(lista.map((m) => m.mensajeId)).toEqual(['z', 'a', 'b'])
  })

  it('convierte el mensaje que manda el servidor', () => {
    const m = desdeSocket({ mensajeId: 'm1', servidorId: 'A', canalId: 'general', autorUid: 'ana', contenido: 'hola', creadoMs: new Date(2026, 0, 1, 9, 5).getTime() })
    expect(m).toMatchObject({ mensajeId: 'm1', canalId: 'general', autorUid: 'ana', contenido: 'hola', creadoEn: '09:05' })
  })
})
