import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('firebase/firestore', async () => (await import('../../test/firestoreMock')).mockFirestore)
vi.mock('../../lib/firebase', () => ({ db: { tipo: 'db' } }))

import { useDatosStore } from '../../store/datosStore'
import { registro, reiniciar } from '../../test/firestoreMock'
import { detenerEscuchas, iniciarEscuchas } from './escuchas'

const estado = () => useDatosStore.getState()
const servidor = { nombre: 'Alfa', descripcion: '', iniciales: 'AL', color: '#6366f1', propietarioUid: 'a', privacidad: 'invitacion' as const }

describe('cambio de cuenta sin un null intermedio (B1)', () => {
  beforeEach(() => {
    reiniciar()
    estado().limpiar()
  })
  afterEach(() => detenerEscuchas())

  it('iniciarEscuchas con otro uid vacía la caché de la cuenta anterior', () => {
    iniciarEscuchas('a')
    estado().ponerServidor('SA', { servidorId: 'SA', ...servidor })
    estado().ponerPerfil('a', { uid: 'a', usuario: 'a', nombre: 'A', iniciales: 'AA', color: 'indigo', estado: 'en-linea' })
    estado().marcarPendiente('SA')
    expect(Object.keys(estado().servidores)).toEqual(['SA'])

    iniciarEscuchas('b')

    expect(estado().servidores).toEqual({})
    expect(estado().perfiles).toEqual({})
    expect(estado().miembros).toEqual({})
    expect(estado().canales).toEqual({})
    expect(estado().pendientes).toEqual({})
    expect(estado().estado).toBe('cargando')
    expect(registro.escuchas[0].cancelada).toBe(true)
  })

  it('con el mismo uid no toca la caché', () => {
    iniciarEscuchas('a')
    estado().ponerServidor('SA', { servidorId: 'SA', ...servidor })
    iniciarEscuchas('a')
    expect(Object.keys(estado().servidores)).toEqual(['SA'])
  })
})
