 import {
    AudioLines,
    FileText,
    Headphones,
    History,
    MessageSquare,
    Plus,
    Search,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useService } from "../../hooks/useService";
import { rutas } from "../../lib/routes";
import { activityService, dashboardService, userService } from "../../services";
import { useAuthStore } from "../../store/authStore";
import type { Actividad } from "../../types";

const iconoActividad: Record<Actividad["tipo"], typeof MessageSquare> = {
    mencion: MessageSquare,
    transcripcion: AudioLines,
    archivo: FileText,
};

function saludo(fecha = new Date()) {
    const h = fecha.getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
}

/** Figma 05 · Inicio (dashboard). Responsable: Diego. */
export default function Dashboard() {
    useDocumentTitle("Inicio");
    const navigate = useNavigate();
    const usuario = useAuthStore((s) => s.usuario);

    const { data: resumen } = useService(
        () => dashboardService.getResumen(usuario?.uid),
        [usuario?.uid],
    );
    const { data: actividad, loading: cargandoActividad } = useService(
        () => activityService.getRecent(),
        [],
    );

    const llamada = resumen?.llamada;
    const nuevas = resumen?.sesionesNuevas ?? 0;
    const servidorId = resumen?.servidorId ?? "";

    const participantes = llamada?.participantes ?? [];
    const nombres = participantes
        .map((uid) => userService.find(uid)?.nombre.split(" ")[0])
        .filter(Boolean) as string[];
    const listaNombres =
        nombres.length > 1
            ? `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`
            : (nombres[0] ?? "");

    const hablante = llamada?.subtitulo
        ? userService.find(llamada.subtitulo.hablanteUid)
        : undefined;

    const textoNuevas = `${nuevas} ${nuevas === 1 ? "transcripción nueva" : "transcripciones nuevas"} para ti`;
    const subtitulo = llamada
        ? `Hay ${participantes.length} ${participantes.length === 1 ? "persona" : "personas"} en ${llamada.canalNombre} y ${textoNuevas}.`
        : `Tienes ${textoNuevas}.`;

    return (
        <div className="mx-auto flex w-full max-w-[920px] flex-col gap-8 px-8 py-10">
            <header className="flex flex-col gap-1.5">
                <h1 className="text-display font-bold">
                    {saludo()}, {usuario?.nombre.split(" ")[0]}
                </h1>
                <p className="text-body text-muted">
                    {resumen ? subtitulo : "Cargando tu resumen…"}
                </p>
            </header>

            {/* Continuar en la llamada */}
            {llamada && (
                <section
                    aria-labelledby="continuar-titulo"
                    className="flex items-center justify-between gap-6 rounded-2xl border border-line bg-panel p-6 shadow-low"
                >
                    <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
                        <Badge
                            tone="voice"
                            icon={<Headphones className="size-3.5" />}
                        >
                            En llamada ahora
                        </Badge>
                        <div className="flex flex-col gap-1">
                            <h2
                                id="continuar-titulo"
                                className="text-heading font-semibold"
                            >
                                Continuar en {llamada.canalNombre}
                            </h2>
                            <p className="text-small text-muted">
                                {listaNombres}{" "}
                                {participantes.length > 1
                                    ? "están conversando"
                                    : "está conversando"}
                                . Los subtítulos en vivo están activos.
                            </p>
                        </div>
                        <div className="flex w-full min-w-0 items-center gap-3">
                            <div className="flex shrink-0 -space-x-2">
                                {participantes.map((uid, i) => (
                                    <Avatar
                                        key={uid}
                                        uid={uid}
                                        size="sm"
                                        hablando={
                                            uid ===
                                            llamada.subtitulo?.hablanteUid
                                        }
                                        className={i === 0 ? "z-10" : undefined}
                                    />
                                ))}
                            </div>
                            {llamada.subtitulo && hablante && (
                                <p
                                    title={llamada.subtitulo.texto}
                                    className="flex min-w-0 items-center gap-2 rounded-full bg-base/60 px-3 py-1.5 text-small"
                                >
                                    <AudioLines
                                        className="size-3.5 shrink-0 text-voice"
                                        aria-hidden
                                    />
                                    <span className="truncate">
                                        <span className="font-semibold">
                                            {hablante.nombre.split(" ")[0]}:
                                        </span>{" "}
                                        <span className="text-muted">
                                            {llamada.subtitulo.texto}
                                        </span>
                                    </span>
                                </p>
                            )}
                        </div>
                    </div>
                    <Button
                        className="shrink-0"
                        onClick={() =>
                            navigate(
                                rutas.canal(
                                    llamada.servidorId,
                                    llamada.canalId,
                                ),
                            )
                        }
                    >
                        Unirse a la llamada
                    </Button>
                </section>
            )}

            {/* Accesos rápidos */}
            {resumen && (
                <section
                    aria-label="Accesos rápidos"
                    className="grid grid-cols-1 gap-4 md:grid-cols-3"
                >
                    {servidorId && (
                        <AccesoRapido
                            to={rutas.sesiones(servidorId)}
                            icono={<History className="size-[18px]" />}
                            titulo="Transcripciones recientes"
                            texto={
                                nuevas > 0
                                    ? `${nuevas} ${nuevas === 1 ? "sesión nueva" : "sesiones nuevas"} desde ayer para revisar.`
                                    : "Revisa lo que se dijo en tus llamadas."
                            }
                        />
                    )}
                    <AccesoRapido
                        to={rutas.buscar()}
                        icono={<Search className="size-[18px]" />}
                        titulo="Buscar conversaciones"
                        texto="Encuentra mensajes y frases dichas en llamadas."
                        atajo="Ctrl K"
                    />
                    <AccesoRapido
                        to={rutas.crearServidor}
                        icono={<Plus className="size-[18px]" />}
                        titulo="Crear un servidor"
                        texto="Reúne a tu grupo en un espacio propio."
                    />
                </section>
            )}

            {/* Actividad reciente */}
            <section
                aria-labelledby="actividad-titulo"
                className="flex flex-col gap-3"
            >
                <h2
                    id="actividad-titulo"
                    className="text-subtitle font-semibold"
                >
                    Actividad reciente
                </h2>
                {cargandoActividad ? (
                    <p className="text-small text-muted">Cargando actividad…</p>
                ) : actividad && actividad.length > 0 ? (
                    <ul className="flex flex-col divide-y divide-line border-y border-line">
                        {actividad.map((a) => {
                            const Icono = iconoActividad[a.tipo];
                            return (
                                <li key={a.actividadId}>
                                    <Link
                                        to={a.ruta}
                                        className="flex items-center gap-3 py-3 transition-colors hover:bg-panel/60"
                                    >
                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-panel text-muted">
                                            <Icono className="size-4" />
                                        </span>
                                        <span className="min-w-0 flex-1 truncate text-small">
                                            {a.texto}
                                        </span>
                                        <span className="shrink-0 text-caption text-muted">
                                            {a.cuando}
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="text-small text-muted">
                        Aún no hay actividad. Únete a una llamada o escribe en
                        un canal para empezar.
                    </p>
                )}
            </section>
        </div>
    );
}

function AccesoRapido({
    to,
    icono,
    titulo,
    texto,
    atajo,
}: {
    to: string;
    icono: ReactNode;
    titulo: string;
    texto: string;
    atajo?: string;
}) {
    return (
        <Link
            to={to}
            className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5 transition-colors hover:border-muted/50 hover:bg-raised"
        >
            <span className="flex size-9 items-center justify-center rounded-lg bg-raised text-fg">
                {icono}
            </span>
            <span className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-small font-semibold">
                    {titulo}
                    {atajo && (
                        <kbd className="rounded-md bg-base/60 px-1.5 py-0.5 text-caption font-medium text-muted">
                            {atajo}
                        </kbd>
                    )}
                </span>
                <span className="text-small text-muted">{texto}</span>
            </span>
        </Link>
    );
}