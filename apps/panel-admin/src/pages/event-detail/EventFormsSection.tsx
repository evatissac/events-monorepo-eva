import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Plus,
  Copy,
  Check,
  Trash2,
  Sparkles,
  Globe,
  SlidersHorizontal,
  Search,
  Users,
  Crown,
  Star,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/api/client"
import { useEventStore } from "@/store/event.store"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function EventFormsSection() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { editions, events } = useEventStore()

  const [forms, setForms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // Modal creation state
  const [openModal, setOpenModal] = useState(false)
  const [formType, setFormType] = useState<"FULL_PAGE" | "POPUP">("FULL_PAGE")
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [editionId, setEditionId] = useState("")
  const [purpose, setPurpose] = useState<"MAIN" | "PARTICIPANT" | "WAITLIST" | "OTHER">("PARTICIPANT")
  const [opensAt, setOpensAt] = useState("")
  const [closesAt, setClosesAt] = useState("")
  const [maxSubmissions, setMaxSubmissions] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  // Delete dialog state
  const [formToDelete, setFormToDelete] = useState<any | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const eventEditions = editions.filter((edition) => edition.mainEventId === id)
  const eventName = events.find((event) => event.id === id)?.name

  const loadForms = async () => {
    if (!id) return
    try {
      setLoading(true)
      const list = await api.registrationForms.list(id)
      setForms(list)
    } catch (error: any) {
      toast.error(error?.message || "No se pudieron cargar los formularios.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadForms()
  }, [id])

  const handleTitleChange = (val: string) => {
    setTitle(val)
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
    setSlug(generatedSlug)
  }

  const handleCreate = async () => {
    if (!title.trim()) {
      return toast.error("Por favor ingresa un nombre para el formulario.")
    }
    const finalSlug = slug.trim() || `form-${Date.now().toString(36)}`

    try {
      setIsCreating(true)
      const defaultFields = [
        {
          key: "header_title",
          label: title.trim(),
          type: "header",
          required: false,
          options: { text: title.trim() },
        },
        {
          key: "header_desc",
          label: "Suscríbete a nuestra newsletter para recibir nuestras novedades.",
          type: "paragraph",
          required: false,
          options: { text: "Suscríbete a nuestra newsletter para recibir nuestras novedades." },
        },
        {
          key: "email",
          label: "Introduce tu dirección de e-mail para suscribirte",
          type: "email",
          required: true,
          options: {
            placeholder: "EMAIL",
            helpText: "Introduce tu dirección de e-mail para suscribirte. Ej.: abc@xyz.com",
            objectType: "Contacto",
            attributeKey: "Email",
          },
        },
      ]

      const newForm = await api.registrationForms.create(id!, {
        title: title.trim(),
        slug: finalSlug,
        editionId: editionId || undefined,
        status: "DRAFT",
        description: formType === "POPUP" ? "Formulario tipo ventana emergente" : "Formulario de página completa",
        allowEditionSelection: false,
        purpose,
        opensAt: opensAt || undefined,
        closesAt: closesAt || undefined,
        maxSubmissions: maxSubmissions ? Number(maxSubmissions) : undefined,
        fields: defaultFields,
      })

      toast.success("Formulario creado con éxito.")
      setOpenModal(false)
      setTitle("")
      setSlug("")
      setEditionId("")
      setPurpose("PARTICIPANT")
      setOpensAt("")
      setClosesAt("")
      setMaxSubmissions("")
      navigate(`/dashboard/events/${id}/forms/${newForm.id}`)
    } catch (error: any) {
      toast.error(error?.message || "Error al crear el formulario.")
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!formToDelete) return
    try {
      await api.registrationForms.remove(formToDelete.id)
      toast.success("Formulario eliminado correctamente.")
      setFormToDelete(null)
      loadForms()
    } catch (error: any) {
      toast.error(error?.message || "No se pudo eliminar el formulario.")
    }
  }

  const handlePurposeChange = (nextPurpose: typeof purpose) => {
    setPurpose(nextPurpose)
    if (nextPurpose === "MAIN" && !title.trim() && eventName) handleTitleChange(`Regístrate a ${eventName}`)
  }

  const handleMakeMain = async (form: any) => {
    try {
      await api.registrationForms.makeMain(form.id)
      toast.success("Formulario configurado como registro principal con la estructura de participantes.")
      loadForms()
    } catch (error: any) {
      toast.error(error?.message || "No se pudo configurar el registro principal.")
    }
  }

  const handleRemoveMain = async (form: any) => {
    try {
      await api.registrationForms.update(form.id, { purpose: "PARTICIPANT" })
      toast.success("El formulario dejó de ser el registro principal.")
      loadForms()
    } catch (error: any) {
      toast.error(error?.message || "No se pudo actualizar el formulario.")
    }
  }

  const copyPublicLink = (formSlug: string, formId: string) => {
    const url = `${window.location.origin}/forms/${formSlug}`
    navigator.clipboard.writeText(url)
    setCopiedId(formId)
    toast.success("Enlace copiado al portapapeles")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredForms = forms.filter((f) =>
    f.title?.toLowerCase().includes(search.toLowerCase()) ||
    f.slug?.toLowerCase().includes(search.toLowerCase())
  )
  const mainFormId = forms.find((form) => form.purpose === "MAIN")?.id

  return (
    <div className="space-y-6">
      {/* PageHeader Standard Component */}
      <PageHeader
        title="Formularios de Registro"
        description="Diseña, publica e incrusta formularios interactivos para captar asistentes y suscriptores."
        actionButton={
          <Button
            onClick={() => setOpenModal(true)}
            className="flex items-center gap-2 self-start sm:self-auto font-semibold"
          >
            <Plus className="size-4" />
            Crear formulario
          </Button>
        }
      />

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título o enlace..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card rounded-xl h-10 border-border"
          />
        </div>
      </div>

      {/* Forms Grid List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 rounded-2xl border bg-card/60 animate-pulse p-6 space-y-4" />
          ))}
        </div>
      ) : filteredForms.length === 0 ? (
        <EmptyState
          imageSrc="/svg/empty_form.svg"
          imageAlt="Sin formularios"
          title={search ? "No se encontraron formularios" : "No tienes formularios creados"}
          description={
            search
              ? `No encontramos ningún formulario que coincida con "${search}". Intenta con otra búsqueda.`
              : "Crea tu primer formulario de registro con nuestro diseñador visual para empezar a captar asistentes."
          }
          action={
            search ? (
              <Button
                variant="outline"
                onClick={() => setSearch("")}
                className="rounded-xl font-medium"
              >
                Limpiar búsqueda
              </Button>
            ) : (
              <Button
                onClick={() => setOpenModal(true)}
                className="rounded-xl font-semibold bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-primary dark:text-primary-foreground"
              >
                <Plus className="mr-2 size-4" />
                Crear primer formulario
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredForms.map((form) => {
            const isPublished = form.status === "PUBLISHED"
            const submissionsCount = form._count?.submissions || 0

            return (
              <div
                key={form.id}
                className="group relative rounded-2xl border border-border bg-card p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between hover:border-primary/40"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        isPublished
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      <span className={`size-1.5 rounded-full ${isPublished ? "bg-emerald-500" : "bg-amber-500"}`} />
                      {isPublished ? "Publicado" : "Borrador"}
                    </span>

                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <Users className="size-3.5" />
                      {submissionsCount} {submissionsCount === 1 ? "registro" : "registros"}
                    </span>
                  </div>

                  {/* Form Title & Slug */}
                  <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {form.title}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <Globe className="size-3.5 shrink-0" />
                    <span className="truncate max-w-[200px]">/{form.slug}</span>
                    <button
                      onClick={() => copyPublicLink(form.slug, form.id)}
                      title="Copiar enlace"
                      className="p-1 hover:text-foreground text-muted-foreground rounded-md transition-colors"
                    >
                      {copiedId === form.id ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                    </button>
                  </div>

                  {form.edition && (
                    <div className="mt-3">
                      <Badge variant="outline" className="text-[11px] font-normal border-primary/20 text-primary">
                        Edición: {form.edition.name}
                      </Badge>
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-[11px] font-normal">
                      {form.purpose === "MAIN" ? "Registro principal" : form.purpose === "WAITLIST" ? "Lista de espera" : form.purpose === "OTHER" ? "Otro" : "Participantes"}
                    </Badge>
                    {form.opensAt && <Badge variant="outline" className="text-[11px] font-normal">Abre: {new Date(form.opensAt).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</Badge>}
                    {form.closesAt && <Badge variant="outline" className="text-[11px] font-normal">Cierra: {new Date(form.closesAt).toLocaleDateString("es-PE")}</Badge>}
                    {!form.opensAt && !form.closesAt && <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/5 text-[11px] font-normal text-emerald-700 dark:text-emerald-400">Registro abierto sin límite</Badge>}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => form.purpose === "MAIN" ? handleRemoveMain(form) : handleMakeMain(form)}
                      disabled={form.purpose !== "MAIN" && !!mainFormId}
                      className={`size-8 p-0 rounded-lg ${form.purpose === "MAIN" ? "border-amber-400/60 bg-amber-400/10 text-amber-600 hover:bg-amber-400/20" : "text-muted-foreground"}`}
                      title={form.purpose === "MAIN" ? "Quitar como registro principal" : mainFormId ? "Ya existe un registro principal" : "Establecer como registro principal"}
                    >
                      <Star className={`size-4 ${form.purpose === "MAIN" ? "fill-current" : ""}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFormToDelete(form)}
                      className="size-8 p-0 text-muted-foreground hover:text-destructive hover:border-destructive/40 rounded-lg"
                      title="Eliminar formulario"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => navigate(`/dashboard/events/${id}/forms/${form.id}`)}
                    className="rounded-lg h-8 text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-primary dark:text-primary-foreground"
                  >
                    <SlidersHorizontal className="mr-1.5 size-3.5" />
                    Diseñar
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* BREVO-STYLE MODAL: "Crear un formulario" (Matching Screenshot 1 exactly) */}
      {/* ========================================================================= */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-[700px] p-8 rounded-3xl border-border bg-card">
          <DialogHeader className="space-y-1 text-left pb-2">
            <DialogTitle className="text-2xl font-bold text-foreground tracking-tight">
              Crear un formulario
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            {/* Question */}
            <div>
              <label className="text-sm font-semibold text-foreground flex items-center gap-1">
                ¿Qué tipo de formulario deseas crear? <span className="text-rose-500">*</span>
              </label>

              {/* 2 Visual Interactive Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                {/* Option 1: Página completa / incrustada */}
                <div
                  onClick={() => setFormType("FULL_PAGE")}
                  className={`relative cursor-pointer rounded-2xl p-5 border-2 transition-all flex flex-col justify-between ${
                    formType === "FULL_PAGE"
                      ? "border-violet-600 bg-violet-50/20 shadow-xs ring-1 ring-violet-600/30"
                      : "border-border/80 hover:border-border bg-card/60 hover:bg-card"
                  }`}
                >
                  {/* Radio Indicator */}
                  <div className="absolute top-4 right-4">
                    <div
                      className={`size-5 rounded-full flex items-center justify-center transition-all ${
                        formType === "FULL_PAGE"
                          ? "border-2 border-violet-600"
                          : "border-2 border-muted-foreground/40"
                      }`}
                    >
                      {formType === "FULL_PAGE" && <div className="size-2.5 rounded-full bg-violet-600" />}
                    </div>
                  </div>

                  {/* Browser Illustration Vector */}
                  <div className="w-24 h-16 rounded-xl border border-slate-700 bg-white shadow-xs overflow-hidden flex flex-col mb-4">
                    {/* Green Top bar with 3 dots */}
                    <div className="h-4 bg-[#0d5c46] flex items-center px-1.5 gap-1 shrink-0">
                      <div className="size-1 rounded-full bg-white/70" />
                      <div className="size-1 rounded-full bg-white/70" />
                      <div className="size-1 rounded-full bg-white/70" />
                    </div>
                    {/* Window body */}
                    <div className="flex-1 p-1.5 flex flex-col justify-between bg-slate-50 relative">
                      <div className="space-y-1">
                        <div className="h-1.5 w-14 rounded-full border border-emerald-400 bg-white" />
                        <div className="h-1.5 w-14 rounded-full border border-emerald-400 bg-white" />
                      </div>
                      <div className="h-1.5 w-4 rounded-full bg-emerald-700" />
                      {/* Sparkle */}
                      <Sparkles className="absolute right-1 bottom-1 size-2.5 text-slate-400" />
                    </div>
                  </div>

                  {/* Card Content */}
                  <div>
                    <h4 className="font-bold text-foreground text-sm">Página completa/incrustada</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Obtén un enlace a un formulario de página completa o incrústalo en una página web.
                    </p>
                  </div>
                </div>

                {/* Option 2: Ventana emergente (Popup) */}
                <div
                  onClick={() => setFormType("POPUP")}
                  className={`relative cursor-pointer rounded-2xl p-5 border-2 transition-all flex flex-col justify-between ${
                    formType === "POPUP"
                      ? "border-violet-600 bg-violet-50/20 shadow-xs ring-1 ring-violet-600/30"
                      : "border-border/80 hover:border-border bg-card/60 hover:bg-card"
                  }`}
                >
                  {/* Radio Indicator */}
                  <div className="absolute top-4 right-4">
                    <div
                      className={`size-5 rounded-full flex items-center justify-center transition-all ${
                        formType === "POPUP"
                          ? "border-2 border-violet-600"
                          : "border-2 border-muted-foreground/40"
                      }`}
                    >
                      {formType === "POPUP" && <div className="size-2.5 rounded-full bg-violet-600" />}
                    </div>
                  </div>

                  {/* Popup Illustration Vector */}
                  <div className="w-24 h-16 rounded-xl border border-slate-700 bg-white shadow-xs overflow-hidden flex flex-col mb-4">
                    {/* Green Top bar with 3 dots */}
                    <div className="h-4 bg-[#0d5c46] flex items-center px-1.5 gap-1 shrink-0">
                      <div className="size-1 rounded-full bg-white/70" />
                      <div className="size-1 rounded-full bg-white/70" />
                      <div className="size-1 rounded-full bg-white/70" />
                    </div>
                    {/* Window body with centered popup card */}
                    <div className="flex-1 p-1 bg-slate-50 relative flex items-center justify-center">
                      <div className="w-12 h-8 rounded-md border border-emerald-500 bg-emerald-50/50 flex items-center justify-end p-1 shadow-2xs">
                        <div className="size-1 rounded-full border border-slate-400 bg-white" />
                      </div>
                      {/* Sparkle */}
                      <Sparkles className="absolute right-1 bottom-1 size-2.5 text-slate-400" />
                    </div>
                  </div>

                  {/* Card Content */}
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-foreground text-sm">Ventana emergente</h4>
                      <span className="inline-flex items-center gap-1 bg-amber-400/20 text-amber-800 dark:text-amber-300 font-semibold px-2 py-0.5 rounded-md text-[10px]">
                        <Crown className="size-3 fill-amber-500 text-amber-500" />
                        Professional
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Haz que un formulario aparezca dónde y cuándo quieras en tu sitio web.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Name Input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1">
                Nombre del formulario <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Ej. webinar, Inscripción General, Newsletter..."
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="h-11 rounded-xl bg-background border-border text-foreground px-4 text-sm focus-visible:ring-violet-600"
                autoFocus
              />
            </div>

            {/* Edition Association (Optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Finalidad</label>
                <select value={purpose} onChange={(e) => handlePurposeChange(e.target.value as typeof purpose)} className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground">
                  <option value="MAIN">Registro principal del evento</option>
                  <option value="PARTICIPANT">Registro de participantes</option>
                  <option value="WAITLIST">Lista de espera</option>
                  <option value="OTHER">Otro formulario</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Cupo máximo (opcional)</label>
                <Input type="number" min="1" value={maxSubmissions} onChange={(e) => setMaxSubmissions(e.target.value)} placeholder="Sin límite" className="h-11 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm font-semibold text-foreground">Abre el</label><Input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className="h-11 rounded-xl" /></div>
              <div className="space-y-2"><label className="text-sm font-semibold text-foreground">Cierra el</label><Input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className="h-11 rounded-xl" /></div>
            </div>

            {/* Edition Association (Optional) */}
            {eventEditions.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  Asociar a una edición (Opcional)
                </label>
                <select
                  value={editionId}
                  onChange={(e) => setEditionId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-violet-600"
                >
                  <option value="">Todo el Evento General</option>
                  {eventEditions.map((ed) => (
                    <option key={ed.id} value={ed.id}>
                      Edición: {ed.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Dialog Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenModal(false)}
                className="rounded-full px-6 h-10 font-semibold border-border text-foreground hover:bg-muted"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                onClick={handleCreate}
                disabled={isCreating || !title.trim()}
                className="rounded-full px-7 h-10 font-semibold bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm dark:bg-primary dark:text-primary-foreground"
              >
                {isCreating ? "Creando..." : "Crear formulario"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!formToDelete} onOpenChange={() => setFormToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar formulario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el formulario "{formToDelete?.title}" y su configuración.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
