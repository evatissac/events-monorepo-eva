import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { z } from "zod"
import { useEventStore } from "@/store/event.store"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/page-header"
import { useSEO } from "@/hooks/use-seo"

export function EventAttendeeFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { events, editions, addAttendee } = useEventStore()

  const event = events.find((e) => e.id === id)
  const eventEditions = editions.filter((ed) => ed.mainEventId === id)
  const currentEdition = eventEditions.find((ed) => ed.isCurrent)

  useSEO({
    title: "Inscribir Participante",
    description: "Inscribe a un nuevo participante y asígnale su boleto y edición."
  })

  // Form states
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [identityDocumentType, setIdentityDocumentType] = useState("")
  const [identityDocumentNumber, setIdentityDocumentNumber] = useState("")
  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize edition selection defaulting to current edition
  useEffect(() => {
    if (currentEdition) {
      setSelectedEditionId(currentEdition.id)
    } else {
      setSelectedEditionId(null)
    }
  }, [currentEdition])

  const attendeeSchema = z.object({
    firstName: z.string().trim().min(1, "El nombre es obligatorio."),
    lastName: z.string().trim().min(1, "El apellido es obligatorio."),
    email: z.string().trim().min(1, "El correo es obligatorio.").email("Por favor, introduce un correo electrónico válido."),
    identityDocumentType: z.string().trim().optional().nullable(),
    identityDocumentNumber: z.string().trim().optional().nullable(),
  })

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const validation = attendeeSchema.safeParse({
      firstName,
      lastName,
      email,
      identityDocumentType: identityDocumentType || null,
      identityDocumentNumber: identityDocumentNumber || null,
    })

    if (!validation.success) {
      toast.error(validation.error.issues[0].message)
      setIsSubmitting(false)
      return
    }

    try {
      await addAttendee({
        eventId: id!,
        editionId: selectedEditionId,
        firstName,
        lastName,
        identityDocumentType: identityDocumentType || null,
        identityDocumentNumber: identityDocumentNumber.trim() || null,
        fullName: `${firstName} ${lastName}`.trim(),
        email,
        ticketType: "Participante",
        registrationDate: new Date().toISOString(),
        checkedIn: false,
      })

      toast.success("Participante inscrito correctamente")
      navigate(`/dashboard/events/${id}/attendees`)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Error al inscribir al participante")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!event) {
    return (
      <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
        Cargando datos del evento...
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      
      <PageHeader
        title="Inscribir Participante"
        description="Registra los datos del boleto del nuevo asistente."
        showBackButton
        onBackClick={() => navigate(`/dashboard/events/${id}/attendees`)}
      />

      <form onSubmit={handleSave} className="space-y-6 w-full">
        <div className="border border-border rounded-xl bg-card overflow-hidden w-full">
          <div className="p-6 space-y-6">
            
            {/* First Name & Last Name */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-border/50 pb-6">
              <div className="md:w-1/3 space-y-1">
                <label className="text-sm font-normal text-foreground block">
                  Nombre Completo *
                </label>
                <p className="text-xs text-muted-foreground">Nombres y apellidos completos del participante.</p>
              </div>
              <div className="md:w-2/3 w-full flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Nombre(s) (ej. Jefferson)"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="Apellido(s) (ej. Santos)"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-border/50 pb-6">
              <div className="md:w-1/3 space-y-1">
                <label htmlFor="atEmail" className="text-sm font-normal text-foreground block">
                  Correo Electrónico *
                </label>
                <p className="text-xs text-muted-foreground">Dirección de correo electrónico única del participante.</p>
              </div>
              <div className="md:w-2/3 w-full">
                <Input
                  id="atEmail"
                  type="email"
                  placeholder="jefferson@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Document Type & Number */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-border/50 pb-6">
              <div className="md:w-1/3 space-y-1">
                <label className="text-sm font-normal text-foreground block">
                  Identificación
                </label>
                <p className="text-xs text-muted-foreground">Tipo y número del documento nacional de identidad.</p>
              </div>
              <div className="md:w-2/3 w-full flex flex-col sm:flex-row gap-3">
                <select
                  id="atDocType"
                  value={identityDocumentType}
                  onChange={(e) => setIdentityDocumentType(e.target.value)}
                  className="sm:w-1/3 w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  disabled={isSubmitting}
                >
                  <option value="">Ninguno</option>
                  <option value="DNI">DNI</option>
                  <option value="RUC">RUC</option>
                  <option value="OTROS">Otros</option>
                </select>
                <Input
                  id="atDocNumber"
                  className="flex-1"
                  placeholder="Número de Documento"
                  value={identityDocumentNumber}
                  onChange={(e) => setIdentityDocumentNumber(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Related Edition */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="md:w-1/3 space-y-1">
                <label htmlFor="atEdition" className="text-sm font-normal text-foreground block">
                  Edición Relacionada
                </label>
                <p className="text-xs text-muted-foreground">Vincular a una edición específica o dejar global.</p>
              </div>
              <div className="md:w-2/3 w-full">
                <select
                  id="atEdition"
                  value={selectedEditionId || ""}
                  onChange={(e) => setSelectedEditionId(e.target.value || null)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  disabled={isSubmitting}
                >
                  <option value="">Ninguna (Global - Todas las ediciones)</option>
                  {eventEditions.map((ed) => (
                    <option key={ed.id} value={ed.id}>
                      {ed.name} {ed.isCurrent ? "— [Actual]" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/dashboard/events/${id}/attendees`)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Registrando..." : "Registrar Participante"}
          </Button>
        </div>
      </form>

    </div>
  )
}
