import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'

// quita acentos y pasa a minusculas (igual que el frontend)
const normalizar = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// palabras de mas de 3 letras, sin repetir, para la busqueda (las reglas aceptan hasta 50)
export const terminos = (texto) => [...new Set(normalizar(texto).split(/\s+/).filter((w) => w.length > 3))].slice(0, 50)

// "00:24:18" a partir de milisegundos
export function duracionTexto(ms) {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

/** Conecta firebase admin y regresa las funciones que usa el servidor. */
export function iniciarFirebase(env) {
  const projectId = env.FIREBASE_PROJECT_ID
  const usaEmulador = Boolean(env.FIRESTORE_EMULATOR_HOST && env.FIREBASE_AUTH_EMULATOR_HOST)

  if (env.FIREBASE_SERVICE_ACCOUNT) {
    // en render la cuenta de servicio va como json en una variable de entorno
    initializeApp({ credential: cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)), projectId })
  } else if (usaEmulador || env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({ projectId })
  } else {
    throw new Error('Falta FIREBASE_SERVICE_ACCOUNT (o los emuladores). Revisa server/.env.example')
  }

  const auth = getAuth()
  const db = getFirestore()

  const esMiembro = async (uid, servidorId) => (await db.doc(`servidores/${servidorId}/miembros/${uid}`).get()).exists

  async function esCanalDe(uid, servidorId, canalId, tipo) {
    const [miembro, canal] = await Promise.all([esMiembro(uid, servidorId), db.doc(`servidores/${servidorId}/canales/${canalId}`).get()])
    return miembro && canal.exists && canal.get('tipo') === tipo
  }

  return {
    verificarToken: async (token) => (await auth.verifyIdToken(token)).uid,

    puedeVerServidor: esMiembro,

    puedeEntrarCanal: (uid, servidorId, canalId) => esCanalDe(uid, servidorId, canalId, 'voz'),

    puedeEscribirCanal: (uid, servidorId, canalId) => esCanalDe(uid, servidorId, canalId, 'texto'),

    // el servidor guarda los mensajes y les pone la hora, asi todos los ven en el mismo orden
    mensajes: {
      guardar: async ({ servidorId, canalId, autorUid, contenido }) => {
        const creadoEn = Timestamp.now()
        const ref = db.collection(`servidores/${servidorId}/canales/${canalId}/mensajes`).doc()
        await ref.set({ servidorId, canalId, autorUid, contenido, creadoEn, terminos: terminos(contenido) })
        return { mensajeId: ref.id, creadoMs: creadoEn.toMillis() }
      },
    },

    // el servidor guarda las sesiones de voz, asi quedan bien aunque alguien cierre la pestana
    sesiones: {
      crear: async (servidorId, canalId, uid) => {
        const ref = db.collection(`servidores/${servidorId}/sesiones`).doc()
        await ref.set({
          servidorId,
          canalId,
          iniciadaPor: uid,
          inicio: FieldValue.serverTimestamp(),
          participantes: [uid],
          totalSegmentos: 0,
          grabacion: 'sin-grabacion',
        })
        return ref.id
      },
      agregar: (servidorId, sesionId, uid) =>
        db.doc(`servidores/${servidorId}/sesiones/${sesionId}`).update({ participantes: FieldValue.arrayUnion(uid) }),
      cerrar: (servidorId, sesionId, inicio) =>
        db.doc(`servidores/${servidorId}/sesiones/${sesionId}`).update({
          fin: FieldValue.serverTimestamp(),
          duracion: duracionTexto(Date.now() - inicio),
        }),
    },
  }
}
