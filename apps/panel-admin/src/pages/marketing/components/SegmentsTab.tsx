import { useState } from "react"
import { Plus, Users, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import type { Segment } from "../types"

interface SegmentsTabProps {
  segments: Segment[]
  events: any[]
  onCreateSegment: (segment: { name: string; description?: string; eventId?: string; audience?: "PARTICIPANTS" | "SPEAKERS" }) => void | Promise<void>
  onDeleteSegment: (id: string) => void
}

export function SegmentsTab({
  segments,
  events,
  onCreateSegment,
  onDeleteSegment,
}: SegmentsTabProps) {
  const [openModal, setOpenModal] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [eventId, setEventId] = useState("")
  const [audience, setAudience] = useState<"PARTICIPANTS" | "SPEAKERS">("PARTICIPANTS")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    void onCreateSegment({
      name: name.trim(),
      description: description.trim() || undefined,
      eventId: eventId || undefined,
      audience,
    })

    setName("")
    setDescription("")
    setEventId("")
    setOpenModal(false)
    toast.success("Segmento de audiencia creado")
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-base text-foreground">
            Listas y Segmentos ({segments.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            Organiza a tus asistentes y contactos en audiencias dinámicas o estáticas.
          </p>
        </div>

        <Button
          onClick={() => setOpenModal(true)}
          className="rounded-xl h-9 px-4 font-semibold bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-primary dark:text-primary-foreground text-xs shadow-sm flex items-center gap-1.5 self-start sm:self-center"
        >
          <Plus className="size-3.5" />
          <span>Crear segmento</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {segments.map((segment) => (
          <div
            key={segment.id}
            className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 hover:border-violet-500/40"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="size-9 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <Users className="size-4" />
                </div>

                <button
                  onClick={() => onDeleteSegment(segment.id)}
                  className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-muted"
                  title="Eliminar segmento"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              <h4 className="font-bold text-sm text-foreground">{segment.name}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {segment.description || "Segmento personalizado de contactos."}
              </p>
            </div>

            <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs">
              <span className="text-muted-foreground text-[11px]">
                Creado: {new Date(segment.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
              </span>
              <span className="font-bold text-violet-600 dark:text-violet-400">
                {segment._count?.members || 0} contactos
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Segment Dialog */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-[480px] p-6 rounded-3xl border-border bg-card">
          <DialogHeader className="space-y-1 text-left pb-2">
            <DialogTitle className="text-xl font-bold text-foreground">
              Crear nuevo segmento
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Define una nueva agrupación para enviar campañas dirigidas.
            </p>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Nombre del segmento <span className="text-red-500">*</span>
              </label>
              <Input
                required
                placeholder="Ej: Ponentes Confirmados CONIAP"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl h-10 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-xs font-semibold text-foreground">Evento (opcional)</label><select value={eventId} onChange={(event) => setEventId(event.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs"><option value="">Segmento manual</option>{events.map((event) => <option key={event.id} value={event.id}>{event.eventName || event.name}</option>)}</select></div>
              <div className="space-y-1"><label className="text-xs font-semibold text-foreground">Audiencia</label><select value={audience} onChange={(event) => setAudience(event.target.value as "PARTICIPANTS" | "SPEAKERS")} disabled={!eventId} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs disabled:opacity-50"><option value="PARTICIPANTS">Participantes</option><option value="SPEAKERS">Ponentes</option></select></div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Descripción
              </label>
              <Input
                placeholder="Ej: Participantes inscritos con rol de speaker"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl h-10 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenModal(false)}
                className="rounded-full text-xs h-9 px-4"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-full text-xs h-9 px-5 bg-neutral-900 text-white dark:bg-primary dark:text-primary-foreground font-semibold"
              >
                Guardar segmento
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
