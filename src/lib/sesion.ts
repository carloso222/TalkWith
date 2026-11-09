import type { Unsubscribe } from 'firebase/auth'
import { cerrarSesion, escucharSesion } from '../services/authService'
import { detenerEscuchas, iniciarEscuchas } from '../services/firestore/escuchas'
import { asegurarPerfil } from '../services/perfilService'
import { useAuthStore } from '../store/authStore'
import { useDatosStore } from '../store/datosStore'
import { useLlamadasStore } from '../store/llamadasStore'
import { useUiStore } from '../store/uiStore'
import { useVoiceStore } from '../store/voiceStore'
import { desconectarSocket } from './socket'

/** Clave que usaba la sesión simulada; se borra por si quedó de una versión anterior. */
const CLAVE_SESION_ANTIGUA = 'talkwith-auth'

/** Deja la app sin rastro de la sesión anterior: detiene las escuchas de Firestore y vacía la caché. */
export function limpiarEstadoLocal(): void {
  detenerEscuchas()
  desconectarSocket()
  useLlamadasStore.getState().limpiar()
  useDatosStore.getState().limpiar()
  useAuthStore.getState().limpiar()
  useVoiceStore.setState(useVoiceStore.getInitialState(), true)
  sessionStorage.removeItem(CLAVE_SESION_ANTIGUA)
}

/** Une Firebase Auth con los stores. Se llama una sola vez desde `main.tsx`. */
export function iniciarEscuchaSesion(): Unsubscribe {
  let version = 0
  return escucharSesion(async (user) => {
    const miVersion = ++version
    if (!user) {
      limpiarEstadoLocal()
      return
    }
    try {
      const { usuario, perfilCompleto } = await asegurarPerfil(user)
      if (miVersion !== version) return
      iniciarEscuchas(usuario.uid)
      useAuthStore.getState().setSesion(usuario, perfilCompleto)
    } catch (error) {
      if (miVersion !== version) return
      console.error(error)
      useUiStore.getState().notify('error', 'No pudimos cargar tu perfil', 'Cerramos tu sesión. Intenta entrar de nuevo.')
      await cerrarSesion()
    }
  })
}
