import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { CURRENT_UID, usuarios } from '../mocks/data'
import type { Rol, Usuario } from '../types'

/**
 * Sesión simulada. En esta entrega no hay Firebase Auth: "Continuar con Google"
 * solo llena este store con un usuario de ejemplo.
 *
 * `rolDemo` sobrescribe el rol real para poder demostrar las guardias en la
 * presentación (p. ej. que un "miembro" no puede abrir la configuración).
 */
interface AuthState {
  usuario: Usuario | null
  rolDemo: Rol | null
  perfilCompleto: boolean
  login: () => void
  logout: () => void
  completarPerfil: () => void
  setRolDemo: (rol: Rol | null) => void
  /** Actualiza el usuario en memoria (no se guarda en ningún servidor). */
  actualizarPerfil: (cambios: Partial<Pick<Usuario, 'nombre' | 'usuario' | 'estadoTexto'>>) => void
}

const usuarioDemo = usuarios.find((u) => u.uid === CURRENT_UID)!

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      rolDemo: null,
      perfilCompleto: true,
      login: () => set({ usuario: usuarioDemo }),
      logout: () => set({ usuario: null, rolDemo: null }),
      completarPerfil: () => set({ usuario: usuarioDemo, perfilCompleto: true }),
      setRolDemo: (rolDemo) => set({ rolDemo }),
      actualizarPerfil: (cambios) => set((s) => (s.usuario ? { usuario: { ...s.usuario, ...cambios } } : s)),
    }),
    {
      name: 'talkwith-auth',
      // sessionStorage: la sesión de demo sobrevive a un recargo pero no se queda guardada.
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
