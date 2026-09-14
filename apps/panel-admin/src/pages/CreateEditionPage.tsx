import React, { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { z } from "zod"
import { useEventStore } from "@/store/event.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"
import { LocationPickerMap } from "@/components/location-picker-map"

import { useSEO } from "@/hooks/use-seo"


export function CreateEditionPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { events, addEdition } = useEventStore()

  const event = events.find((e) => e.id === eventId)

  useSEO({
    title: "Nueva Edición",
    description: event
      ? `Añade una nueva edición anual o periódica para el evento ${event.name} en Zynqro .`
      : "Crea una nueva edición de evento."
  })

  // Form states
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [coverUrl, setCoverUrl] = useState("")
  const [metaThumbnailUrl, setMetaThumbnailUrl] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isSingleDay, setIsSingleDay] = useState(false)
  const [status, setStatus] = useState<"active" | "planned">("planned")
  const [location, setLocation] = useState("")
  const [modality, setModality] = useState("presencial")
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)

  const editionSchema = z.object({
    name: z.string().trim().min(1, "El nombre de la edición es obligatorio."),
    coverUrl: z.string().trim().url("El enlace de portada no es válido.").or(z.literal("")).optional(),
    metaThumbnailUrl: z.string().trim().url("La imagen para redes no es válida.").or(z.literal("")).optional(),
    startDate: z.string().min(1, "La fecha de inicio es requerida."),
    endDate: z.string(),
  }).refine((data) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(data.startDate), { message: "Selecciona fecha y hora de inicio válidas.", path: ["startDate"] }).refine((data) => isSingleDay || data.endDate.length > 0, {
    message: "La fecha de fin es requerida para una edición de varios días.",
    path: ["endDate"],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventId) return

    const validation = editionSchema.safeParse({
      name,
      coverUrl,
      metaThumbnailUrl,
      startDate,
      endDate,
    })

    if (!validation.success) {
      toast.error(validation.error.issues[0].message)
      return
    }

    setIsSubmitting(true)
    try {
      await addEdition({
        mainEventId: eventId,
        name: name.trim(),
        description: description.trim(),
        coverUrl: coverUrl.trim() || "",
        metaThumbnailUrl: metaThumbnailUrl.trim() || "",
        startDate,
        endDate: isSingleDay ? "" : endDate,
        isCurrent: status === "active",
        location,
        modality,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
      })

      toast.success("Edición creada exitosamente")
      navigate(`/dashboard/events/${eventId}/editions`)
    } catch (err: any) {
      console.error(err)
      toast.error("Error al crear la edición. Inténtalo de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <h3 className="font-bold text-lg">Evento no encontrado</h3>
          <p className="text-sm text-muted-foreground">El evento al cual deseas añadir una edición no existe.</p>
          <Button onClick={() => navigate("/dashboard/events")} variant="outline" className="w-full">
            Volver a Eventos
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      {/* Main Settings Form Container */}
      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 w-full pb-28">
        <div className="mb-10">
          <PageHeader
            title="Crear una Nueva Edición"
            description={`Añade una edición anual, periódica o especial vinculada a ${event.name}.`}
            showBackButton
            onBackClick={() => navigate(`/dashboard/events/${eventId}/editions`)}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
            {/* Name Row */}
            <div className="flex flex-col md:flex-row md:items-start justify-between p-6 gap-4 border-b border-border">
              <div className="md:w-1/3 space-y-1">
                <label htmlFor="ed-name" className="text-sm font-medium text-foreground">
                  Nombre de la Edición <span className="text-destructive">*</span>
                </label>
                <p className="text-xs text-muted-foreground">Ej. Primera Edición, Edición 2026</p>
              </div>
              <div className="md:w-2/3 max-w-md w-full">
                <Input
                  id="ed-name"
                  type="text"
                  required
                  placeholder="Ej. Edición 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>

            {/* Description Row */}
            <div className="flex flex-col md:flex-row md:items-start justify-between p-6 gap-4 border-b border-border">
              <div className="md:w-1/3 space-y-1">
                <label htmlFor="ed-desc" className="text-sm font-medium text-foreground">
                  Descripción
                </label>
                <p className="text-xs text-muted-foreground">Resumen explicativo sobre los objetivos o enfoque de esta edición.</p>
              </div>
              <div className="md:w-2/3 max-w-md w-full">
                <textarea
                  id="ed-desc"
                  rows={3}
                  placeholder="Temática principal, lema de la edición..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                />
              </div>
            </div>

            {/* Cover Url Row */}
            <div className="flex flex-col md:flex-row md:items-start justify-between p-6 gap-4 border-b border-border">
              <div className="md:w-1/3 space-y-1">
                <label htmlFor="ed-cover" className="text-sm font-medium text-foreground">
                  Imagen de Portada
                </label>
                <p className="text-xs text-muted-foreground">Enlace de la imagen específica de esta edición.</p>
              </div>
              <div className="md:w-2/3 max-w-md w-full">
                <Input
                  id="ed-cover"
                  type="url"
                  placeholder="https://ejemplo.com/edicion-cover.jpg"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>

            {/* Dates Row */}
            <div className="flex flex-col md:flex-row md:items-start justify-between p-6 gap-4 border-b border-border">
              <div className="md:w-1/3 space-y-1">
                <label htmlFor="ed-meta-thumbnail" className="text-sm font-medium text-foreground">Imagen para redes y meta</label>
                <p className="text-xs text-muted-foreground">Opcional. Recomendado: 1200 × 630 px para la previsualización al compartir.</p>
              </div>
              <div className="md:w-2/3 max-w-md w-full"><Input id="ed-meta-thumbnail" type="url" placeholder="https://.../meta-thumbnail.jpg" value={metaThumbnailUrl} onChange={(e) => setMetaThumbnailUrl(e.target.value)} className="bg-background" /></div>
            </div>

            {/* Dates Row */}
            <div className="flex flex-col md:flex-row md:items-start justify-between p-6 gap-4 border-b border-border">
              <div className="md:w-1/3 space-y-1">
                <label className="text-sm font-medium text-foreground">
                  Fechas de la Edición <span className="text-destructive">*</span>
                </label>
                <p className="text-xs text-muted-foreground">Cuándo se llevará a cabo esta edición.</p>
              </div>
              <div className="md:w-2/3 max-w-md w-full">
                <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={isSingleDay}
                    onChange={(e) => {
                      setIsSingleDay(e.target.checked)
                      if (e.target.checked) setEndDate("")
                    }}
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <span>
                    <span className="block font-medium text-foreground">Edición de un solo día</span>
                    <span className="block text-xs text-muted-foreground">Solo se registrará la fecha de inicio.</span>
                  </span>
                </label>
                <div className={`grid gap-4 ${isSingleDay ? "grid-cols-1" : "grid-cols-2"}`}>
                  <div className="space-y-1.5">
                    <label htmlFor="ed-start" className="text-[10px] font-bold uppercase text-muted-foreground">
                      Fecha y hora de inicio
                    </label>
                    <Input
                      id="ed-start"
                      type="datetime-local"
                      lang="es-PE"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  {!isSingleDay && <div className="space-y-1.5">
                    <label htmlFor="ed-end" className="text-[10px] font-bold uppercase text-muted-foreground">
                      Fecha y hora de fin
                    </label>
                    <Input
                      id="ed-end"
                      type="datetime-local"
                      lang="es-PE"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-background"
                    />
                  </div>}
                </div>
              </div>
            </div>

            {/* Modality Row */}
            <div className="flex flex-col md:flex-row md:items-start justify-between p-6 gap-4 border-b border-border">
              <div className="md:w-1/3 space-y-1">
                <label htmlFor="ed-modality" className="text-sm font-medium text-foreground">
                  Modalidad de la Edición
                </label>
                <p className="text-xs text-muted-foreground">Formato de realización de esta edición.</p>
              </div>
              <div className="md:w-2/3 max-w-md w-full">
                <select
                  id="ed-modality"
                  value={modality}
                  onChange={(e) => setModality(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                >
                  <option value="presencial">Presencial</option>
                  <option value="virtual">Virtual</option>
                  <option value="hibrido">Híbrido</option>
                </select>
              </div>
            </div>

            {/* Location Row */}
            <div className="flex flex-col md:flex-row md:items-start justify-between p-6 gap-4 border-b border-border">
              <div className="md:w-1/3 space-y-1">
                <label htmlFor="ed-location" className="text-sm font-medium text-foreground">
                  {modality === "virtual" ? "Enlace de transmisión" : modality === "hibrido" ? "Ubicación y enlace" : "Ubicación"}
                </label>
                <p className="text-xs text-muted-foreground">{modality === "virtual" ? "Enlace para conectarse de forma remota." : modality === "hibrido" ? "Indica el lugar físico y el enlace de transmisión." : "Lugar físico donde se realizará esta edición."}</p>
              </div>
              <div className="md:w-2/3 max-w-md w-full">
                <Input
                  id="ed-location"
                  type="text"
                  placeholder={modality === "virtual" ? "https://..." : modality === "hibrido" ? "Lugar · https://..." : "Ej. Auditorio principal"}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-background"
                />
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Input type="number" step="any" placeholder="Latitud" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
                  <Input type="number" step="any" placeholder="Longitud" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
                </div>
                {modality !== "virtual" && <LocationPickerMap latitude={latitude ? Number(latitude) : undefined} longitude={longitude ? Number(longitude) : undefined} onSelect={({ latitude: lat, longitude: lng }) => { setLatitude(lat.toFixed(6)); setLongitude(lng.toFixed(6)) }} />}
              </div>
            </div>

            {/* Status Row */}
            <div className="flex flex-col md:flex-row md:items-start justify-between p-6 gap-4">
              <div className="md:w-1/3 space-y-1">
                <label htmlFor="ed-status" className="text-sm font-medium text-foreground">
                  Estado de la Edición
                </label>
                <p className="text-xs text-muted-foreground">Define si es la edición actual y activa para registrarse.</p>
              </div>
              <div className="md:w-2/3 max-w-md w-full">
                <select
                  id="ed-status"
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                >
                  <option value="planned">Planificada (No Vigente)</option>
                  <option value="active">Activa (Vigente / Actual)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Action Footer */}
          <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 px-4 py-4 backdrop-blur-md sm:px-8">
            <div className="max-w-4xl mx-auto flex justify-end gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/dashboard/events/${eventId}/editions`)}
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer font-semibold"
              >
                {isSubmitting ? "Guardando..." : "Crear Edición"}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
