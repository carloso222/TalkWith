import { collection, collectionGroup, doc, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useDatosStore } from '../../store/datosStore'
import { useUiStore } from '../../store/uiStore'
import { aCanal, aMiembro, aServidor, ordenarCanales } from './convertidores'
import { detenerPerfiles, sincronizarPerfiles } from './escuchasPerfiles'

/**
 * Escuchas de Firestore que llenan `datosStore`: mis membresías y, por cada servidor,
 * su documento, sus miembros y sus canales; además el perfil de cada co-miembro.
 */
const PLAZO_CARGA_MS = 15_000

type Parte = 'servidor' | 'miembros' | 'canales'

let uidActual: string | null = null
let generacion = 0
let cancelarMembresias: Unsubscribe | null = null
let temporizador: ReturnType<typeof setTimeout> | null = null
let membresiasRecibidas = false
const porServidor = new Map<string, Unsubscribe[]>()
const primeras = new Map<string, Set<Parte>>()
const perfilesEsperando = new Set<string>()

const datos = () => useDatosStore.getState()

function fallar(): void {
  if (datos().estado === 'error') return
  datos().ponerEstado('error')
  useUiStore.getState().notify('error', 'No pudimos cargar tus servidores', 'Revisa tu conexión y recarga la página.')
}

function revisarListo(): void {
  if (datos().estado !== 'cargando') return
  if (!membresiasRecibidas || perfilesEsperando.size > 0 || Object.keys(datos().pendientes).length > 0) return
  if (temporizador) clearTimeout(temporizador)
  temporizador = null
  datos().ponerEstado('listo')
}

function alLlegarPerfil(uid: string): void {
  perfilesEsperando.delete(uid)
  revisarListo()
}

function sincronizarPersonas(): void {
  const uids = new Set(Object.values(datos().miembros).flatMap((m) => Object.keys(m)))
  if (datos().estado === 'cargando') for (const uid of uids) perfilesEsperando.add(uid)
  sincronizarPerfiles(uids, alLlegarPerfil)
}

function marcarPrimera(sid: string, parte: Parte): void {
  const vistas = primeras.get(sid)
  if (!vistas) return
  vistas.add(parte)
  if (vistas.size < 3) return
  primeras.delete(sid)
  datos().quitarPendiente(sid)
  revisarListo()
}

/** Sin permiso o sin documento: el servidor ya no es mío. Se quita en silencio y deja de esperarse. */
function descartarServidor(sid: string): void {
  porServidor.get(sid)?.forEach((cancelar) => cancelar())
  porServidor.set(sid, [])
  primeras.delete(sid)
  datos().quitarServidor(sid)
  sincronizarPersonas()
  revisarListo()
}

function abrirServidor(sid: string): void {
  datos().marcarPendiente(sid)
  primeras.set(sid, new Set())
  const alFallar = () => descartarServidor(sid)
  porServidor.set(sid, [
    onSnapshot(
      doc(db, 'servidores', sid),
      (snap) => {
        if (!snap.exists()) return alFallar()
        datos().ponerServidor(sid, aServidor(snap))
        marcarPrimera(sid, 'servidor')
      },
      alFallar,
    ),
    onSnapshot(
      collection(db, 'servidores', sid, 'miembros'),
      (snap) => {
        const miembros = Object.fromEntries(snap.docs.flatMap((d) => aMiembro(d, sid) ?? []).map((m) => [m.uid, m]))
        datos().ponerMiembros(sid, miembros)
        sincronizarPersonas()
        marcarPrimera(sid, 'miembros')
      },
      alFallar,
    ),
    onSnapshot(
      collection(db, 'servidores', sid, 'canales'),
      (snap) => {
        datos().ponerCanales(sid, ordenarCanales(snap.docs.map((d) => aCanal(d, sid))))
        marcarPrimera(sid, 'canales')
      },
      alFallar,
    ),
  ])
}

function cerrarServidor(sid: string): void {
  porServidor.get(sid)?.forEach((cancelar) => cancelar())
  porServidor.delete(sid)
  primeras.delete(sid)
  datos().quitarServidor(sid)
}

/** Abre los servidores nuevos (con la membresía ya confirmada) y cierra los que ya no tengo. */
function alCambiarMembresias(todos: Set<string>, confirmados: Set<string>): void {
  for (const sid of [...porServidor.keys()]) if (!todos.has(sid)) cerrarServidor(sid)
  for (const sid of confirmados) if (!porServidor.has(sid)) abrirServidor(sid)
  sincronizarPersonas()
  membresiasRecibidas = true
  revisarListo()
}

/** Empieza a escuchar los datos de `uid`. Es idempotente para el mismo uid. */
export function iniciarEscuchas(uid: string): void {
  if (uidActual === uid) return
  detenerEscuchas()
  uidActual = uid
  const miGeneracion = ++generacion
  datos().ponerEstado('cargando')
  temporizador = setTimeout(() => {
    if (miGeneracion === generacion && datos().estado === 'cargando') fallar()
  }, PLAZO_CARGA_MS)
  cancelarMembresias = onSnapshot(
    query(collectionGroup(db, 'miembros'), where('uid', '==', uid)),
    { includeMetadataChanges: true },
    (snap) => {
      const todos = new Set<string>()
      const confirmados = new Set<string>()
      for (const d of snap.docs) {
        const sid = d.data().servidorId
        if (typeof sid !== 'string') continue
        todos.add(sid)
        if (!d.metadata.hasPendingWrites) confirmados.add(sid)
      }
      alCambiarMembresias(todos, confirmados)
    },
    () => {
      if (miGeneracion === generacion) fallar()
    },
  )
}

/** Cancela todas las escuchas. Es seguro llamarla dos veces. */
export function detenerEscuchas(): void {
  generacion++
  uidActual = null
  cancelarMembresias?.()
  cancelarMembresias = null
  for (const cancelables of porServidor.values()) cancelables.forEach((cancelar) => cancelar())
  porServidor.clear()
  primeras.clear()
  perfilesEsperando.clear()
  detenerPerfiles()
  if (temporizador) clearTimeout(temporizador)
  temporizador = null
  membresiasRecibidas = false
}

/** Resuelve cuando el servidor ya está completo en la caché (o al vencer el plazo, sin lanzar). */
export function esperarServidor(sid: string, ms = 10_000): Promise<void> {
  const listo = () => Boolean(datos().servidores[sid]) && !datos().pendientes[sid]
  return new Promise((resolve) => {
    if (listo()) return resolve()
    let cancelar: () => void = () => {}
    const plazo = setTimeout(() => {
      cancelar()
      resolve()
    }, ms)
    cancelar = useDatosStore.subscribe(() => {
      if (!listo()) return
      clearTimeout(plazo)
      cancelar()
      resolve()
    })
  })
}
