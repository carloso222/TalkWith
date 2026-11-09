import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useDatosStore } from '../../store/datosStore'
import { aPerfil } from './convertidores'

/** Una escucha de `usuarios/{uid}` por cada persona con la que comparto un servidor. */
const activas = new Map<string, Unsubscribe>()

/**
 * Deja escuchando exactamente a `uids`: abre las que faltan y cancela (y quita de la caché)
 * las que sobran. `alLlegar` se llama la primera vez que cada perfil responde, exista o no.
 */
export function sincronizarPerfiles(uids: Set<string>, alLlegar: (uid: string) => void): void {
  for (const [uid, cancelar] of activas) {
    if (uids.has(uid)) continue
    cancelar()
    activas.delete(uid)
    useDatosStore.getState().quitarPerfil(uid)
    alLlegar(uid)
  }
  for (const uid of uids) {
    if (activas.has(uid)) continue
    activas.set(
      uid,
      onSnapshot(
        doc(db, 'usuarios', uid),
        (snap) => {
          if (snap.exists()) useDatosStore.getState().ponerPerfil(uid, aPerfil(snap))
          alLlegar(uid)
        },
        () => alLlegar(uid),
      ),
    )
  }
}

export function detenerPerfiles(): void {
  for (const cancelar of activas.values()) cancelar()
  activas.clear()
}
