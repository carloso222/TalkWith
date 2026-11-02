/** Franja roja bajo el encabezado mientras se graba (Figma 16). */
export default function RecordingBanner({ tiempo }: { tiempo: string }) {
  return (
    <div role="status" className="flex h-9 shrink-0 items-center justify-center gap-2 border-b border-recording/30 bg-recording/10 text-caption">
      <span className="size-2 animate-pulse rounded-full bg-recording" />
      <span className="font-medium text-recording">Grabando</span>
      <span className="tabular-nums">{tiempo}</span>
      <span className="text-muted">Visible para todos los participantes</span>
    </div>
  )
}