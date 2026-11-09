import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./authService', () => ({ cerrarSesion: vi.fn() }))
vi.mock('../lib/firebase', () => ({ db: {}, auth: {} }))

import { actividad } from '../mocks/data'
import { useDatosStore } from '../store/datosStore'
import { canal, iniciarComoYo, poblarServidor } from '../test/fixtures'
import { activityService, dashboardService, searchService } from './index'

describe('servicios de inicio y búsqueda (mocks filtrados por la caché)', () => {
  beforeEach(() => iniciarComoYo())

  it('con la caché vacía devuelven estados vacíos, sin rutas a servidores ajenos', async () => {
    expect(await activityService.getRecent()).toEqual([])
    expect(await searchService.search('micrófono permisos entrega')).toEqual([])
    expect(await dashboardService.getResumen()).toEqual({ llamada: null, sesionesNuevas: 0, servidorId: '' })
  })

  it('con estudio-diseno en la caché devuelven sus mocks', async () => {
    poblarServidor('estudio-diseno', [['yo', 'propietario']], [canal('estudio-diseno', 'general', 'general')])
    const esperada = actividad.filter((a) => a.ruta.startsWith('/app/s/estudio-diseno/'))
    expect(esperada.length).toBeGreaterThan(0)
    expect(await activityService.getRecent()).toEqual(esperada)
    const encontrados = await searchService.search('rúbrica portafolio casos estudio')
    expect(encontrados.length).toBeGreaterThan(0)
    expect(encontrados.every((r) => r.ruta.startsWith('/app/s/estudio-diseno/'))).toBe(true)
    expect((await dashboardService.getResumen()).servidorId).toBe('estudio-diseno')
  })

  it('un servidor que no es mío no aparece aunque esté en la caché', async () => {
    poblarServidor('estudio-diseno', [['otra', 'propietario']])
    expect(useDatosStore.getState().servidores['estudio-diseno']).toBeDefined()
    expect(await activityService.getRecent()).toEqual([])
  })
})
