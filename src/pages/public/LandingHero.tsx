
import { Link } from 'react-router'
import { AudioLines, Mic, MicOff, Radio, Search, Subtitles } from 'lucide-react'
import Button from '../../components/ui/Button'
import { rutas } from '../../lib/routes'

const participantes = [
  {
    iniciales: 'SR',
    nombre: 'Sofía Ramírez',
    color: 'bg-pink-300 text-slate-900',
    mensaje: '…entonces el flujo de permisos debería explicar por qué pedimos el micrófono.',
    estado: 'Hablando',
    hablando: true,
  },
  {
    iniciales: 'MH',
    nombre: 'Mateo Herrera',
    color: 'bg-orange-300 text-slate-900',
    mensaje: 'De acuerdo, y que diga qué pasa si alguien lo rechaza.',
    estado: 'Escuchando',
    hablando: false,
  },
  {
    iniciales: 'DT',
    nombre: 'Diego Torres',
    color: 'bg-amber-300 text-slate-900',
    mensaje: '',
    estado: 'Silenciado',
    hablando: false,
  },
]

const transcripciones = [
  {
    iniciales: 'SR',
    color: 'bg-pink-300 text-slate-900',
    nombre: 'Sofía Ramírez',
    hora: '16:21:48',
    mensaje: 'Creo que deberíamos explicar por qué pedimos el micrófono.',
  },
  {
    iniciales: 'DT',
    color: 'bg-amber-300 text-slate-900',
    nombre: 'Diego Torres',
    hora: '16:21:40',
    mensaje: 'El diálogo del navegador aparece muy pronto.',
  },
  {
    iniciales: 'SR',
    color: 'bg-pink-300 text-slate-900',
    nombre: 'Sofía Ramírez',
    hora: '16:22:48',
    mensaje: 'Eso puede confundir a los usuarios.',
  },
]

export default function LandingHero() {
  return (
    <section
      id="inicio"
      className="relative overflow-hidden px-5 pb-20 pt-14 sm:pt-16"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.16),transparent_60%)]" />

      <div className="relative mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-voice/20 bg-voice/10 px-3 py-1.5 text-xs text-voice">
            <AudioLines size={14} />
            Subtítulos en vivo · Transcripción · Búsqueda
          </div>

          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-display">
            Lo que se dice en voz,
            <br />
            ya no se pierde.
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted">
            TalkWith es una plataforma de comunidades con canales de texto y
            voz que agrega subtítulos en vivo, transcripciones que puedes
            buscar y grabación con consentimiento, todo procesado en tu
            navegador.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to={rutas.registro}>
              <Button variant="google">
                Comenzar con Google
              </Button>
            </Link>
            <a href="#como-funciona">
              <Button variant="secundario">
                Ver cómo funciona
              </Button>
            </a>
          </div>

          <p className="mt-4 text-[10px] text-muted">
            Gratis para comunidades pequeñas · Funciona mejor en Google Chrome
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-5xl gap-3 rounded-2xl border border-line bg-panel p-3 shadow-low md:grid-cols-[1fr_1fr_1fr_1.35fr]">
          {participantes.map((persona) => (
            <article
              key={persona.iniciales}
              className={`flex min-h-48 flex-col rounded-xl border p-3 ${
                persona.hablando
                  ? 'border-voice bg-raised'
                  : 'border-transparent bg-raised'
              }`}
            >
              <div className="flex justify-center">
                <span
                  className={`flex size-11 items-center justify-center rounded-full text-sm font-bold ${persona.color}`}
                >
                  {persona.iniciales}
                </span>
              </div>

              <p className="mt-3 flex-1 text-xs leading-5 text-fg">
                {persona.mensaje || 'Participando en la conversación.'}
              </p>

              <div className="mt-3 flex items-center justify-center gap-1 border-t border-line pt-2 text-[10px] text-muted">
                {persona.hablando ? (
                  <Mic size={11} />
                ) : (
                  <MicOff size={11} />
                )}
                <span>{persona.nombre}</span>
                <span className={persona.hablando ? 'text-voice' : ''}>
                  {persona.estado}
                </span>
              </div>
            </article>
          ))}

          <article className="rounded-xl border border-line bg-base p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold">Transcripción en vivo</h2>
              <span className="flex items-center gap-1 rounded-full bg-recording/10 px-2 py-1 text-[9px] text-recording">
                <Radio size={10} />
                En vivo
              </span>
            </div>

            <div className="space-y-3">
              {transcripciones.map((item) => (
                <div key={`${item.nombre}-${item.hora}`} className="flex gap-2">
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${item.color}`}
                  >
                    {item.iniciales}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium">
                      {item.nombre}
                      <span className="ml-1 font-normal text-muted">
                        {item.hora}
                      </span>
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-muted">
                      {item.mensaje}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-1 border-t border-line pt-2 text-[10px] text-voice">
              <Subtitles size={12} />
              <Search size={11} />
              Transcripción buscable
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
