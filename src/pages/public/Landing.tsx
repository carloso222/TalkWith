import Placeholder from '../../components/feedback/Placeholder'
import { rutas } from '../../lib/routes'

/** Figma 01 · Landing. Responsable: Diego. */
export default function Landing() {
  return (
    <div className="min-h-full">
      <Placeholder
        num="01"
        titulo="Lo que se dice en voz, ya no se pierde."
        responsable="Diego"
        descripcion="Navegación, hero con vista previa de la llamada, el problema, funciones, cómo funciona, llamado a la acción y pie de página."
        enlaces={[{ to: rutas.login, label: 'Iniciar sesión' }, { to: rutas.registro, label: 'Crear cuenta' }]}
      />
    </div>
  )
}
