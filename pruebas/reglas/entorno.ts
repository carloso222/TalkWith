import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, type RulesTestContext, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, setDoc, Timestamp, type Firestore } from 'firebase/firestore'
import { ref, uploadString, type FirebaseStorage } from 'firebase/storage'
import { afterAll, beforeAll, beforeEach } from 'vitest'

/**
 * Entorno compartido de las pruebas de reglas.
 * Datos de ejemplo: servidor A (dueno, admin, admin2, ana, luis) y servidor B (duenoB, bruno).
 * `forastero` y `nuevo` no son miembros de ningún servidor.
 */
export const PROYECTO = 'demo-talkwith'

export async function crearEntorno(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROYECTO,
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  })
}

/** Contexto autenticado con un correo (las reglas lo comparan al unirse). */
export const como = (env: RulesTestEnvironment, uid: string): RulesTestContext =>
  env.authenticatedContext(uid, { email: `${uid}@test.com` })

export const fs = (ctx: RulesTestContext): Firestore => ctx.firestore() as unknown as Firestore
export const st = (ctx: RulesTestContext): FirebaseStorage => ctx.storage() as unknown as FirebaseStorage

const ahora = () => Timestamp.now()
export const enUnaHora = (): Timestamp => Timestamp.fromMillis(Date.now() + 3_600_000)
export const haceUnaHora = (): Timestamp => Timestamp.fromMillis(Date.now() - 3_600_000)

const miembro = (servidorId: string, uid: string, rol: string) => ({
  uid,
  servidorId,
  rol,
  unidoEn: ahora(),
  correo: `${uid}@test.com`,
})

const servidor = (propietarioUid: string, nombre: string) => ({
  nombre,
  descripcion: '',
  iniciales: nombre.slice(0, 2).toUpperCase(),
  color: 'indigo',
  propietarioUid,
  privacidad: 'invitacion',
  creadoEn: ahora(),
})

const perfil = (nombre: string, extra: Record<string, unknown> = {}) => ({
  nombre,
  iniciales: nombre.slice(0, 2).toUpperCase(),
  color: 'indigo',
  estado: 'en-linea',
  creadoEn: ahora(),
  actualizadoEn: ahora(),
  ...extra,
})

const invitacion = (servidorId: string, expiraEn: Timestamp) => ({
  servidorId,
  invitaUid: 'dueno',
  creadaEn: ahora(),
  expiraEn,
  servidorNombre: 'Estudio A',
  servidorIniciales: 'ES',
  servidorColor: 'indigo',
})

/** Siembra los datos con las reglas desactivadas. */
export async function sembrar(env: RulesTestEnvironment): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = fs(ctx)
    const A = 'servidores/A'
    const sesion = `${A}/sesiones/s1`
    const docs: Array<[string, Record<string, unknown>]> = [
      ['servidores/A', servidor('dueno', 'Estudio A')],
      ['servidores/B', servidor('duenoB', 'Estudio B')],
      [`${A}/miembros/dueno`, miembro('A', 'dueno', 'propietario')],
      [`${A}/miembros/admin`, miembro('A', 'admin', 'admin')],
      [`${A}/miembros/admin2`, miembro('A', 'admin2', 'admin')],
      [`${A}/miembros/ana`, miembro('A', 'ana', 'miembro')],
      [`${A}/miembros/luis`, miembro('A', 'luis', 'miembro')],
      ['servidores/B/miembros/duenoB', miembro('B', 'duenoB', 'propietario')],
      ['servidores/B/miembros/bruno', miembro('B', 'bruno', 'miembro')],
      [`${A}/canales/general`, { servidorId: 'A', nombre: 'general', tipo: 'texto' }],
      ['servidores/B/canales/general', { servidorId: 'B', nombre: 'general', tipo: 'texto' }],
      [`${A}/canales/general/mensajes/m1`, { servidorId: 'A', canalId: 'general', autorUid: 'ana', contenido: 'hola equipo', creadoEn: ahora(), terminos: ['hola', 'equipo'] }],
      [sesion, { servidorId: 'A', canalId: 'voz', iniciadaPor: 'ana', inicio: ahora(), duracion: '10 min', participantes: ['ana'], totalSegmentos: 1, grabacion: 'grabada' }],
      [`${sesion}/segmentos/g1`, { servidorId: 'A', sesionId: 's1', hablanteUid: 'ana', texto: 'hola', marcaTiempo: '00:01', creadoEn: ahora(), terminos: [] }],
      [`${sesion}/consentimientos/ana`, { uid: 'ana', sesionId: 's1', estado: 'aceptado', actualizadoEn: ahora() }],
      [`${sesion}/consentimientos/luis`, { uid: 'luis', sesionId: 's1', estado: 'pendiente', actualizadoEn: ahora() }],
      [`${sesion}/grabaciones/r1`, {
        servidorId: 'A', sesionId: 's1', titulo: 'Sesión', canalNombre: 'voz', fecha: '2026-11-01', duracion: '10 min',
        creadorUid: 'ana', tamano: '2 MB', ruta: 'grabaciones/A/s1/r1.webm', estado: 'lista', aceptaron: 2, participantes: 2,
      }],
      ['invitaciones/invitacion-valida-001', invitacion('A', enUnaHora())],
      ['invitaciones/invitacion-vencida-01', invitacion('A', haceUnaHora())],
      ['nombresUsuario/ana.p', { uid: 'ana' }],
      ['usuarios/ana', perfil('Ana', { usuario: 'ana.p' })],
      ['usuarios/nuevo', perfil('Nuevo')],
    ]
    for (const [ruta, datos] of docs) await setDoc(doc(db, ruta), datos)

    const archivo = ref(st(ctx), 'grabaciones/A/s1/r1.webm')
    await uploadString(archivo, 'datos', 'raw', { contentType: 'audio/webm' })
  })
}

/** Registra los hooks de la suite: un entorno por archivo y datos nuevos antes de cada prueba. */
export function prepararEntorno(): () => RulesTestEnvironment {
  let env: RulesTestEnvironment
  beforeAll(async () => {
    env = await crearEntorno()
  })
  afterAll(async () => {
    await env.cleanup()
  })
  beforeEach(async () => {
    await env.clearFirestore()
    await env.clearStorage()
    await sembrar(env)
  })
  return () => env
}
