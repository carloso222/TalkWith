
import { Link } from 'react-router'
import {
  Clock3,
  Captions,
  History,
  Search,
  CircleDot,
  Accessibility,
  MessageSquareText,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import { rutas } from '../../lib/routes'

const problemas = [
  {
    icon: Clock3,
    color: 'text-warning',
    fondo: 'bg-warning/10',
    titulo: 'No queda registro',
    descripcion:
      'Cuando termina la llamada, los acuerdos y las ideas desaparecen sin dejar rastro.',
  },
  {
    icon: Accessibility,
    color: 'text-voice',
    fondo: 'bg-voice/10',
    titulo: 'No es accesible',
    descripcion:
      'Las personas con dificultades auditivas no pueden seguir una conversación que solo sale de voz.',
  },
  {
    icon: History,
    color: 'text-primary',
    fondo: 'bg-primary/10',
    titulo: 'Llegar tarde es perderse todo',
    descripcion:
      'Si te desconectas o entras a mitad de la charla, no hay forma de ponerte al día.',
  },
]

const funciones = [
  {
    icon: Captions,
    color: 'text-voice',
    fondo: 'bg-voice/10',
    titulo: 'Subtítulos en vivo',
    descripcion:
      'Tu navegador reconoce la voz con la Web Speech API y muestra el texto sobre el avatar de quien habla.',
  },
  {
    icon: History,
    color: 'text-primary',
    fondo: 'bg-primary/10',
    titulo: 'Transcripción automática',
    descripcion:
      'Cada intervención se guarda con su autor y la hora, para revisar la sesión completa cuando quieras.',
  },
  {
    icon: Search,
    color: 'text-warning',
    fondo: 'bg-warning/10',
    titulo: 'Búsqueda global',
    descripcion:
      'Encuentra una frase dicha en una llamada igual que buscas un mensaje en un canal de texto.',
  },
  {
    icon: CircleDot,
    color: 'text-recording',
    fondo: 'bg-recording/10',
    titulo: 'Grabación con consentimiento',
    descripcion:
      'Solo inicia cuando todos aceptan y muestra el indicador «Grabando» durante toda la llamada.',
  },
]

const pasos = [
  {
    numero: '1',
    titulo: 'Entra con Google',
    descripcion: 'Sin contraseñas nuevas: tu cuenta de Google es tu acceso.',
  },
  {
    numero: '2',
    titulo: 'Crea o únete a un servidor',
    descripcion: 'Organiza a tu comunidad en canales de texto y de voz.',
  },
  {
    numero: '3',
    titulo: 'Habla con normalidad',
    descripcion: 'TalkWith subtitula, transcribe y guarda la conversación por ti.',
  },
]

export default function LandingSections() {
  return (
    <>
      {/* El problema */}
      <section className="px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-primary">
              El problema
            </p>
            <h2 className="text-title font-bold sm:text-2xl">
              En los canales de voz, lo que se habla se pierde
            </h2>
            <p className="mt-3 text-xs text-muted">
              A diferencia del chat, una llamada no deja nada por escrito.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {problemas.map((problema) => {
              const Icon = problema.icon

              return (
                <article
                  key={problema.titulo}
                  className="rounded-xl border border-line bg-panel p-5 transition hover:border-primary/50"
                >
                  <span
                    className={`mb-4 flex size-9 items-center justify-center rounded-lg ${problema.fondo} ${problema.color}`}
                  >
                    <Icon size={17} />
                  </span>
                  <h3 className="text-sm font-semibold">{problema.titulo}</h3>
                  <p className="mt-3 text-xs leading-5 text-muted">
                    {problema.descripcion}
                  </p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* Funciones */}
      <section id="funciones" className="scroll-mt-14 bg-panel px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-primary">
              Funciones
            </p>
            <h2 className="text-title font-bold sm:text-2xl">
              Todo lo que pasa en la llamada, a tu alcance
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {funciones.map((funcion) => {
              const Icon = funcion.icon

              return (
                <article
                  key={funcion.titulo}
                  className="rounded-xl border border-line bg-panel p-5"
                >
                  <span
                    className={`mb-3 flex size-9 items-center justify-center rounded-lg ${funcion.fondo} ${funcion.color}`}
                  >
                    <Icon size={17} />
                  </span>
                  <h3 className="text-sm font-semibold">{funcion.titulo}</h3>
                  <p className="mt-3 text-xs leading-5 text-muted">
                    {funcion.descripcion}
                  </p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* Accesibilidad */}
      <section id="accesibilidad" className="scroll-mt-14 px-5 py-12">
        <div className="mx-auto flex max-w-5xl items-start gap-4 rounded-xl border border-line bg-panel p-5 sm:p-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-voice/10 text-voice">
            <ShieldCheck size={20} />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Diseñado para conversar mejor</h2>
            <p className="mt-2 text-xs leading-5 text-muted">
              Subtítulos y transcripciones ayudan a consultar lo hablado y a
              seguir la conversación. Las grabaciones requieren consentimiento.
            </p>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="scroll-mt-14 px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-primary">
              Cómo funciona
            </p>
            <h2 className="text-title font-bold sm:text-2xl">
              Empieza en tres pasos
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {pasos.map((paso) => (
              <article key={paso.numero}>
                <span className="mb-3 flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold">
                  {paso.numero}
                </span>
                <h3 className="text-sm font-semibold">{paso.titulo}</h3>
                <p className="mt-3 text-xs leading-5 text-muted">
                  {paso.descripcion}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-primary/10 bg-primary/10 px-6 py-10 text-center sm:py-12">
            <h2 className="text-heading font-bold sm:text-2xl">
              Haz que cada conversación cuente
            </h2>
            <p className="mt-3 text-xs text-muted">
              Crea tu servidor en menos de un minuto e invita a tu equipo.
            </p>
            <Link to={rutas.registro} className="mt-5 inline-flex">
              <Button variant="google">
                Comenzar con Google
                <ArrowRight size={15} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section id="preguntas" className="scroll-mt-14 px-5 pb-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-5 text-center text-lg font-bold">
            Preguntas frecuentes
          </h2>
          <div className="divide-y divide-line rounded-xl border border-line">
            <details className="group p-4">
              <summary className="cursor-pointer text-sm font-medium">
                ¿Necesito instalar algo?
              </summary>
              <p className="mt-3 text-xs leading-5 text-muted">
                La experiencia se diseña para funcionar en el navegador. Algunas
                funciones pueden depender de las capacidades del navegador.
              </p>
            </details>
            <details className="group p-4">
              <summary className="cursor-pointer text-sm font-medium">
                ¿Las llamadas se graban automáticamente?
              </summary>
              <p className="mt-3 text-xs leading-5 text-muted">
                No. La grabación debe solicitar consentimiento antes de comenzar.
              </p>
            </details>
            <details className="group p-4">
              <summary className="cursor-pointer text-sm font-medium">
                ¿Puedo consultar una conversación anterior?
              </summary>
              <p className="mt-3 text-xs leading-5 text-muted">
                La propuesta de TalkWith incluye transcripciones e historial
                para volver a consultar lo hablado.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line px-5 py-5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-[10px] text-muted">
          <span className="flex items-center gap-2">
            <MessageSquareText size={14} />
            © 2026 TalkWith
          </span>
          <span>Proyecto integrador · Tecnologías de Desarrollo en el Cliente</span>
          <Link to={rutas.login} className="transition hover:text-fg">
            Iniciar sesión
          </Link>
        </div>
      </footer>
    </>
  )
}
