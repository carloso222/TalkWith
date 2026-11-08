import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ConfirmHost from './components/feedback/ConfirmHost'
import ToastHost from './components/feedback/ToastHost'
import './index.css'
import { iniciarEscuchaSesion } from './lib/sesion'
import AppRouter from './routes/AppRouter'

// La sesión se restaura desde Firebase Auth antes de pintar rutas protegidas (estado 'cargando').
iniciarEscuchaSesion()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
    {/* Notificaciones y confirmaciones globales (fuera del router, se abren desde cualquier vista). */}
    <ToastHost />
    <ConfirmHost />
  </StrictMode>,
)
