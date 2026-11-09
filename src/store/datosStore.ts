import { create } from 'zustand'
import type { Canal, Miembro, Servidor, Usuario } from '../types'

/**
 * Caché compartida de los datos de Firestore. La llenan las escuchas de
 * `services/firestore/escuchas.ts` y la leen los servicios de forma síncrona.
 * No se persiste en ningún almacenamiento: al cerrar sesión se vacía con `limpiar()`.
 *
 * Cada mutación incrementa `version`; los hooks se suscriben a ese número para volver a pintar.
 */
export type EstadoDatos = 'inactivo' | 'cargando' | 'listo' | 'error'

/** Servidor tal como está en Firestore (el total de miembros se calcula al leer). */
export type DocServidor = Omit<Servidor, 'totalMiembros'>
/** Perfil público de `usuarios/{uid}` (el correo viene de la membresía). */
export type PerfilDoc = Omit<Usuario, 'correo'>

interface DatosState {
  estado: EstadoDatos
  version: number
  servidores: Record<string, DocServidor>
  miembros: Record<string, Record<string, Miembro>>
  canales: Record<string, Canal[]>
  perfiles: Record<string, PerfilDoc>
  /** Vista previa de invitaciones a servidores de los que aún no soy miembro. */
  previas: Record<string, Servidor>
  /** Servidores cuyas escuchas aún no entregan su primera instantánea. */
  pendientes: Record<string, true>
  ponerEstado: (estado: EstadoDatos) => void
  ponerServidor: (sid: string, servidor: DocServidor) => void
  ponerMiembros: (sid: string, miembros: Record<string, Miembro>) => void
  ponerCanales: (sid: string, canales: Canal[]) => void
  ponerPerfil: (uid: string, perfil: PerfilDoc) => void
  quitarPerfil: (uid: string) => void
  ponerPrevia: (sid: string, servidor: Servidor) => void
  marcarPendiente: (sid: string) => void
  quitarPendiente: (sid: string) => void
  /** Borra todo lo que se sabe de un servidor (me retiraron, salí o ya no existe). */
  quitarServidor: (sid: string) => void
  limpiar: () => void
}

const sin = <T,>(mapa: Record<string, T>, clave: string): Record<string, T> => {
  const copia = { ...mapa }
  delete copia[clave]
  return copia
}

const inicial = {
  estado: 'inactivo' as EstadoDatos,
  version: 0,
  servidores: {},
  miembros: {},
  canales: {},
  perfiles: {},
  previas: {},
  pendientes: {},
}

export const useDatosStore = create<DatosState>()((set, get) => {
  const cambiar = (parcial: (s: DatosState) => Partial<DatosState>) =>
    set((s) => ({ ...parcial(s), version: s.version + 1 }))
  return {
    ...inicial,
    ponerEstado: (estado) => cambiar(() => ({ estado })),
    ponerServidor: (sid, servidor) => cambiar((s) => ({ servidores: { ...s.servidores, [sid]: servidor } })),
    ponerMiembros: (sid, miembros) => cambiar((s) => ({ miembros: { ...s.miembros, [sid]: miembros } })),
    ponerCanales: (sid, canales) => cambiar((s) => ({ canales: { ...s.canales, [sid]: canales } })),
    ponerPerfil: (uid, perfil) => cambiar((s) => ({ perfiles: { ...s.perfiles, [uid]: perfil } })),
    quitarPerfil: (uid) => cambiar((s) => ({ perfiles: sin(s.perfiles, uid) })),
    // Idempotente: validar una invitación vuelve a poner la misma previa, y si eso subiera `version`,
    // useService volvería a validar sin fin (Unirse se quedaba cargando y leyendo Firestore en bucle).
    ponerPrevia: (sid, servidor) => {
      const actual = get().previas[sid]
      if (actual && JSON.stringify(actual) === JSON.stringify(servidor)) return
      cambiar((s) => ({ previas: { ...s.previas, [sid]: servidor } }))
    },
    marcarPendiente: (sid) => cambiar((s) => ({ pendientes: { ...s.pendientes, [sid]: true } })),
    quitarPendiente: (sid) => cambiar((s) => ({ pendientes: sin(s.pendientes, sid) })),
    quitarServidor: (sid) =>
      cambiar((s) => ({
        servidores: sin(s.servidores, sid),
        miembros: sin(s.miembros, sid),
        canales: sin(s.canales, sid),
        pendientes: sin(s.pendientes, sid),
      })),
    limpiar: () => set((s) => ({ ...inicial, version: s.version + 1 })),
  }
})
