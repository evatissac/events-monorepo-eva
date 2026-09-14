import { useState, useEffect } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { z } from "zod"
import { useEventStore } from "@/store/event.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MediaUploader } from "@/components/MediaUploader"
import { toast } from "sonner"
import { Pencil, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"

import { useSEO } from "@/hooks/use-seo"
import { PageHeader } from "@/components/page-header"
import { api } from "@/api/client"
import { LocationPickerMap } from "@/components/location-picker-map"

export function EventInfoSection() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { events, updateEvent, deleteEvent } = useEventStore()
  const event = events.find((e) => e.id === id)

  useSEO({
    title: event ? `${event.name} - General` : "Detalle de Evento",
    description: event?.shortDescription || "Gestiona la información principal, colores de marca y estado del evento en Zynqro ."
  })

  const [name, setName] = useState("")
  const [shortDescription, setShortDescription] = useState("")
  const [about, setAbout] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft")
  const [isActive, setIsActive] = useState(true)
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [whatsappCommunityUrl, setWhatsappCommunityUrl] = useState("")
  const [eventMode, setEventMode] = useState("")
  const [venueAddress, setVenueAddress] = useState("")
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [contacts, setContacts] = useState<any[]>([])
  const [newContact, setNewContact] = useState({ name: "", email: "", phone: "", role: "" })
  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [brandPrimary, setBrandPrimary] = useState("#000000")
  const [brandSecondary, setBrandSecondary] = useState("#ffffff")
  const [socialTwitter, setSocialTwitter] = useState("")
  const [socialFacebook, setSocialFacebook] = useState("")
  const [socialLinkedin, setSocialLinkedin] = useState("")
  const [socialInstagram, setSocialInstagram] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")

  useEffect(() => {
    if (event) {
      setName(event.name || "")
      setShortDescription(event.shortDescription || "")
      setAbout(typeof event.about === "object" && event.about?.es ? event.about.es : typeof event.about === "string" ? event.about : "")
      setLogoUrl(event.logoUrl || "")
      setStatus(event.status || "draft")
      setIsActive(event.isActive !== false)
      setWebsiteUrl(event.websiteUrl || "")
      setContactEmail(event.contactEmail || "")
      setWhatsappCommunityUrl(event.whatsappCommunityUrl || "")
      setEventMode(event.eventMode || "")
      setVenueAddress(event.venueAddress || "")
      setLatitude(event.latitude?.toString() || "")
      setLongitude(event.longitude?.toString() || "")
      setBrandPrimary(event.brandColors?.primary || "#000000")
      setBrandSecondary(event.brandColors?.secondary || "#ffffff")
      setSocialTwitter(event.socialLinks?.twitter || "")
      setSocialFacebook(event.socialLinks?.facebook || "")
      setSocialLinkedin(event.socialLinks?.linkedin || "")
      setSocialInstagram(event.socialLinks?.instagram || "")
    }
  }, [event])
  useEffect(() => { if (event?.id) api.events.contacts(event.id).then(setContacts).catch(() => setContacts([])) }, [event?.id])
  useEffect(() => {
    if (location.hash === "#contacts") requestAnimationFrame(() => document.getElementById("contacts")?.scrollIntoView({ behavior: "smooth", block: "start" }))
  }, [location.hash, event?.id])

  if (!event) return null

  const editEventSchema = z.object({
    name: z.string().trim().min(1, "El nombre del evento es obligatorio."),
    shortDescription: z.string().trim().min(1, "La descripcion corta es obligatoria."),
    contactEmail: z.string().trim().email("El correo de contacto no es valido.").or(z.literal("")).optional(),
    websiteUrl: z.string().trim().url("El sitio web no es valido (debe empezar con http:// o https://).").or(z.literal("")).optional(),
    whatsappCommunityUrl: z.string().trim().url("El enlace de WhatsApp no es válido.").or(z.literal("")).optional(),
    socialTwitter: z.string().trim().url("El enlace de Twitter/X no es valido (debe empezar con http:// o https://).").or(z.literal("")).optional(),
    socialFacebook: z.string().trim().url("El enlace de Facebook no es valido (debe empezar con http:// o https://).").or(z.literal("")).optional(),
    socialLinkedin: z.string().trim().url("El enlace de LinkedIn no es valido (debe empezar con http:// o https://).").or(z.literal("")).optional(),
    socialInstagram: z.string().trim().url("El enlace de Instagram no es valido (debe empezar con http:// o https://).").or(z.literal("")).optional(),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validation = editEventSchema.safeParse({
      name,
      shortDescription,
      contactEmail,
      websiteUrl,
      whatsappCommunityUrl,
      socialTwitter,
      socialFacebook,
      socialLinkedin,
      socialInstagram,
    })

    if (!validation.success) {
      toast.error(validation.error.issues[0].message)
      return
    }
    setIsSubmitting(true)
    try {
      await updateEvent(event.id, {
        name: name.trim(),
        shortDescription: shortDescription.trim(),
        about: about.trim() ? { es: about.trim() } : "",
        logoUrl: logoUrl.trim() || "",
        status,
        isActive,
        websiteUrl: websiteUrl.trim() || "",
        whatsappCommunityUrl: whatsappCommunityUrl.trim() || "",
        contactEmail: contactEmail.trim() || "",
        eventMode,
        venueAddress: venueAddress.trim() || "",
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        brandColors: { primary: brandPrimary, secondary: brandSecondary },
        socialLinks: {
          twitter: socialTwitter.trim(),
          facebook: socialFacebook.trim(),
          linkedin: socialLinkedin.trim(),
          instagram: socialInstagram.trim(),
        },
      })
      toast.success("Evento actualizado exitosamente")
    } catch (err) {
      console.error(err)
      toast.error("Error al actualizar el evento.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteEvent(event.id)
      toast.success("Evento eliminado exitosamente")
      navigate("/dashboard/events")
    } catch {
      toast.error("Error al eliminar el evento.")
    } finally {
      setIsDeleting(false)
    }
  }

  const openNewContact = () => {
    setEditingContactId(null)
    setNewContact({ name: "", email: "", phone: "", role: "" })
    setContactDialogOpen(true)
  }

  const openEditContact = (contact: any) => {
    setEditingContactId(contact.id)
    setNewContact({ name: contact.name || "", email: contact.email || "", phone: contact.phone || "", role: contact.role || "" })
    setContactDialogOpen(true)
  }

  const saveContact = async () => {
    if (!newContact.name.trim()) return toast.error("El nombre del contacto es obligatorio.")
    try {
      const payload = { name: newContact.name.trim(), email: newContact.email.trim() || undefined, phone: newContact.phone.trim() || undefined, role: newContact.role.trim() || undefined }
      const saved = editingContactId ? await api.events.updateContact(editingContactId, payload) : await api.events.addContact(event.id, payload)
      setContacts((current) => editingContactId ? current.map((contact) => contact.id === saved.id ? saved : contact) : [...current, saved])
      setContactDialogOpen(false)
      setEditingContactId(null)
      setNewContact({ name: "", email: "", phone: "", role: "" })
      toast.success(editingContactId ? "Contacto actualizado." : "Contacto agregado.")
    } catch (error: any) {
      toast.error(error?.message || "No se pudo guardar el contacto.")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
      <PageHeader
        title="Información General"
        description="Gestiona la información básica, portada, logo, colores de marca y visibilidad del evento."
      />
      {/* Informacion Basica */}
      <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between p-6 gap-4 border-b border-border">
          <div className="md:w-1/3 space-y-1">
            <label htmlFor="evt-name" className="text-sm font-medium text-foreground">
              Nombre del Evento <span className="text-destructive">*</span>
            </label>
            <p className="text-xs text-muted-foreground">Nombre publico del evento.</p>
          </div>
          <div className="md:w-2/3 w-full">
            <Input id="evt-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className="bg-background" />
          </div>
        </div>

        {event?.organizationId && (
          <div className="flex flex-col md:flex-row md:items-start justify-between p-6 gap-4 border-b border-border">
            <div className="md:w-1/3 space-y-1">
              <label className="text-sm font-medium text-foreground">Galería y hero</label>
              <p className="text-xs text-muted-foreground">
                Añade imágenes o video. Marca una pieza destacada para usarla en el hero público.
              </p>
            </div>
            <div className="md:w-2/3 w-full">
              <MediaUploader
                multiple
                eventId={event.id}
                ownerType="EVENT"
                ownerId={event.id}
                organizationId={event.organizationId}
                purpose="GALLERY"
                maxItems={10}
                placeholder="Arrastra archivos de galería o selecciónalos"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-start justify-between p-6 gap-4 border-b border-border">
          <div className="md:w-1/3 space-y-1">
            <label htmlFor="evt-short-desc" className="text-sm font-medium text-foreground">
              Descripcion Corta <span className="text-destructive">*</span>
            </label>
            <p className="text-xs text-muted-foreground">Un resumen breve para las tarjetas del catalogo.</p>
          </div>
          <div className="md:w-2/3 w-full">
            <Input id="evt-short-desc" type="text" required value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} className="bg-background" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-start justify-between p-6 gap-4 border-b border-border">
          <div className="md:w-1/3 space-y-1">
            <label htmlFor="evt-about" className="text-sm font-medium text-foreground">Descripcion Detallada</label>
            <p className="text-xs text-muted-foreground">Detalla los objetivos, agenda y propuesta de valor.</p>
          </div>
          <div className="md:w-2/3 w-full">
            <textarea id="evt-about" rows={4} value={about} onChange={(e) => setAbout(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-start justify-between p-6 gap-4 border-b border-border">
          <div className="md:w-1/3 space-y-1">
            <label htmlFor="evt-logo" className="text-sm font-medium text-foreground">Logo del Evento</label>
            <p className="text-xs text-muted-foreground">Logo o marca del evento.</p>
          </div>
          <div className="md:w-2/3 w-full">
            <MediaUploader
              value={logoUrl}
              onChange={setLogoUrl}
              variant="square"
              assetTarget={{ organizationId: event.organizationId, type: "events/logo", resourceId: event.id }}
              placeholder="Arrastra o selecciona el logo"
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-start justify-between p-6 gap-4 border-b border-border">
          <div className="md:w-1/3 space-y-1">
            <label htmlFor="evt-status" className="text-sm font-medium text-foreground">Estado</label>
            <p className="text-xs text-muted-foreground">Define si estará visible inmediatamente.</p>
          </div>
          <div className="md:w-2/3 max-w-md w-full">
            <select id="evt-status" value={status} onChange={(e: any) => setStatus(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground">
              <option value="draft">Borrador (Oculto)</option>
              <option value="published">Publicado (Visible)</option>
              <option value="archived">Archivado</option>
            </select>
          </div>
        </div>
      </div>

      <section id="contacts" className="order-20 scroll-mt-6 border border-border rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-6 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-sm font-semibold text-foreground">Contactos</h2><p className="mt-1 text-xs text-muted-foreground">Personas responsables de consultas y coordinación del evento.</p></div>
          <Button type="button" onClick={openNewContact}>Añadir contacto</Button>
        </div>
        <div className="p-6">
          <div className="overflow-hidden rounded-md border"><div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground"><span>Contacto</span><span>Correo</span><span>Teléfono</span><span>Acciones</span></div>{contacts.length === 0 ? <div className="px-4 py-8 text-center text-sm text-muted-foreground">Aún no hay contactos registrados.</div> : contacts.map((contact) => <div key={contact.id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-3 border-b px-4 py-3 text-sm last:border-0"><span className="font-medium">{contact.name}{contact.role ? <small className="ml-2 text-muted-foreground">{contact.role}</small> : null}</span><span className="text-muted-foreground">{contact.email || "—"}</span><span className="text-muted-foreground">{contact.phone || "—"}</span><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" aria-label={`Editar ${contact.name}`} onClick={() => openEditContact(contact)}><Pencil className="size-4" /></Button><Button type="button" variant="ghost" size="sm" onClick={async () => { try { await api.events.removeContact(contact.id); setContacts((current) => current.filter((item) => item.id !== contact.id)); toast.success("Contacto eliminado.") } catch (error: any) { toast.error(error?.message || "No se pudo eliminar el contacto.") } }}>Eliminar</Button></div></div>)}</div>
        </div>
        <AlertDialog open={contactDialogOpen} onOpenChange={(open) => { setContactDialogOpen(open); if (!open) setEditingContactId(null) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{editingContactId ? "Editar contacto" : "Añadir contacto"}</AlertDialogTitle><AlertDialogDescription>Completa los datos disponibles de esta persona de contacto.</AlertDialogDescription></AlertDialogHeader><div className="grid gap-4 py-4"><div className="space-y-1.5"><label htmlFor="contact-name" className="text-sm font-medium">Nombre <span className="text-destructive">*</span></label><Input id="contact-name" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} /></div><div className="space-y-1.5"><label htmlFor="contact-email" className="text-sm font-medium">Correo electrónico</label><Input id="contact-email" type="email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><label htmlFor="contact-phone" className="text-sm font-medium">Teléfono</label><Input id="contact-phone" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} /></div><div className="space-y-1.5"><label htmlFor="contact-role" className="text-sm font-medium">Cargo o rol</label><Input id="contact-role" value={newContact.role} onChange={(e) => setNewContact({ ...newContact, role: e.target.value })} /></div></div></div><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><Button type="button" onClick={() => void saveContact()}>Guardar contacto</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </section>

      <h2 className="order-[19] text-lg">Contacto y Enlaces</h2>
      {/* Contacto y Enlaces */}
      <div className="order-30 border border-border rounded-xl bg-card overflow-hidden shadow-sm">
        {false && <>
        </>}
        <div style={{ display: "none" }} className="flex flex-col md:flex-row md:items-start justify-between p-6 gap-4 border-b border-border">
          <div className="md:w-1/3 space-y-1">
            <label htmlFor="evt-email" className="text-sm font-medium text-foreground">Email de Contacto</label>
            <p className="text-xs text-muted-foreground">Correo para consultas del evento.</p>
          </div>
          <div className="md:w-2/3 max-w-md w-full">
            <Input id="evt-email" type="email" placeholder="contacto@evento.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="bg-background" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-start justify-between p-6 gap-4 border-b border-border">
          <div className="md:w-1/3 space-y-1">
            <label htmlFor="evt-website" className="text-sm font-medium text-foreground">Sitio Web</label>
            <p className="text-xs text-muted-foreground">URL del sitio oficial del evento.</p>
          </div>
          <div className="md:w-2/3 max-w-md w-full">
            <Input id="evt-website" type="url" placeholder="https://evento.com" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className="bg-background" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-start justify-between p-6 gap-4 border-b border-border">
          <div className="md:w-1/3 space-y-1"><label htmlFor="evt-whatsapp" className="text-sm font-medium text-foreground">Comunidad de WhatsApp</label><p className="text-xs text-muted-foreground">Opcional. Se mostrará únicamente en la página de confirmación.</p></div>
          <div className="md:w-2/3 max-w-md w-full"><Input id="evt-whatsapp" type="url" placeholder="https://chat.whatsapp.com/..." value={whatsappCommunityUrl} onChange={(e) => setWhatsappCommunityUrl(e.target.value)} className="bg-background" /></div>
        </div>

        <div className="p-6 space-y-4">
          <label className="text-sm font-medium text-foreground">Redes Sociales</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input type="url" placeholder="Twitter / X URL" value={socialTwitter} onChange={(e) => setSocialTwitter(e.target.value)} className="bg-background" />
            <Input type="url" placeholder="Facebook URL" value={socialFacebook} onChange={(e) => setSocialFacebook(e.target.value)} className="bg-background" />
            <Input type="url" placeholder="LinkedIn URL" value={socialLinkedin} onChange={(e) => setSocialLinkedin(e.target.value)} className="bg-background" />
            <Input type="url" placeholder="Instagram URL" value={socialInstagram} onChange={(e) => setSocialInstagram(e.target.value)} className="bg-background" />
          </div>
        </div>
      </div>

      <h2 style={{ display: "none" }} className="text-lg">Colores del Evento</h2>
      {/* Colores de Marca */}
      <div style={{ display: "none" }} className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="p-6 flex flex-col md:flex-row gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">Primario</label>
            <div className="flex items-center gap-2">
              <input type="color" value={brandPrimary} onChange={(e) => setBrandPrimary(e.target.value)} className="size-8 rounded border border-border cursor-pointer" />
              <Input type="text" value={brandPrimary} onChange={(e) => setBrandPrimary(e.target.value)} className="w-24 bg-background text-xs font-mono" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">Secundario</label>
            <div className="flex items-center gap-2">
              <input type="color" value={brandSecondary} onChange={(e) => setBrandSecondary(e.target.value)} className="size-8 rounded border border-border cursor-pointer" />
              <Input type="text" value={brandSecondary} onChange={(e) => setBrandSecondary(e.target.value)} className="w-24 bg-background text-xs font-mono" />
            </div>
          </div>
        </div>
      </div>

      {/* Zona de Peligro */}
      <div className="order-40 border border-destructive/30 rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="p-6 border-b border-destructive/20 bg-destructive/5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-destructive">Zona de Peligro</h2>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-4">
          <div className="md:w-2/3 space-y-1">
            <p className="text-sm font-medium text-foreground">Eliminar este evento</p>
            <p className="text-xs text-muted-foreground">Se eliminaran todas sus ediciones, ponentes, agenda y participantes. Esta accion no se puede deshacer.</p>
          </div>
          <div className="md:w-1/3 flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm" disabled={isDeleting} className="cursor-pointer gap-2">
                  <Trash2 className="size-4" />
                  Eliminar Evento
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estas seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminará permanentemente "{event.name}" y todos sus datos asociados. Esta accion no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <Input value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} placeholder="Escribe ELIMINAR" />
                  <AlertDialogAction disabled={deleteConfirmation !== "ELIMINAR"} onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Sí, eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Footer fijo */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/80 px-8 py-4 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex justify-end gap-3 w-full">
          <Button type="button" variant="outline" onClick={() => navigate("/dashboard/events")} disabled={isSubmitting} className="cursor-pointer">
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || isDeleting} className="cursor-pointer font-semibold">
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </div>
    </form>
  )
}
