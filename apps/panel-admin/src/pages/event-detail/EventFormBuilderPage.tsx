import { useEffect, useState, useMemo, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  RotateCcw,
  Undo2,
  Redo2,
  Smartphone,
  Monitor,
  Heading,
  Type,
  ImageIcon,
  Minus,
  Tag,
  CircleDot,
  CheckSquare,
  ListFilter,
  Phone,
  ShieldCheck,
  FileCheck2,
  Lock,
  Trash2,
  GripVertical,
  ChevronDown,
  Palette,
  Save,
  HelpCircle,
  ChevronLeft,
  CheckCircle2,
  Globe,
  EyeOff,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/api/client"
import { useAuthStore } from "@/store/auth.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface FormBlock {
  key: string
  label: string
  type: string
  required: boolean
  options?: {
    text?: string
    placeholder?: string
    helpText?: string
    objectType?: string
    attributeKey?: string
    showLabel?: boolean
    showPlaceholder?: boolean
    showHelpText?: boolean
    choices?: string[]
    imageUrl?: string
    imageAlt?: string
    countryCode?: string
    [key: string]: any
  }
}

export interface FormTheme {
  primaryColor: string
  textColor: string
  bgColor: string
  cardBgColor: string
  buttonText: string
  buttonTextColor: string
  borderRadius: string
  fontFamily: string
}

const DEFAULT_THEME: FormTheme = {
  primaryColor: "#27303f",
  textColor: "#1e293b",
  bgColor: "#f8fafc",
  cardBgColor: "#ffffff",
  buttonText: "SUSCRIBIRSE",
  buttonTextColor: "#ffffff",
  borderRadius: "0.5rem",
  fontFamily: "Inter, sans-serif",
}

