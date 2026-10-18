import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ConfirmHost from './components/feedback/ConfirmHost'
import ToastHost from './components/feedback/ToastHost'
import './index.css'
import AppRouter from './routes/AppRouter'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
    {/* Notificaciones y confirmaciones globales (fuera del router, se abren desde cualquier vista). */}
    <ToastHost />
    <ConfirmHost />
  </StrictMode>,
)
