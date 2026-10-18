import { Search } from 'lucide-react'
import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useHotkey } from '../../hooks/useHotkey'
import { rutas } from '../../lib/routes'

/** Barra superior con migas y buscador global (Ctrl K). */
export default function TopBar({ seccion, detalle }: { seccion: string; detalle?: string }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const abrirBusqueda = useCallback(() => navigate(rutas.buscar()), [navigate])
  useHotkey('k', abrirBusqueda, { ctrl: true })

  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line px-6">
      <p className="flex items-baseline gap-2 truncate">
        <span className="text-subtitle font-semibold">{seccion}</span>
        {detalle && <span className="text-small text-muted">{detalle}</span>}
      </p>
      {pathname !== rutas.buscar() && (
        <button onClick={abrirBusqueda} className="flex h-9 w-[340px] max-w-[45%] items-center gap-2 rounded-[10px] border border-line bg-panel px-3 text-small text-muted hover:border-muted/50">
          <Search className="size-4 shrink-0" />
          <span className="flex-1 truncate text-left">Buscar mensajes y transcripciones</span>
          <kbd className="rounded-md bg-raised px-1.5 py-0.5 text-caption">Ctrl K</kbd>
        </button>
      )}
    </div>
  )
}