export function EventFormBuilderPage() {
  const { id: eventId, formId } = useParams<{ id: string; formId: string }>()
  const navigate = useNavigate()
  const { selectedOrganization } = useAuthStore()

  const [, setForm] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Layout View Mode: Desktop or Mobile (Screenshot 4)
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop")

  // Sidebar Tab: 'create' | 'design' (Screenshot 2, 3)
  const [activeTab, setActiveTab] = useState<"create" | "design">("create")

  // Currently selected block for Attribute Inspector (Screenshot 5)
  const [selectedBlockKey, setSelectedBlockKey] = useState<string | null>(null)

  // Form Fields / Blocks
  const [blocks, setBlocks] = useState<FormBlock[]>([])

  // Form Theme / Styling
  const [theme, setTheme] = useState<FormTheme>(DEFAULT_THEME)

  // Undo / Redo History Stack
  const [history, setHistory] = useState<FormBlock[][]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const historyRef = useRef<FormBlock[][]>([])
  const historyIndexRef = useRef(-1)
  const [draggedKey, setDraggedKey] = useState<string | null>(null)

  // Settings Modal (Step 1 Configuration Modal)
  const [openSettingsModal, setOpenSettingsModal] = useState(false)
  const [formTitle, setFormTitle] = useState("")
  const [formSlug, setFormSlug] = useState("")
  const [formStatus, setFormStatus] = useState("DRAFT")
  const [formPurpose, setFormPurpose] = useState("PARTICIPANT")
  const [opensAt, setOpensAt] = useState("")
  const [closesAt, setClosesAt] = useState("")
  const [maxSubmissions, setMaxSubmissions] = useState("")
  const [emailTemplates, setEmailTemplates] = useState<any[]>([])
  const [welcomeTemplateId, setWelcomeTemplateId] = useState("")

  // Load Form Data
  useEffect(() => {
    if (!formId) return
    setLoading(true)

    const fetchForm = async () => {
      try {
        let data: any = null
        try {
          data = await api.registrationForms.get(formId)
        } catch {
          // Fallback: fetch from event forms list if get endpoint was pending reload
          if (eventId) {
            const list = await api.registrationForms.list(eventId)
            data = list.find((x: any) => x.id === formId)
          }
        }

        if (!data) {
          throw new Error("Formulario no encontrado")
        }

        setForm(data)
        setFormTitle(data.title || "")
        setFormSlug(data.slug || "")
        setFormStatus(data.status || "DRAFT")
        setFormPurpose(data.purpose || "PARTICIPANT")
        setOpensAt(data.opensAt ? new Date(data.opensAt).toISOString().slice(0, 16) : "")
        setClosesAt(data.closesAt ? new Date(data.closesAt).toISOString().slice(0, 16) : "")
        setMaxSubmissions(data.maxSubmissions ? String(data.maxSubmissions) : "")
        const welcomeAutomation = (data.automations || []).find((automation: any) => automation.trigger === "REGISTRATION_SUBMITTED")
        setWelcomeTemplateId(welcomeAutomation?.steps?.[0]?.templateId || "")

        if (selectedOrganization?.id) {
          const templates = await api.emailTemplates.list(selectedOrganization.id)
          setEmailTemplates(templates.filter((template: any) => template.status !== "ARCHIVED" && template.channel === "EMAIL"))
        }

        if (data.fields && data.fields.length > 0) {
          const loadedBlocks: FormBlock[] = data.fields.filter((f: any) => data.purpose !== "MAIN" || f.key !== "edition_id").map((f: any) => ({
            key: f.key || `field_${Date.now()}_${Math.random()}`,
            label: f.label || "Campo",
            type: f.type || "text",
            required: !!f.required,
            options: f.options || {},
          }))
          setBlocks(loadedBlocks)
          historyRef.current = [loadedBlocks]
          historyIndexRef.current = 0
          setHistory([loadedBlocks])
          setHistoryIndex(0)
        } else {
          // Default initial blocks
          const initialBlocks: FormBlock[] = [
            {
              key: "title_1",
              label: data.title || "Newsletter",
              type: "header",
              required: false,
              options: { text: data.title || "Newsletter" },
            },
            {
              key: "text_1",
              label: "Suscríbete a nuestra newsletter para recibir nuestras novedades.",
              type: "paragraph",
              required: false,
              options: { text: "Suscríbete a nuestra newsletter para recibir nuestras novedades." },
            },
            {
              key: "email_1",
              label: "Introduce tu dirección de e-mail para suscribirte",
              type: "email",
              required: true,
              options: {
                placeholder: "EMAIL",
                helpText: "Introduce tu dirección de e-mail para suscribirte. Ej.: abc@xyz.com",
                objectType: "Contacto",
                attributeKey: "Email",
                showLabel: true,
                showPlaceholder: true,
                showHelpText: true,
              },
            },
          ]
          setBlocks(initialBlocks)
          historyRef.current = [initialBlocks]
          historyIndexRef.current = 0
          setHistory([initialBlocks])
          setHistoryIndex(0)
        }
      } catch (err: any) {
        toast.error(err?.message || "No se pudo cargar el formulario.")
      } finally {
        setLoading(false)
      }
    }

    fetchForm()
  }, [formId, eventId, selectedOrganization?.id])

  // Push new state into history stack for Undo/Redo
  const updateBlocksWithHistory = (newBlocks: FormBlock[]) => {
    const snapshot = newBlocks.map((block) => ({ ...block, options: block.options ? { ...block.options } : undefined }))
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1)
    newHistory.push(snapshot)
    historyRef.current = newHistory
    historyIndexRef.current = newHistory.length - 1
    setBlocks(snapshot)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      const nextIndex = historyIndexRef.current - 1
      const prev = historyRef.current[nextIndex]
      historyIndexRef.current = nextIndex
      setHistoryIndex(nextIndex)
      setBlocks(prev)
    }
  }

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      const nextIndex = historyIndexRef.current + 1
      const next = historyRef.current[nextIndex]
      historyIndexRef.current = nextIndex
      setHistoryIndex(nextIndex)
      setBlocks(next)
    }
  }

  const moveBlock = (fromKey: string, toKey: string) => {
    if (fromKey === toKey) return
    const from = blocks.findIndex((block) => block.key === fromKey)
    const to = blocks.findIndex((block) => block.key === toKey)
    if (from < 0 || to < 0) return
    const reordered = [...blocks]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    updateBlocksWithHistory(reordered)
  }

  const handleReset = () => {
    if (!confirm("¿Deseas restablecer el diseño inicial?")) return
    const defaultTemplate: FormBlock[] = [
      {
        key: "title_default",
        label: "Newsletter",
        type: "header",
        required: false,
        options: { text: "Newsletter" },
      },
      {
        key: "text_default",
        label: "Suscríbete a nuestra newsletter para recibir nuestras novedades.",
        type: "paragraph",
        required: false,
        options: { text: "Suscríbete a nuestra newsletter para recibir nuestras novedades." },
      },
      {
        key: "email_default",
        label: "Introduce tu dirección de e-mail para suscribirte",
        type: "email",
        required: true,
        options: {
          placeholder: "EMAIL",
          helpText: "Introduce tu dirección de e-mail para suscribirte. Ej.: abc@xyz.com",
          objectType: "Contacto",
          attributeKey: "Email",
          showLabel: true,
          showPlaceholder: true,
          showHelpText: true,
        },
      },
    ]
    updateBlocksWithHistory(defaultTemplate)
    setSelectedBlockKey(null)
    setTheme(DEFAULT_THEME)
    toast.info("Diseño restablecido a la plantilla predeterminada")
  }

  // Add block to canvas
  const addBlock = (type: string, label: string) => {
    const newKey = `block_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    let newBlock: FormBlock

    switch (type) {
      case "header":
        newBlock = {
          key: newKey,
          label: "Título del Formulario",
          type: "header",
          required: false,
          options: { text: "Nuevo Título" },
        }
        break
      case "paragraph":
        newBlock = {
          key: newKey,
          label: "Texto informativo",
          type: "paragraph",
          required: false,
          options: { text: "Escribe aquí una descripción o instrucciones para tus asistentes." },
        }
        break
      case "image":
        newBlock = {
          key: newKey,
          label: "Imagen",
          type: "image",
          required: false,
          options: {
            imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60",
            imageAlt: "Banner del evento",
          },
        }
        break
      case "divider":
        newBlock = {
          key: newKey,
          label: "Divisor",
          type: "divider",
          required: false,
          options: {},
        }
        break
      case "phone":
      case "sms":
        newBlock = {
          key: newKey,
          label: "Introduce tu SMS",
          type: "phone",
          required: false,
          options: {
            placeholder: "SMS",
            helpText: "Personaliza este texto de ayuda opcional antes de publicar tu formulario.",
            objectType: "Contacto",
            attributeKey: "SMS",
            countryCode: "+51",
            showLabel: true,
            showPlaceholder: true,
            showHelpText: true,
          },
        }
        break
      case "radio":
        newBlock = {
          key: newKey,
          label: "¿Cómo te enteraste del evento?",
          type: "radio",
          required: false,
          options: {
            objectType: "Contacto",
            attributeKey: "Elección única",
            showLabel: true,
            showHelpText: false,
            choices: ["Redes Sociales", "Correo Electrónico", "Recomendación de un amigo", "Otro"],
          },
        }
        break
      case "checkbox":
        newBlock = {
          key: newKey,
          label: "Acepto recibir recordatorios del evento por WhatsApp",
          type: "checkbox",
          required: false,
          options: {
            objectType: "Contacto",
            attributeKey: "Casilla de verificación",
            showLabel: true,
          },
        }
        break
      case "multiple":
        newBlock = {
          key: newKey,
          label: "Temas de tu interés",
          type: "multiple",
          required: false,
          options: {
            objectType: "Contacto",
            attributeKey: "Opción múltiple",
            showLabel: true,
            choices: ["Inteligencia Artificial", "Diseño UI/UX", "Desarrollo Cloud", "Negocios"],
          },
        }
        break
      case "terms":
        newBlock = {
          key: newKey,
          label: "Acepto los términos y condiciones de uso y la política de eventos.",
          type: "terms",
          required: true,
          options: {
            showLabel: true,
          },
        }
        break
      case "privacy":
        newBlock = {
          key: newKey,
          label: "Tus datos serán tratados conforme a la ley de protección de datos personales.",
          type: "privacy",
          required: false,
          options: {
            showLabel: true,
          },
        }
        break
      case "captcha":
        newBlock = {
          key: newKey,
          label: "Verificación de seguridad reCAPTCHA",
          type: "captcha",
          required: true,
          options: {
            showLabel: true,
          },
        }
        break
      default:
        // Text attribute
        newBlock = {
          key: newKey,
          label: label || "Campo de texto",
          type: "text",
          required: false,
          options: {
            placeholder: "Escribe aquí...",
            helpText: "",
            objectType: "Contacto",
            attributeKey: label || "Texto",
            showLabel: true,
            showPlaceholder: true,
            showHelpText: false,
          },
        }
        break
    }

    const updated = [...blocks, newBlock]
    updateBlocksWithHistory(updated)
    setSelectedBlockKey(newKey)
    toast.success(`Bloque añadido: ${label}`)
  }

  // Delete block from canvas
  const deleteBlock = (key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const updated = blocks.filter((b) => b.key !== key)
    updateBlocksWithHistory(updated)
    if (selectedBlockKey === key) {
      setSelectedBlockKey(null)
    }
    toast.info("Bloque eliminado")
  }

  // Update specific block property
  const updateSelectedBlock = (partial: Partial<FormBlock>) => {
    if (!selectedBlockKey) return
    const updated = blocks.map((b) => {
      if (b.key === selectedBlockKey) {
        return {
          ...b,
          ...partial,
          options: {
            ...b.options,
            ...(partial.options || {}),
          },
        }
      }
      return b
    })
    updateBlocksWithHistory(updated)
  }

  // Save changes to API
  // Save changes to API
  const handleSave = async (targetStatus?: string) => {
    if (!formId) return
    try {
      setSaving(true)
      const finalStatus = targetStatus || formStatus
      const payload = {
        title: formTitle,
        slug: formSlug,
        status: finalStatus,
        purpose: formPurpose,
        opensAt: opensAt || null,
        closesAt: closesAt || null,
        maxSubmissions: maxSubmissions ? Number(maxSubmissions) : null,
        fields: blocks.map((b) => ({
          key: b.key,
          label: b.label,
          type: b.type,
          required: !!b.required,
          options: b.options || null,
        })),
      }

      await api.registrationForms.update(formId, payload)
      await api.registrationForms.setWelcomeTemplate(formId, welcomeTemplateId || null)
      if (targetStatus) setFormStatus(targetStatus)
      if (targetStatus === "PUBLISHED") {
        toast.success("¡Formulario publicado con éxito!")
      } else if (targetStatus === "DRAFT") {
        toast.success("Formulario despublicado (ahora en borrador)")
      } else {
        toast.success("Diseño guardado correctamente")
      }
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar el formulario.")
    } finally {
      setSaving(false)
    }
  }

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.key === selectedBlockKey),
    [blocks, selectedBlockKey]
  )

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Cargando constructor de formulario…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-full bg-slate-100 dark:bg-zinc-950 select-none overflow-hidden font-sans">
      {/* ========================================================================= */}
      {/* TOP NAVBAR: Title, Steps, Viewport Switcher, Actions (Screenshot 2, 3)     */}
      {/* ========================================================================= */}
      <header className="h-16 border-b border-border/80 bg-white dark:bg-zinc-900 px-6 flex items-center justify-between z-30 shrink-0 shadow-xs">
        {/* Left: Back Arrow + Form Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/dashboard/events/${eventId}/forms`)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="size-4" />
            <span className="text-base font-bold tracking-tight truncate max-w-[200px] sm:max-w-xs">
              {formTitle || "Formulario"}
            </span>
          </button>
        </div>

        {/* Center: Step Indicator (Screenshot 2) & Responsive View Switcher (Screenshot 3, 4) */}
        <div className="flex items-center gap-6">
          {/* Steps Indicator */}
          <div className="hidden lg:flex items-center gap-3 text-xs">
            <button
              onClick={() => setOpenSettingsModal(true)}
              className="flex items-center gap-1.5 font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <CheckCircle2 className="size-4 fill-emerald-600 text-white" />
              <span>Configuración</span>
            </button>

            <span className="text-slate-300 dark:text-zinc-700">|</span>

            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
              <span className="size-4 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] flex items-center justify-center font-bold">
                2
              </span>
              <span>Diseño</span>
            </div>
          </div>

          {/* Desktop / Mobile Switcher (Screenshots 3 & 4) */}
          <div className="flex items-center bg-slate-100 dark:bg-zinc-800 p-1 rounded-full border border-slate-200 dark:border-zinc-700">
            <button
              onClick={() => setViewMode("desktop")}
              title="Vista de escritorio"
              className={`p-1.5 rounded-full transition-all flex items-center justify-center ${viewMode === "desktop"
                ? "bg-white dark:bg-zinc-900 text-primary shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Monitor className="size-4" />
            </button>
            <button
              onClick={() => setViewMode("mobile")}
              title="Vista móvil"
              className={`p-1.5 rounded-full transition-all flex items-center justify-center ${viewMode === "mobile"
                ? "bg-white dark:bg-zinc-900 text-primary shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Smartphone className="size-4" />
            </button>
          </div>
        </div>

        {/* Right Actions: Reset, Undo/Redo, Save, Publish/Unpublish */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            title="Restablecer diseño"
            className="hidden sm:flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <RotateCcw className="size-3.5" />
            <span>Restablecer</span>
          </button>

          <div className="hidden sm:flex items-center border-l border-r border-border/60 px-1 gap-1">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Deshacer"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <Undo2 className="size-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Rehacer"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <Redo2 className="size-4" />
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => handleSave()}
            disabled={saving}
            className="rounded-xl h-9 px-4 font-semibold bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-primary dark:text-primary-foreground shadow-xs"
          >
            <Save className="mr-1.5 size-3.5" />
            {saving ? "Guardando..." : "Guardar"}
          </Button>

          {formStatus === "PUBLISHED" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSave("DRAFT")}
              disabled={saving}
              className="rounded-xl h-9 px-4 font-semibold border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              title="Despublicar formulario y volver a borrador"
            >
              <EyeOff className="mr-1.5 size-3.5" />
              Despublicar
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSave("PUBLISHED")}
              disabled={saving}
              className="rounded-xl h-9 px-4 font-semibold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              title="Publicar formulario"
            >
              <Globe className="mr-1.5 size-3.5" />
              Publicar
            </Button>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN BODY: Left Sidebar + Center Preview Canvas                           */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* ========================================================================= */}
        {/* LEFT SIDEBAR: Tabs (Crear | Diseño) OR Attribute Inspector (Screenshot 5) */}
        {/* ========================================================================= */}
        <aside className="w-80 border-r border-border/80 bg-white dark:bg-zinc-900 flex flex-col shrink-0 z-20 overflow-y-auto">
          {selectedBlock ? (
            /* ======================================================================= */
            /* FIELD INSPECTOR VIEW (Matching Screenshot 5)                            */
            /* ======================================================================= */
            <div className="flex flex-col h-full animate-in fade-in-50 duration-200">
              {/* Back to blocks button */}
              <div className="p-4 border-b border-border/60 flex items-center justify-between bg-slate-50/60 dark:bg-zinc-800/40">
                <button
                  onClick={() => setSelectedBlockKey(null)}
                  className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100 hover:text-primary transition-colors cursor-pointer"
                >
                  <ChevronLeft className="size-4" />
                  <span>
                    {selectedBlock.type === "header"
                      ? "Título"
                      : selectedBlock.type === "paragraph"
                        ? "Texto"
                        : selectedBlock.type === "image"
                          ? "Imagen"
                          : selectedBlock.type === "phone"
                            ? "SMS"
                            : selectedBlock.options?.attributeKey || "Atributo"}
                  </span>
                </button>

                <button
                  onClick={() => deleteBlock(selectedBlock.key)}
                  title="Eliminar campo"
                  className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              {/* Inspector Form Controls */}
              <div className="p-5 space-y-5 flex-1 overflow-y-auto">
                {/* Object Type (Screenshot 5: Tipo de objeto) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tipo de objeto
                  </label>
                  <select
                    value={selectedBlock.options?.objectType || "Contacto"}
                    onChange={(e) =>
                      updateSelectedBlock({
                        options: { ...selectedBlock.options, objectType: e.target.value },
                      })
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary font-medium"
                  >
                    <option value="Contacto">Contacto</option>
                    <option value="Participante">Participante</option>
                    <option value="Empresa">Empresa</option>
                    <option value="Personalizado">Personalizado</option>
                  </select>
                </div>

                {/* Attribute Database (Screenshot 5: Base de datos de atributos) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Base de datos de atributos
                  </label>
                  <select
                    value={selectedBlock.options?.attributeKey || (selectedBlock.type === "phone" ? "SMS" : "Nombre")}
                    onChange={(e) => {
                      const newAttr = e.target.value
                      updateSelectedBlock({
                        label: `Introduce tu ${newAttr}`,
                        options: {
                          ...selectedBlock.options,
                          attributeKey: newAttr,
                          placeholder: newAttr.toUpperCase(),
                        },
                      })
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary font-medium"
                  >
                    <option value="SMS">SMS / Teléfono</option>
                    <option value="Email">Email</option>
                    <option value="Nombre">Nombre</option>
                    <option value="Apellidos">Apellidos</option>
                    <option value="Organización">Organización / Empresa</option>
                    <option value="Cargo">Cargo / Puesto</option>
                    <option value="DNI">Documento de Identidad / DNI</option>
                    <option value="Ciudad">Ciudad / País</option>
                  </select>
                </div>

                {/* Checkboxes / Switches (Screenshot 5) */}
                <div className="space-y-4 pt-2 border-t border-border/40">
                  {/* Nombre de la etiqueta (Label) */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBlock.options?.showLabel !== false}
                        onChange={(e) =>
                          updateSelectedBlock({
                            options: { ...selectedBlock.options, showLabel: e.target.checked },
                          })
                        }
                        className="size-4 rounded accent-primary text-primary focus:ring-primary"
                      />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Nombre de la etiqueta
                      </span>
                    </label>

                    {selectedBlock.options?.showLabel !== false && (
                      <Input
                        value={selectedBlock.label}
                        onChange={(e) => updateSelectedBlock({ label: e.target.value })}
                        placeholder="Etiqueta del campo..."
                        className="h-9 text-xs rounded-xl bg-background"
                      />
                    )}
                  </div>

                  {/* Marcador de posición (Placeholder) */}
                  {selectedBlock.type !== "header" &&
                    selectedBlock.type !== "paragraph" &&
                    selectedBlock.type !== "divider" &&
                    selectedBlock.type !== "image" && (
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedBlock.options?.showPlaceholder !== false}
                            onChange={(e) =>
                              updateSelectedBlock({
                                options: { ...selectedBlock.options, showPlaceholder: e.target.checked },
                              })
                            }
                            className="size-4 rounded accent-primary text-primary focus:ring-primary"
                          />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Marcador de posición
                          </span>
                        </label>

                        {selectedBlock.options?.showPlaceholder !== false && (
                          <Input
                            value={selectedBlock.options?.placeholder || ""}
                            onChange={(e) =>
                              updateSelectedBlock({
                                options: { ...selectedBlock.options, placeholder: e.target.value },
                              })
                            }
                            placeholder="Ej. Introduce tu e-mail..."
                            className="h-9 text-xs rounded-xl bg-background"
                          />
                        )}
                      </div>
                    )}

                  {/* Texto de ayuda (Help text) */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBlock.options?.showHelpText !== false}
                        onChange={(e) =>
                          updateSelectedBlock({
                            options: { ...selectedBlock.options, showHelpText: e.target.checked },
                          })
                        }
                        className="size-4 rounded accent-primary text-primary focus:ring-primary"
                      />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Texto de ayuda
                      </span>
                    </label>

                    {selectedBlock.options?.showHelpText !== false && (
                      <Input
                        value={selectedBlock.options?.helpText || ""}
                        onChange={(e) =>
                          updateSelectedBlock({
                            options: { ...selectedBlock.options, helpText: e.target.value },
                          })
                        }
                        placeholder="Ej. Personaliza este texto de ayuda..."
                        className="h-9 text-xs rounded-xl bg-background"
                      />
                    )}
                  </div>

                  {/* Campo obligatorio (Required) */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBlock.required}
                        onChange={(e) => updateSelectedBlock({ required: e.target.checked })}
                        className="size-4 rounded accent-primary text-primary focus:ring-primary"
                      />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Campo obligatorio
                      </span>
                    </label>
                  </div>
                </div>

                {/* Additional controls for text/header/image */}
                {selectedBlock.type === "header" && (
                  <div className="space-y-2 pt-3 border-t border-border/40">
                    <label className="text-xs font-bold text-foreground">Texto del Encabezado</label>
                    <Input
                      value={selectedBlock.options?.text || ""}
                      onChange={(e) =>
                        updateSelectedBlock({
                          options: { ...selectedBlock.options, text: e.target.value },
                        })
                      }
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                )}

                {selectedBlock.type === "paragraph" && (
                  <div className="space-y-2 pt-3 border-t border-border/40">
                    <label className="text-xs font-bold text-foreground">Contenido del Párrafo</label>
                    <textarea
                      value={selectedBlock.options?.text || ""}
                      onChange={(e) =>
                        updateSelectedBlock({
                          options: { ...selectedBlock.options, text: e.target.value },
                        })
                      }
                      rows={3}
                      className="w-full text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-background p-2.5 focus:outline-hidden focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}

                {selectedBlock.type === "image" && (
                  <div className="space-y-2 pt-3 border-t border-border/40">
                    <label className="text-xs font-bold text-foreground">URL de la Imagen</label>
                    <Input
                      value={selectedBlock.options?.imageUrl || ""}
                      onChange={(e) =>
                        updateSelectedBlock({
                          options: { ...selectedBlock.options, imageUrl: e.target.value },
                        })
                      }
                      placeholder="https://..."
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                )}

                {/* Choices for Radio / Multiple */}
                {(selectedBlock.type === "radio" || selectedBlock.type === "multiple") && (
                  <div className="space-y-2 pt-3 border-t border-border/40">
                    <label className="text-xs font-bold text-foreground">Opciones</label>
                    <div className="space-y-1.5">
                      {(selectedBlock.options?.choices || []).map((choice, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            value={choice}
                            onChange={(e) => {
                              const newChoices = [...(selectedBlock.options?.choices || [])]
                              newChoices[i] = e.target.value
                              updateSelectedBlock({
                                options: { ...selectedBlock.options, choices: newChoices },
                              })
                            }}
                            className="h-8 text-xs rounded-lg"
                          />
                          <button
                            onClick={() => {
                              const newChoices = (selectedBlock.options?.choices || []).filter(
                                (_, idx) => idx !== i
                              )
                              updateSelectedBlock({
                                options: { ...selectedBlock.options, choices: newChoices },
                              })
                            }}
                            className="text-muted-foreground hover:text-destructive p-1"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const newChoices = [
                            ...(selectedBlock.options?.choices || []),
                            `Opción ${(selectedBlock.options?.choices?.length || 0) + 1}`,
                          ]
                          updateSelectedBlock({
                            options: { ...selectedBlock.options, choices: newChoices },
                          })
                        }}
                        className="w-full h-8 text-xs rounded-lg font-medium"
                      >
                        + Añadir opción
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ======================================================================= */
            /* PALETTE & DESIGN TABS VIEW (Matching Screenshot 2 & 3)                  */
            /* ======================================================================= */
            <div className="flex flex-col h-full">
              {/* Tab Header (Crear | Diseño) */}
              <div className="grid grid-cols-2 border-b border-border/60 text-center font-bold text-sm bg-slate-50/40 dark:bg-zinc-800/20">
                <button
                  onClick={() => setActiveTab("create")}
                  className={`py-3.5 border-b-2 transition-all cursor-pointer ${activeTab === "create"
                    ? "border-violet-600 text-violet-600 dark:text-violet-400 font-bold bg-white dark:bg-zinc-900"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Crear
                </button>
                <button
                  onClick={() => setActiveTab("design")}
                  className={`py-3.5 border-b-2 transition-all cursor-pointer ${activeTab === "design"
                    ? "border-violet-600 text-violet-600 dark:text-violet-400 font-bold bg-white dark:bg-zinc-900"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Diseño
                </button>
              </div>

              {/* Tab Content: Crear */}
              {activeTab === "create" && (
                <div className="p-4 space-y-6 flex-1 overflow-y-auto">
                  {/* Section: Bloques (Screenshot 2) */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2.5 uppercase tracking-wider">
                      Bloques
                    </h4>
                    <div className="space-y-1.5">
                      <button
                        draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-new-form-block", JSON.stringify({ type: "header", label: "Título" })) }} onClick={() => addBlock("header", "Título")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-violet-500/50 hover:bg-violet-50/30 dark:hover:bg-violet-950/20 transition-all text-left group bg-white dark:bg-zinc-900"
                      >
                        <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          <Heading className="size-4 text-slate-500 group-hover:text-violet-600" />
                          Título
                        </span>
                        <GripVertical className="size-3.5 text-slate-300 dark:text-zinc-700 group-hover:text-slate-500" />
                      </button>

                      <button
                        draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-new-form-block", JSON.stringify({ type: "paragraph", label: "Texto" })) }} onClick={() => addBlock("paragraph", "Texto")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-violet-500/50 hover:bg-violet-50/30 dark:hover:bg-violet-950/20 transition-all text-left group bg-white dark:bg-zinc-900"
                      >
                        <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          <Type className="size-4 text-slate-500 group-hover:text-violet-600" />
                          Texto
                        </span>
                        <GripVertical className="size-3.5 text-slate-300 dark:text-zinc-700 group-hover:text-slate-500" />
                      </button>

                      <button
                        draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-new-form-block", JSON.stringify({ type: "image", label: "Imagen" })) }} onClick={() => addBlock("image", "Imagen")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-violet-500/50 hover:bg-violet-50/30 dark:hover:bg-violet-950/20 transition-all text-left group bg-white dark:bg-zinc-900"
                      >
                        <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          <ImageIcon className="size-4 text-slate-500 group-hover:text-violet-600" />
                          Imagen
                        </span>
                        <GripVertical className="size-3.5 text-slate-300 dark:text-zinc-700 group-hover:text-slate-500" />
                      </button>

                      <button
                        draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-new-form-block", JSON.stringify({ type: "divider", label: "Divisor" })) }} onClick={() => addBlock("divider", "Divisor")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-violet-500/50 hover:bg-violet-50/30 dark:hover:bg-violet-950/20 transition-all text-left group bg-white dark:bg-zinc-900"
                      >
                        <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          <Minus className="size-4 text-slate-500 group-hover:text-violet-600" />
                          Divisor
                        </span>
                        <GripVertical className="size-3.5 text-slate-300 dark:text-zinc-700 group-hover:text-slate-500" />
                      </button>
                    </div>
                  </div>

                  {/* Section: Campos (Screenshot 2 & 3) */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2.5 uppercase tracking-wider">
                      Campos
                    </h4>
                    <div className="space-y-1.5">
                      <button
                        draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-new-form-block", JSON.stringify({ type: "text", label: "Atributo" })) }} onClick={() => addBlock("text", "Atributo")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-violet-500/50 hover:bg-violet-50/30 dark:hover:bg-violet-950/20 transition-all text-left group bg-white dark:bg-zinc-900"
                      >
                        <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          <Tag className="size-4 text-slate-500 group-hover:text-violet-600" />
                          Atributo
                        </span>
                        <GripVertical className="size-3.5 text-slate-300 dark:text-zinc-700 group-hover:text-slate-500" />
                      </button>

                      <button
                        draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-new-form-block", JSON.stringify({ type: "radio", label: "Elección única" })) }} onClick={() => addBlock("radio", "Elección única")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-violet-500/50 hover:bg-violet-50/30 dark:hover:bg-violet-950/20 transition-all text-left group bg-white dark:bg-zinc-900"
                      >
                        <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          <CircleDot className="size-4 text-slate-500 group-hover:text-violet-600" />
                          Elección única
                        </span>
                        <GripVertical className="size-3.5 text-slate-300 dark:text-zinc-700 group-hover:text-slate-500" />
                      </button>

                      <button
                        draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-new-form-block", JSON.stringify({ type: "checkbox", label: "Casilla de verificación" })) }} onClick={() => addBlock("checkbox", "Casilla de verificación")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-violet-500/50 hover:bg-violet-50/30 dark:hover:bg-violet-950/20 transition-all text-left group bg-white dark:bg-zinc-900"
                      >
                        <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          <CheckSquare className="size-4 text-slate-500 group-hover:text-violet-600" />
                          Casilla de verificación
                        </span>
                        <GripVertical className="size-3.5 text-slate-300 dark:text-zinc-700 group-hover:text-slate-500" />
                      </button>

                      <button
                        draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-new-form-block", JSON.stringify({ type: "multiple", label: "Opción múltiple" })) }} onClick={() => addBlock("multiple", "Opción múltiple")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-violet-500/50 hover:bg-violet-50/30 dark:hover:bg-violet-950/20 transition-all text-left group bg-white dark:bg-zinc-900"
                      >
                        <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          <ListFilter className="size-4 text-slate-500 group-hover:text-violet-600" />
                          Opción múltiple
                        </span>
                        <GripVertical className="size-3.5 text-slate-300 dark:text-zinc-700 group-hover:text-slate-500" />
                      </button>

                      <button
                        draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-new-form-block", JSON.stringify({ type: "phone", label: "SMS" })) }} onClick={() => addBlock("phone", "SMS")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-violet-500/50 hover:bg-violet-50/30 dark:hover:bg-violet-950/20 transition-all text-left group bg-white dark:bg-zinc-900"
                      >
                        <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          <Phone className="size-4 text-slate-500 group-hover:text-violet-600" />
                          Suscripción / SMS
                        </span>
                        <GripVertical className="size-3.5 text-slate-300 dark:text-zinc-700 group-hover:text-slate-500" />
                      </button>
                    </div>
                  </div>

                  {/* Section: Privacidad y seguridad de los datos (Screenshot 2 & 3) */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2.5 uppercase tracking-wider">
                      Privacidad y seguridad de los datos
                    </h4>
                    <div className="space-y-1.5">
                      <button
                        draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-new-form-block", JSON.stringify({ type: "terms", label: "Confirmación de Términos" })) }} onClick={() => addBlock("terms", "Confirmación de Términos")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-violet-500/50 hover:bg-violet-50/30 dark:hover:bg-violet-950/20 transition-all text-left group bg-white dark:bg-zinc-900"
                      >
                        <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          <FileCheck2 className="size-4 text-slate-500 group-hover:text-violet-600" />
                          Confirmación...
                        </span>
                        <GripVertical className="size-3.5 text-slate-300 dark:text-zinc-700 group-hover:text-slate-500" />
                      </button>

                      <button
                        draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-new-form-block", JSON.stringify({ type: "privacy", label: "Declaración de Privacidad" })) }} onClick={() => addBlock("privacy", "Declaración de Privacidad")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-violet-500/50 hover:bg-violet-50/30 dark:hover:bg-violet-950/20 transition-all text-left group bg-white dark:bg-zinc-900"
                      >
                        <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          <ShieldCheck className="size-4 text-slate-500 group-hover:text-violet-600" />
                          Declaración R...
                        </span>
                        <GripVertical className="size-3.5 text-slate-300 dark:text-zinc-700 group-hover:text-slate-500" />
                      </button>

                      <button
                        draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-new-form-block", JSON.stringify({ type: "captcha", label: "Captcha" })) }} onClick={() => addBlock("captcha", "Captcha")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-violet-500/50 hover:bg-violet-50/30 dark:hover:bg-violet-950/20 transition-all text-left group bg-white dark:bg-zinc-900"
                      >
                        <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          <Lock className="size-4 text-slate-500 group-hover:text-violet-600" />
                          Captcha <span className="text-rose-500">*</span>
                        </span>
                        <GripVertical className="size-3.5 text-slate-300 dark:text-zinc-700 group-hover:text-slate-500" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content: Diseño (Theme Settings) */}
              {activeTab === "design" && (
                <div className="p-5 space-y-6 flex-1 overflow-y-auto">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Palette className="size-4 text-primary" />
                      Colores y Apariencia
                    </h4>

                    {/* Button Color */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Color del Botón</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={theme.primaryColor}
                          onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                          className="size-9 rounded-lg border border-border cursor-pointer"
                        />
                        <Input
                          value={theme.primaryColor}
                          onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                          className="h-9 text-xs font-mono uppercase"
                        />
                      </div>
                    </div>

                    {/* Background Color */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Fondo del Lienzo</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={theme.bgColor}
                          onChange={(e) => setTheme({ ...theme, bgColor: e.target.value })}
                          className="size-9 rounded-lg border border-border cursor-pointer"
                        />
                        <Input
                          value={theme.bgColor}
                          onChange={(e) => setTheme({ ...theme, bgColor: e.target.value })}
                          className="h-9 text-xs font-mono uppercase"
                        />
                      </div>
                    </div>

                    {/* Card Color */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Fondo de la Tarjeta</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={theme.cardBgColor}
                          onChange={(e) => setTheme({ ...theme, cardBgColor: e.target.value })}
                          className="size-9 rounded-lg border border-border cursor-pointer"
                        />
                        <Input
                          value={theme.cardBgColor}
                          onChange={(e) => setTheme({ ...theme, cardBgColor: e.target.value })}
                          className="h-9 text-xs font-mono uppercase"
                        />
                      </div>
                    </div>

                    {/* Button Label Text */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Texto del Botón de Envío</label>
                      <Input
                        value={theme.buttonText}
                        onChange={(e) => setTheme({ ...theme, buttonText: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>

                    {/* Border Radius */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Redondez de Bordes</label>
                      <select
                        value={theme.borderRadius}
                        onChange={(e) => setTheme({ ...theme, borderRadius: e.target.value })}
                        className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground"
                      >
                        <option value="0.25rem">Cuadrado (4px)</option>
                        <option value="0.5rem">Suave (8px)</option>
                        <option value="1rem">Redondeado (16px)</option>
                        <option value="9999px">Totalmente Redondo (Píldora)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* ========================================================================= */}
        {/* CENTER CANVAS: Interactive Live Form Preview (Desktop vs Mobile Frame)   */}
        {/* ========================================================================= */}
        <main
          className="flex-1 overflow-y-auto p-4 md:p-6 flex items-center justify-center transition-all duration-300"
          style={{ backgroundColor: theme.bgColor }}
          onClick={() => setSelectedBlockKey(null)}
        >
          {viewMode === "desktop" ? (
            /* ======================================================================= */
            /* DESKTOP CANVAS (Screenshots 2 & 3)                                      */
            /* ======================================================================= */
            <div
              className="w-full max-w-xl rounded-2xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-3 transition-all"
              style={{
                backgroundColor: theme.cardBgColor,
                fontFamily: theme.fontFamily,
                borderRadius: theme.borderRadius,
              }}
              onClick={(e) => e.stopPropagation()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                const payload = event.dataTransfer.getData("application/x-new-form-block")
                if (payload) { const { type, label } = JSON.parse(payload); addBlock(type, label) }
              }}
            >
              {blocks.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                  Haz clic en los bloques de la izquierda para agregarlos a tu formulario.
                </div>
              ) : (
                blocks.map((block) => {
                  const isSelected = selectedBlockKey === block.key
                  return (
                    <div
                      key={block.key}
                      draggable
                      onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("application/x-form-block", block.key); setDraggedKey(block.key) }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => { event.preventDefault(); const key = event.dataTransfer.getData("application/x-form-block"); if (key) moveBlock(key, block.key); setDraggedKey(null) }}
                      onDragEnd={() => setDraggedKey(null)}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedBlockKey(block.key)
                      }}
                      className={`relative group rounded-xl py-1.5 px-3 transition-all cursor-pointer ${draggedKey === block.key ? "opacity-40 " : ""}${isSelected
                        ? "border-2 border-cyan-500 bg-cyan-50/10 shadow-xs"
                        : "border-2 border-transparent hover:border-slate-200"
                        }`}
                    >
                      {/* Floating Delete Trash Button (Screenshot 5) */}
                      {isSelected && (
                        <button
                          onClick={(e) => deleteBlock(block.key, e)}
                          title="Eliminar este elemento"
                          className="absolute -top-2.5 -right-2.5 size-5 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md transition-transform hover:scale-110 z-10"
                        >
                          <Trash2 className="size-2.5" />
                        </button>
                      )}

                      {/* Render block based on type */}
                      {renderCanvasBlock(block, theme)}
                    </div>
                  )
                })
              )}

              {/* Submit Button */}
              <div className="pt-1.5">
                <button
                  type="button"
                  style={{
                    backgroundColor: theme.primaryColor,
                    color: theme.buttonTextColor,
                    borderRadius: theme.borderRadius,
                  }}
                  className="w-full py-2.5 px-5 font-bold text-xs uppercase tracking-wider shadow-sm hover:opacity-90 transition-opacity"
                >
                  {theme.buttonText}
                </button>
              </div>
            </div>
          ) : (
            /* ======================================================================= */
            /* MOBILE PHONE MOCKUP CANVAS (Screenshot 4)                               */
            /* ======================================================================= */
            <div
              className="relative w-[320px] sm:w-[360px] h-[680px] rounded-[44px] bg-slate-900 border-[8px] border-slate-800 shadow-2xl p-3 flex flex-col justify-between overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Phone Top Notch / Speaker */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-4 bg-slate-900 rounded-b-xl z-30 flex items-center justify-center">
                <div className="size-1.5 rounded-full bg-slate-800 mr-2" />
                <div className="w-10 h-0.5 rounded-full bg-slate-700" />
              </div>

              {/* Phone Inner Screen (Scrollable) */}
              <div
                className="w-full h-full rounded-[32px] overflow-y-auto p-4 pt-6 space-y-2 text-left select-none"
                style={{
                  backgroundColor: theme.cardBgColor,
                  fontFamily: theme.fontFamily,
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  const payload = event.dataTransfer.getData("application/x-new-form-block")
                  if (payload) { const { type, label } = JSON.parse(payload); addBlock(type, label) }
                }}
              >
                {blocks.map((block) => {
                  const isSelected = selectedBlockKey === block.key
                  return (
                    <div
                      key={block.key}
                      draggable
                      onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("application/x-form-block", block.key); setDraggedKey(block.key) }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => { event.preventDefault(); const key = event.dataTransfer.getData("application/x-form-block"); if (key) moveBlock(key, block.key); setDraggedKey(null) }}
                      onDragEnd={() => setDraggedKey(null)}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedBlockKey(block.key)
                      }}
                      className={`relative group rounded-lg py-1 px-2 transition-all cursor-pointer ${draggedKey === block.key ? "opacity-40 " : ""}${isSelected
                        ? "border-2 border-cyan-500 bg-cyan-50/10"
                        : "border-2 border-transparent hover:border-slate-200"
                        }`}
                    >
                      {isSelected && (
                        <button
                          onClick={(e) => deleteBlock(block.key, e)}
                          className="absolute -top-2 -right-2 size-4.5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md"
                        >
                          <Trash2 className="size-2" />
                        </button>
                      )}
                      {renderCanvasBlock(block, theme, true)}
                    </div>
                  )
                })}

                {/* Mobile Submit Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    style={{
                      backgroundColor: theme.primaryColor,
                      color: theme.buttonTextColor,
                      borderRadius: theme.borderRadius,
                    }}
                    className="w-full py-2.5 px-4 font-bold text-xs uppercase tracking-wider shadow-sm"
                  >
                    {theme.buttonText}
                  </button>
                </div>
              </div>

              {/* Phone Bottom Home Bar */}
              <div className="w-24 h-1 bg-white/40 rounded-full mx-auto my-1" />
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: Form Configuration Settings Modal (Matching Screenshot 2)        */}
      {/* ========================================================================= */}
      <Dialog open={openSettingsModal} onOpenChange={setOpenSettingsModal}>
        <DialogContent className="sm:max-w-[550px] p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Configuración del Formulario
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Nombre del formulario *
              </label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Nombre del formulario"
                className="h-10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Finalidad</label>
                <select value={formPurpose} onChange={(e) => setFormPurpose(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground">
                  <option value="MAIN">Registro principal</option><option value="PARTICIPANT">Participantes</option><option value="WAITLIST">Lista de espera</option><option value="OTHER">Otro</option>
                </select>
              </div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-foreground">Cupo máximo</label><Input type="number" min="1" value={maxSubmissions} onChange={(e) => setMaxSubmissions(e.target.value)} placeholder="Sin límite" className="h-10 rounded-xl" /></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-foreground">Abre el</label><Input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className="h-10 rounded-xl" /></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-foreground">Cierra el</label><Input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className="h-10 rounded-xl" /></div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Enlace público (slug) *
              </label>
              <Input
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder="slug-del-formulario"
                className="h-10 rounded-xl font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Estado del Formulario
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground"
              >
                <option value="DRAFT">Borrador (DRAFT)</option>
                <option value="PUBLISHED">Publicado (PUBLISHED)</option>
                <option value="PAUSED">Pausado (PAUSED)</option>
                <option value="ARCHIVED">Archivado (ARCHIVED)</option>
              </select>
            </div>

            <div className="space-y-1.5 border-t border-border/60 pt-4">
              <div>
                <label className="text-xs font-semibold text-foreground">Correo de bienvenida</label>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Se enviará inmediatamente después de una inscripción válida. La plantilla sigue siendo reutilizable y editable desde Plantillas.</p>
              </div>
              <select value={welcomeTemplateId} onChange={(e) => setWelcomeTemplateId(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground">
                <option value="">No enviar correo automático</option>
                {emailTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}{template.status !== "ACTIVE" ? " (se activará al guardar)" : ""}{template.subject ? ` — ${template.subject}` : ""}</option>)}
              </select>
              {!emailTemplates.length && <p className="text-xs text-amber-600 dark:text-amber-400">No hay plantillas de email activas para esta institución.</p>}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
              <Button
                variant="outline"
                onClick={() => setOpenSettingsModal(false)}
                className="rounded-xl h-9"
              >
                Cerrar
              </Button>
              <Button
                onClick={() => {
                  handleSave()
                  setOpenSettingsModal(false)
                }}
                className="rounded-xl h-9 font-semibold bg-neutral-900 text-white hover:bg-neutral-800"
              >
                Guardar cambios
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper component to render each individual block preview inside canvas
function renderCanvasBlock(block: FormBlock, theme: FormTheme, isMobile = false) {
  const showLabel = block.options?.showLabel !== false
  const showPlaceholder = block.options?.showPlaceholder !== false
  const showHelpText = block.options?.showHelpText !== false

  switch (block.type) {
    case "header":
      return (
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight text-left">
          {block.options?.text || block.label || "Título"}
        </h2>
      )

    case "paragraph":
      return (
        <p className="text-xs sm:text-sm text-slate-600 leading-normal text-left">
          {block.options?.text || block.label}
        </p>
      )

    case "image":
      return (
        <div className="rounded-xl overflow-hidden border border-slate-200">
          <img
            src={block.options?.imageUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60"}
            alt={block.options?.imageAlt || "Banner"}
            className="w-full h-36 sm:h-44 object-cover"
          />
        </div>
      )

    case "divider":
      return <hr className="border-t border-slate-200 my-1" />

    case "phone":
    case "sms":
      return (
        <div className="space-y-1 text-left">
          {showLabel && (
            <label className="text-xs sm:text-sm font-semibold text-slate-900 flex items-center gap-1">
              {block.label}
              {block.required && <span className="text-rose-500 font-bold">*</span>}
            </label>
          )}

          {/* SMS / Phone Input with Country selector (Screenshot 5) */}
          <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden shadow-2xs">
            {/* Country flag dropdown */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-r border-slate-200 bg-slate-50/70 shrink-0">
              <span className="text-base">🇵🇪</span>
              <ChevronDown className="size-3 text-slate-500" />
            </div>

            {/* Country code */}
            <span className="px-2 text-xs text-slate-600 font-medium border-r border-slate-200 bg-slate-50/30">
              +51
            </span>

            {/* Phone text input */}
            <input
              type="tel"
              placeholder={showPlaceholder ? block.options?.placeholder || "SMS" : ""}
              disabled
              className="flex-1 px-3 py-1.5 text-xs sm:text-sm text-slate-800 bg-transparent placeholder:text-slate-400 focus:outline-hidden disabled:bg-transparent"
            />

            {/* Helper question mark circle icon */}
            <div className="px-2.5 text-cyan-600">
              <HelpCircle className="size-3.5" />
            </div>
          </div>

          {showHelpText && block.options?.helpText && (
            <p className="text-[11px] text-slate-500 mt-0.5">{block.options.helpText}</p>
          )}
        </div>
      )

    case "radio":
      return (
        <div className="space-y-1.5 text-left">
          {showLabel && (
            <label className="text-xs sm:text-sm font-semibold text-slate-900 flex items-center gap-1">
              {block.label}
              {block.required && <span className="text-rose-500 font-bold">*</span>}
            </label>
          )}
          <div className="space-y-1">
            {(block.options?.choices || ["Opción 1", "Opción 2"]).map((choice, i) => (
              <label key={i} className="flex items-center gap-2 text-xs text-slate-700">
                <input type="radio" name={block.key} disabled className="size-3.5 accent-primary" />
                <span>{choice}</span>
              </label>
            ))}
          </div>
        </div>
      )

    case "checkbox":
    case "terms":
    case "privacy":
      return (
        <label className="flex items-start gap-2 text-xs text-slate-700 text-left cursor-pointer py-0.5">
          <input type="checkbox" disabled className="size-3.5 mt-0.5 rounded accent-primary shrink-0" />
          <span className="leading-snug">
            {block.label}
            {block.required && <span className="text-rose-500 ml-0.5 font-bold">*</span>}
          </span>
        </label>
      )

    case "multiple":
      return (
        <div className="space-y-1.5 text-left">
          {showLabel && (
            <label className="text-xs sm:text-sm font-semibold text-slate-900 flex items-center gap-1">
              {block.label}
              {block.required && <span className="text-rose-500 font-bold">*</span>}
            </label>
          )}
          <div className="space-y-1">
            {(block.options?.choices || ["Opción A", "Opción B"]).map((choice, i) => (
              <label key={i} className="flex items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" disabled className="size-3.5 rounded accent-primary" />
                <span>{choice}</span>
              </label>
            ))}
          </div>
        </div>
      )

    case "captcha":
      return (
        <div className="p-2.5 border border-slate-300 rounded-lg bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <input type="checkbox" disabled className="size-4 rounded" />
            <span className="text-xs font-medium text-slate-700">No soy un robot</span>
          </div>
          <div className="text-right text-[10px] text-slate-400">
            <span className="font-bold text-blue-600 block">reCAPTCHA</span>
            <span>Privacidad - Términos</span>
          </div>
        </div>
      )

    default:
      // Text / Email / Standard Input
      return (
        <div className="space-y-1 text-left">
          {showLabel && (
            <label className="text-xs sm:text-sm font-semibold text-slate-900 flex items-center gap-1">
              {block.label}
              {block.required && <span className="text-rose-500 font-bold">*</span>}
            </label>
          )}
          <input
            type={block.type === "email" ? "email" : "text"}
            placeholder={showPlaceholder ? block.options?.placeholder || "Escribe aquí..." : ""}
            disabled
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white placeholder:text-slate-400 text-slate-800 disabled:bg-white shadow-2xs"
          />
          {showHelpText && block.options?.helpText && (
            <p className="text-[11px] text-slate-500 mt-0.5">{block.options.helpText}</p>
          )}
        </div>
      )
  }
}
