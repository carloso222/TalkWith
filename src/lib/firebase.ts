import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectStorageEmulator, getStorage } from 'firebase/storage'
import { leerConfigFirebase } from './firebaseConfig'

/**
 * Único punto de entrada a Firebase. Solo lo importan `src/services/` y `lib/sesion.ts`;
 * las pantallas nunca lo usan directamente.
 *
 * Firestore usa la caché en memoria (sin persistencia en disco), así no queda nada
 * guardado al cerrar sesión en un equipo compartido.
 */
const { opciones, usarEmuladores } = leerConfigFirebase(import.meta.env)

export const app = initializeApp(opciones)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

if (usarEmuladores) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
}

/** Token de Firebase para el handshake de Socket.io (`auth: { token }`). */
export async function obtenerTokenSocket(): Promise<string> {
  await auth.authStateReady()
  if (!auth.currentUser) throw new Error('Sin sesión')
  return auth.currentUser.getIdToken()
}

/**
 * Pide a Firebase un token nuevo. Si la sesión ya no es válida (cuenta deshabilitada,
 * sesión revocada) Firebase rechaza la promesa y además cierra la sesión por su cuenta.
 */
export async function renovarToken(): Promise<void> {
  await auth.authStateReady()
  if (!auth.currentUser) throw new Error('Sin sesión')
  await auth.currentUser.getIdToken(true)
}
