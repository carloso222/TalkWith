import { useEffect } from 'react'

/** Cambia el título de la pestaña del navegador: "Canal de texto · TalkWith". */
export function useDocumentTitle(titulo: string) {
  useEffect(() => {
    document.title = titulo ? `${titulo} · TalkWith` : 'TalkWith'
  }, [titulo])
}
