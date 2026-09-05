import { useEffect, useState, useMemo, useRef, type CSSProperties, type ElementType } from "react"
import { createPortal } from "react-dom"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Smartphone,
  Monitor,
  Heading,
  Type,
  ImageIcon,
  Minus,
  Trash2,
  Sparkles,
  Palette,
  Save,
  ChevronLeft,
  Play,
  Share2,
  Code2,
  ShoppingBag,
  Menu,
  MousePointer,
  Send,
  Eye,
  Layers,
  Copy,
  Search,
  Plus,
  Braces,
  UserRound,
  CalendarDays,
  Ticket,
  Settings2,
  ChevronRight,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Smile,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  EMAIL_SECTIONS,
  EMAIL_SECTION_CATEGORIES,
  createBlocksFromSection,
  type EmailSectionTemplate,
} from "./emailSections"

export interface EmailBlock {
  id: string
  type:
  | "heading"
  | "text"
  | "image"
  | "video"
  | "button"
  | "dynamic"
  | "logo"
  | "social"
  | "html"
  | "divider"
  | "product"
  | "navigation"
  label: string
  options?: Record<string, any>
}

export interface EmailTheme {
  bgColor: string
  cardBgColor: string
  primaryColor: string
  textColor: string
  fontFamily: string
  maxWidth: number
  borderRadius: string
}

const DEFAULT_THEME: EmailTheme = {
  bgColor: "#f8fafc",
  cardBgColor: "#ffffff",
  primaryColor: "#009245",
  textColor: "#1e293b",
  fontFamily: "Inter, sans-serif",
  maxWidth: 600,
  borderRadius: "8px",
}

export const AVAILABLE_VARIABLES = [
  { key: "first_name", label: "Nombre", category: "Datos de contacto", description: "Nombre con el que se registró la persona" },
  { key: "last_name", label: "Apellidos", category: "Datos de contacto", description: "Apellidos de la persona registrada" },
  { key: "email", label: "Correo electrónico", category: "Datos de contacto", description: "Correo de contacto" },
  { key: "event_name", label: "Nombre del evento", category: "Datos del evento", description: "Evento que activa la automatización" },
  { key: "event_start_date", label: "Fecha del evento", category: "Datos del evento", description: "Fecha y hora configurada para el evento" },
  { key: "event_location", label: "Ubicación", category: "Datos del evento", description: "Lugar o enlace del evento" },
  { key: "registration_code", label: "Código de registro", category: "Registro", description: "Código único de la inscripción" },
  { key: "whatsapp_community_url", label: "Enlace de WhatsApp", category: "Automatización", description: "URL configurada para la comunidad" },
  { key: "offer_url", label: "URL de oferta", category: "Automatización", description: "Enlace de conversión de la automatización" },
  { key: "discount_code", label: "Código de beneficio", category: "Automatización", description: "Código promocional vigente" },
  { key: "unsubscribe_url", label: "Enlace de baja", category: "Automatización", description: "Enlace para cancelar suscripción" },
]
type AvailableVariable = (typeof AVAILABLE_VARIABLES)[number]

export function formatTextWithVariables(raw: string): string {
  if (!raw) return ""
  const withLineBreaks = raw.replace(/\n/g, "<br/>")
  return withLineBreaks.replace(
    /{{\s*([\w.]+)\s*}}/g,
    `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md bg-violet-50 dark:bg-violet-950/50 text-violet-800 dark:text-violet-300 font-mono text-[0.82em] font-medium border border-violet-200 dark:border-violet-800 select-none align-baseline tracking-normal" title="Variable dinámica: $1"><span class="opacity-60 text-[0.75em] font-mono">{ }</span><span>$1</span></span>`
  )
}

function VariableChipsBar({
  onInsert,
  currentValue = "",
  variables,
}: {
  onInsert: (varKey: string) => void
  currentValue?: string
  variables: AvailableVariable[]
}) {
  const detectedVariables = useMemo(() => {
    const matches = Array.from(currentValue.matchAll(/{{\s*([\w.]+)\s*}}/g))
    return Array.from(new Set(matches.map((m) => m[1])))
  }, [currentValue])

  return <VariablePicker onInsert={onInsert} detectedVariables={detectedVariables} variables={variables} />
}

function VariablePicker({ onInsert, detectedVariables, variables }: { onInsert: (key: string) => void; detectedVariables: string[]; variables: AvailableVariable[] }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string | null>(null)
  const [customKey, setCustomKey] = useState("")
  const groups = Array.from(new Set(variables.map((item) => item.category)))
  const filtered = variables.filter((item) => (!category || item.category === category) && `${item.label} ${item.key} ${item.description}`.toLowerCase().includes(query.toLowerCase()))
  const choose = (key: string) => { onInsert(key); setOpen(false); setQuery(""); setCategory(null) }
  const toggle = () => { const rect = triggerRef.current?.getBoundingClientRect(); if (rect) setMenuPosition({ top: rect.bottom + 8, left: rect.left }); setOpen((value) => !value) }
  const icons: Record<string, ElementType> = { "Datos de contacto": UserRound, "Datos del evento": CalendarDays, Registro: Ticket, Automatización: Settings2 }

  return (
    <div className="relative pt-2">
      <div className="flex items-center gap-2">
        <button ref={triggerRef} type="button" onClick={toggle} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-violet-200 bg-background px-2.5 text-xs font-medium text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/40">
          <Braces className="size-3.5" /> Añadir variable
        </button>
        <span className="text-[11px] text-muted-foreground">Personaliza cada envío sin duplicar plantillas.</span>
      </div>
      {open && createPortal(
        <div className="fixed z-[100] w-[340px] overflow-hidden rounded-lg border border-border bg-popover" style={{ top: menuPosition.top, left: Math.min(menuPosition.left, window.innerWidth - 356) }}>
          <div className="border-b border-border p-3">
            <div className="flex h-9 items-center gap-2 rounded-md border border-input px-2.5 focus-within:border-violet-500">
              <Search className="size-4 text-muted-foreground" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar una variable" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
              {query && <button type="button" onClick={() => setQuery("")} className="text-muted-foreground"><X className="size-3.5" /></button>}
            </div>
          </div>
          {!category ? <div className="py-1">
            {groups.map((group) => { const Icon = icons[group] || Braces; const count = variables.filter((item) => item.category === group && `${item.label} ${item.key}`.toLowerCase().includes(query.toLowerCase())).length; if (query && count === 0) return null; return <button key={group} type="button" onClick={() => setCategory(group)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"><Icon className="size-4 text-muted-foreground" /><span className="flex-1"><span className="block text-sm font-medium">{group}</span><span className="block pt-0.5 text-xs text-muted-foreground">{group === "Datos de contacto" ? "Información de la persona registrada" : group === "Datos del evento" ? "Información del evento asociado" : group === "Registro" ? "Datos únicos de la inscripción" : "Enlaces y código configurados"}</span></span><ChevronRight className="size-4 text-muted-foreground" /></button> })}
            <div className="mx-3 my-2 border-t border-border" />
            <div className="px-4 pb-3"><p className="mb-2 text-xs text-muted-foreground">Variable personalizada</p><div className="flex gap-2"><Input value={customKey} onChange={(event) => setCustomKey(event.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase())} placeholder="ej. sede_evento" className="h-8 text-xs" /><Button type="button" size="sm" variant="outline" className="h-8 text-xs font-medium" disabled={!customKey} onClick={() => choose(`custom.${customKey}`)}>Insertar</Button></div><p className="mt-1.5 text-[11px] text-muted-foreground">Configúrala después en la automatización.</p></div>
          </div> : <div className="py-1">
            <button type="button" onClick={() => setCategory(null)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Atrás</button>
            {filtered.map((item) => <button key={item.key} type="button" onClick={() => choose(item.key)} className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-muted/50"><Braces className="mt-0.5 size-4 text-violet-600" /><span><span className="block text-sm font-medium">{item.label}</span><span className="block pt-0.5 font-mono text-[11px] text-muted-foreground">{`{{ ${item.key} }}`}</span><span className="block pt-0.5 text-xs text-muted-foreground">{item.description}</span></span></button>)}
            {filtered.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">No encontramos variables.</p>}
          </div>}
        </div>, document.body
      )}
      {detectedVariables.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-1.5"><span className="text-[11px] text-muted-foreground">En uso:</span>{detectedVariables.map((key) => <span key={key} className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">{`{{ ${key} }}`}</span>)}</div>}
    </div>
  )
}

export function EmailTemplateBuilderPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSavedTime, setLastSavedTime] = useState<string>("Reciente")

  // Template State
  const [templateName, setTemplateName] = useState("Nueva plantilla")
  const [subject, setSubject] = useState("")
  const [previewText, setPreviewText] = useState("")
  const [senderEmail, setSenderEmail] = useState("")
  const [senderName, setSenderName] = useState("Organización")
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "DRAFT">("DRAFT")

  // Canvas View Mode (Desktop vs Mobile)
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop")

  // Left Sidebar Mode: "content" (blocks/sections) | "style" (theme)
  const [sidebarMode, setSidebarMode] = useState<"content" | "style">("content")
  const [contentTab, setContentTab] = useState<"blocks" | "sections">("sections")

  // Sections search and category filters
  const [sectionCategory, setSectionCategory] = useState<string>("all")
  const [sectionSearch, setSectionSearch] = useState<string>("")

  // Blocks & Selection State
  const [blocks, setBlocks] = useState<EmailBlock[]>([])
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null)
  const [theme, setTheme] = useState<EmailTheme>(DEFAULT_THEME)
  const [availableVariables, setAvailableVariables] = useState<AvailableVariable[]>(AVAILABLE_VARIABLES)

  // Undo / Redo History
  const [history, setHistory] = useState<EmailBlock[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Preview & Test Modal
  const [openPreviewModal, setOpenPreviewModal] = useState(false)
  const [testEmail, setTestEmail] = useState("")

  // Push history on block changes
  const recordHistory = (newBlocks: EmailBlock[]) => {
    const updatedHistory = history.slice(0, historyIndex + 1)
    updatedHistory.push(newBlocks)
    setHistory(updatedHistory)
    setHistoryIndex(updatedHistory.length - 1)
  }

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1)
      setBlocks(history[historyIndex - 1])
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1)
      setBlocks(history[historyIndex + 1])
    }
  }

  // Filtered Sections
  const filteredSections = useMemo(() => {
    return EMAIL_SECTIONS.filter((s) => {
      const matchCat = sectionCategory === "all" || s.category === sectionCategory
      const matchQuery =
        !sectionSearch.trim() ||
        s.name.toLowerCase().includes(sectionSearch.toLowerCase()) ||
        s.description.toLowerCase().includes(sectionSearch.toLowerCase()) ||
        (s.badgeText && s.badgeText.toLowerCase().includes(sectionSearch.toLowerCase()))
      return matchCat && matchQuery
    })
  }, [sectionCategory, sectionSearch])

  // Load Template Data
  useEffect(() => {
    if (!templateId) return
    loadTemplate()
  }, [templateId])

  useEffect(() => {
    api.marketing.variables().then((items) => {
      if (items.length) setAvailableVariables(items as AvailableVariable[])
    }).catch(() => undefined)
  }, [])

  const loadTemplate = async () => {
    try {
      setLoading(true)
      const data = await api.emailTemplates.get(templateId!)
      setTemplateName(data.name || "Plantilla")
      setSubject(data.subject || "")
      setPreviewText(data.previewText || "")
      setSenderEmail(data.senderEmail || "")
      setSenderName(data.senderName || data.organization?.name || "Organización")
      setStatus(data.status || "DRAFT")

      let initialBlocks: EmailBlock[] = []
      if (Array.isArray(data.content) && data.content.length > 0) {
        initialBlocks = data.content
      } else {
        // Default starter blocks
        initialBlocks = [
          {
            id: `logo-${Date.now()}`,
            type: "logo",
            label: "Cabecera HubSpot",
            options: {
              text: "HubSpot",
              align: "center",
              bgColor: "#FF7A59",
              textColor: "#ffffff",
              isBanner: true,
              paddingY: 16,
            },
          },
          {
            id: `head-${Date.now()}`,
            type: "heading",
            label: "Titular Principal",
            options: {
              text: "Please confirm your email address",
              align: "center",
              level: 1,
              color: "#1e293b",
              fontSize: 26,
            },
          },
          {
            id: `txt-${Date.now()}`,
            type: "text",
            label: "Mensaje",
            options: {
              text: "Thanks for signing up to HubSpot. We're happy to have you.\nPlease take a second to make sure we have your correct email address.",
              align: "center",
              color: "#475569",
              fontSize: 14,
            },
          },
          {
            id: `btn-${Date.now()}`,
            type: "button",
            label: "Confirmar",
            options: {
              text: "Confirm your email address",
              url: "https://ejemplo.com/confirm",
              align: "center",
              bgColor: "#33475B",
              textColor: "#ffffff",
              borderRadius: 6,
            },
          },
        ]
      }

      setBlocks(initialBlocks)
      setHistory([initialBlocks])
      setHistoryIndex(0)
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      setLastSavedTime(timeStr)
    } catch (err: any) {
      toast.error(err?.message || "Error al cargar la plantilla.")
    } finally {
      setLoading(false)
    }
  }

  // Add block from palette
  const addBlock = (type: EmailBlock["type"], label: string) => {
    let defaultOptions: Record<string, any> = {}

    switch (type) {
      case "heading":
        defaultOptions = { text: "Nuevo Título Principal", align: "left", level: 1, color: "#0f172a", fontSize: 24 }
        break
      case "text":
        defaultOptions = {
          text: "Escribe aquí el contenido de tu correo. Puedes usar variables personalizadas como {{ contact.FIRSTNAME }}.",
          align: "left",
          color: "#334155",
          fontSize: 14,
        }
        break
      case "image":
        defaultOptions = {
          imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80",
          alt: "Banner",
          align: "center",
        }
        break
      case "video":
        defaultOptions = {
          videoUrl: "https://youtube.com",
          thumbnailUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80",
          title: "Ver Video Informativo",
        }
        break
      case "button":
        defaultOptions = {
          text: "Confirmar Asistencia",
          url: "https://ejemplo.com",
          align: "center",
          bgColor: theme.primaryColor,
          textColor: "#ffffff",
          borderRadius: 8,
        }
        break
      case "dynamic":
        defaultOptions = { variable: "contact.FIRSTNAME", fallback: "Estimado/a asistente" }
        break
      case "logo":
        defaultOptions = { text: "Logo", align: "center", width: 140 }
        break
      case "social":
        defaultOptions = {
          align: "center",
          networks: [
            { name: "facebook", url: "https://facebook.com" },
            { name: "instagram", url: "https://instagram.com" },
            { name: "linkedin", url: "https://linkedin.com" },
            { name: "twitter", url: "https://x.com" },
          ],
        }
        break
      case "html":
        defaultOptions = { html: "<div style='padding: 10px; text-align: center;'>Código HTML personalizado</div>" }
        break
      case "divider":
        defaultOptions = { color: "#e2e8f0", height: 1, marginY: 20 }
        break
      case "product":
        defaultOptions = {
          title: "Entrada VIP - Acceso Total",
          price: "S/ 150.00",
          description: "Acceso preferencial a todas las sesiones y networking.",
          imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80",
          buttonText: "Comprar Entrada",
          buttonUrl: "https://ejemplo.com/tickets",
        }
        break
      case "navigation":
        defaultOptions = {
          links: [
            { label: "Inicio", url: "#" },
            { label: "Agenda", url: "#" },
            { label: "Ponentes", url: "#" },
            { label: "Contacto", url: "#" },
          ],
        }
        break
    }

    const newBlock: EmailBlock = {
      id: `blk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      label,
      options: defaultOptions,
    }

    const updated = [...blocks, newBlock]
    setBlocks(updated)
    setSelectedBlockId(newBlock.id)
    recordHistory(updated)
    toast.success(`Bloque "${label}" añadido`)
  }

  // Add full multi-block section
  const addSection = (section: EmailSectionTemplate) => {
    const newBlocks = createBlocksFromSection(section)
    const updated = [...blocks, ...newBlocks]
    setBlocks(updated)
    if (newBlocks.length > 0) {
      setSelectedBlockId(newBlocks[0].id)
    }
    recordHistory(updated)
    toast.success(`Sección "${section.name}" añadida (${newBlocks.length} bloques)`)
  }

  // Update selected block options
  const updateSelectedBlock = (updates: Partial<EmailBlock>) => {
    if (!selectedBlockId) return
    const updated = blocks.map((b) => (b.id === selectedBlockId ? { ...b, ...updates } : b))
    setBlocks(updated)
    recordHistory(updated)
  }

  // Duplicate block
  const duplicateBlock = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const index = blocks.findIndex((b) => b.id === id)
    if (index === -1) return
    const blockToClone = blocks[index]
    const cloned: EmailBlock = {
      ...blockToClone,
      id: `blk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      options: JSON.parse(JSON.stringify(blockToClone.options || {})),
    }
    const updated = [...blocks]
    updated.splice(index + 1, 0, cloned)
    setBlocks(updated)
    setSelectedBlockId(cloned.id)
    recordHistory(updated)
    toast.success("Bloque duplicado.")
  }

  // Delete block
  const deleteBlock = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const updated = blocks.filter((b) => b.id !== id)
    setBlocks(updated)
    if (selectedBlockId === id) setSelectedBlockId(null)
    recordHistory(updated)
    toast.info("Bloque eliminado.")
  }

  // Save changes
  const handleSave = async (exitAfter = false) => {
    if (!templateId) return
    try {
      setSaving(true)
      const payload = {
        name: templateName,
        subject,
        previewText,
        senderEmail,
        senderName,
        status,
        content: blocks,
      }

      await api.emailTemplates.update(templateId, payload)
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      setLastSavedTime(timeStr)
      toast.success("Diseño de email guardado correctamente.")

      if (exitAfter) {
        navigate("/dashboard/templates")
      }
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar el diseño.")
    } finally {
      setSaving(false)
    }
  }

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedBlockId),
    [blocks, selectedBlockId]
  )

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Cargando editor de email…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-full bg-slate-100 dark:bg-zinc-950 select-none overflow-hidden font-sans">
      {/* ========================================================================= */}
      {/* TOP NAVBAR: Title, Undo/Redo, Autosave, Responsive Switcher, Actions       */}
      {/* ========================================================================= */}
      <header className="h-16 border-b border-border/80 bg-white dark:bg-zinc-900 px-5 flex items-center justify-between z-30 shrink-0 shadow-xs">
        {/* Left: Brand Icon + Editable Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard/templates")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mr-1 cursor-pointer"
            title="Volver a plantillas"
          >
            <ArrowLeft className="size-4" />
          </button>

          <span className="text-sm font-bold text-foreground truncate max-w-[200px] sm:max-w-xs">
            {templateName}
          </span>
        </div>

        {/* Center: Undo/Redo + Autosave Timestamp + Desktop/Mobile Switcher */}
        <div className="flex items-center gap-5">
          {/* Undo / Redo */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Deshacer"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors cursor-pointer"
            >
              <Undo2 className="size-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Rehacer"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors cursor-pointer"
            >
              <Redo2 className="size-4" />
            </button>
          </div>

          {/* Last Saved Status */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Guardado por última vez el {lastSavedTime}</span>
          </div>

          {/* Desktop / Mobile Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-zinc-800 p-1 rounded-full border border-slate-200 dark:border-zinc-700">
            <button
              onClick={() => setViewMode("desktop")}
              title="Vista de escritorio"
              className={`p-1.5 rounded-full transition-all flex items-center justify-center cursor-pointer ${viewMode === "desktop"
                ? "bg-white dark:bg-zinc-900 text-primary shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Monitor className="size-4" />
            </button>
            <button
              onClick={() => setViewMode("mobile")}
              title="Vista móvil"
              className={`p-1.5 rounded-full transition-all flex items-center justify-center cursor-pointer ${viewMode === "mobile"
                ? "bg-white dark:bg-zinc-900 text-primary shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Smartphone className="size-4" />
            </button>
          </div>
        </div>

        {/* Right Actions: Preview and Save & Exit */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenPreviewModal(true)}
            className="rounded-xl h-9 px-4 font-semibold text-xs border-border flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="size-3.5 text-muted-foreground" />
            <span>Vista previa y prueba</span>
          </Button>

          <Button
            size="sm"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="rounded-xl h-9 px-5 font-semibold text-xs bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-primary dark:text-primary-foreground shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="size-3.5" />
            <span>{saving ? "Guardando..." : "Guardar y salir"}</span>
          </Button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN BUILDER AREA: Left Sidebar + Center Canvas                           */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* ======================================================================= */}
        {/* NARROW ICON BAR (Contenido | Estilo)                                    */}
        {/* ======================================================================= */}
        <div className="w-16 border-r border-border/80 bg-white dark:bg-zinc-900 flex flex-col items-center py-4 space-y-4 shrink-0">
          <button
            onClick={() => {
              setSidebarMode("content")
              setSelectedBlockId(null)
            }}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold p-2 rounded-xl transition-all cursor-pointer ${sidebarMode === "content"
              ? "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
          >
            <Layers className="size-5" />
            <span>Contenido</span>
          </button>

          <button
            onClick={() => setSidebarMode("style")}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold p-2 rounded-xl transition-all cursor-pointer ${sidebarMode === "style"
              ? "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
          >
            <Palette className="size-5" />
            <span>Estilo</span>
          </button>
        </div>

        {/* ======================================================================= */}
        {/* LEFT PALETTE / INSPECTOR SIDEBAR                                        */}
        {/* ======================================================================= */}
        <aside className="w-84 border-r border-border/80 bg-white dark:bg-zinc-900 flex flex-col shrink-0 overflow-hidden">
          {sidebarMode === "style" ? (
            /* Style Settings */
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Palette className="size-4 text-primary" />
                Estilo Global del Email
              </h3>

              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Color de Fondo Exterior</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.bgColor}
                      onChange={(e) => setTheme({ ...theme, bgColor: e.target.value })}
                      className="size-8 rounded-lg border cursor-pointer"
                    />
                    <Input
                      value={theme.bgColor}
                      onChange={(e) => setTheme({ ...theme, bgColor: e.target.value })}
                      className="h-8 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Color de Fondo del Contenedor</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.cardBgColor}
                      onChange={(e) => setTheme({ ...theme, cardBgColor: e.target.value })}
                      className="size-8 rounded-lg border cursor-pointer"
                    />
                    <Input
                      value={theme.cardBgColor}
                      onChange={(e) => setTheme({ ...theme, cardBgColor: e.target.value })}
                      className="h-8 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Color Primario (Botones)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.primaryColor}
                      onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                      className="size-8 rounded-lg border cursor-pointer"
                    />
                    <Input
                      value={theme.primaryColor}
                      onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                      className="h-8 text-xs font-mono uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : selectedBlock ? (
            /* Selected Block Inspector */
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <button
                  onClick={() => setSelectedBlockId(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  <ChevronLeft className="size-4" />
                  <span>Volver a la lista</span>
                </button>
                <button
                  onClick={(e) => deleteBlock(selectedBlock.id, e)}
                  title="Eliminar bloque"
                  className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Propiedades del Bloque ({selectedBlock.label})
              </h4>

              {/* Dynamic options based on block type */}
              <div className="space-y-4">
                {selectedBlock.type === "heading" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Texto del Titular</label>
                      <textarea
                        value={selectedBlock.options?.text || ""}
                        onChange={(e) =>
                          updateSelectedBlock({ options: { ...selectedBlock.options, text: e.target.value } })
                        }
                        rows={2}
                        placeholder="Ej. ¡Bienvenido {{ contact.FIRSTNAME }}!"
                        className="w-full text-xs rounded-xl border border-border bg-background p-2.5 resize-none font-mono"
                      />
                      <VariableChipsBar
                        currentValue={selectedBlock.options?.text || ""}
                        variables={availableVariables}
                        onInsert={(varKey) => {
                          const curr = selectedBlock.options?.text || ""
                          const space = curr.length > 0 && !curr.endsWith(" ") ? " " : ""
                          updateSelectedBlock({
                            options: { ...selectedBlock.options, text: `${curr}${space}{{ ${varKey} }} ` },
                          })
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Subtítulo (Opcional)</label>
                      <Input
                        value={selectedBlock.options?.subtitle || ""}
                        onChange={(e) =>
                          updateSelectedBlock({ options: { ...selectedBlock.options, subtitle: e.target.value } })
                        }
                        placeholder="Descripción secundaria..."
                        className="h-9 text-xs"
                      />
                      <VariableChipsBar
                        currentValue={selectedBlock.options?.subtitle || ""}
                        variables={availableVariables}
                        onInsert={(varKey) => {
                          const curr = selectedBlock.options?.subtitle || ""
                          const space = curr.length > 0 && !curr.endsWith(" ") ? " " : ""
                          updateSelectedBlock({
                            options: { ...selectedBlock.options, subtitle: `${curr}${space}{{ ${varKey} }} ` },
                          })
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Tamaño de Fuente (px)</label>
                      <Input
                        type="number"
                        value={selectedBlock.options?.fontSize || 24}
                        onChange={(e) =>
                          updateSelectedBlock({ options: { ...selectedBlock.options, fontSize: Number(e.target.value) } })
                        }
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Color del Texto</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedBlock.options?.color || "#0f172a"}
                          onChange={(e) =>
                            updateSelectedBlock({ options: { ...selectedBlock.options, color: e.target.value } })
                          }
                          className="size-8 rounded-lg border cursor-pointer"
                        />
                        <Input
                          value={selectedBlock.options?.color || "#0f172a"}
                          onChange={(e) =>
                            updateSelectedBlock({ options: { ...selectedBlock.options, color: e.target.value } })
                          }
                          className="h-8 text-xs font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Alineación</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["left", "center", "right"].map((align) => (
                          <Button
                            key={align}
                            size="sm"
                            variant={selectedBlock.options?.align === align ? "default" : "outline"}
                            onClick={() =>
                              updateSelectedBlock({ options: { ...selectedBlock.options, align } })
                            }
                            className="h-8 text-xs capitalize cursor-pointer"
                          >
                            {align}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {selectedBlock.type === "text" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Contenido del Texto (Soporta HTML)</label>
                      <textarea
                        value={selectedBlock.options?.text || ""}
                        onChange={(e) =>
                          updateSelectedBlock({ options: { ...selectedBlock.options, text: e.target.value } })
                        }
                        rows={6}
                        placeholder="Escribe tu mensaje aquí..."
                        className="w-full text-xs rounded-xl border border-border bg-background p-3 focus:outline-hidden focus:ring-2 focus:ring-primary resize-none font-mono"
                      />
                      <VariableChipsBar
                        currentValue={selectedBlock.options?.text || ""}
                        variables={availableVariables}
                        onInsert={(varKey) => {
                          const curr = selectedBlock.options?.text || ""
                          const space = curr.length > 0 && !curr.endsWith(" ") ? " " : ""
                          updateSelectedBlock({
                            options: { ...selectedBlock.options, text: `${curr}${space}{{ ${varKey} }} ` },
                          })
                        }}
                      />
                      <p className="text-[10px] text-muted-foreground pt-1">Puedes usar tags HTML como <code>&lt;strong&gt;</code>, <code>&lt;a&gt;</code>, <code>&lt;br/&gt;</code> o viñetas <code>•</code>.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Alineación</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["left", "center", "right"].map((align) => (
                          <Button
                            key={align}
                            size="sm"
                            variant={selectedBlock.options?.align === align ? "default" : "outline"}
                            onClick={() =>
                              updateSelectedBlock({ options: { ...selectedBlock.options, align } })
                            }
                            className="h-8 text-xs capitalize cursor-pointer"
                          >
                            {align}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {selectedBlock.type === "logo" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Texto del Logotipo</label>
                      <Input
                        value={selectedBlock.options?.text || ""}
                        onChange={(e) =>
                          updateSelectedBlock({ options: { ...selectedBlock.options, text: e.target.value } })
                        }
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">URL de Imagen (Opcional)</label>
                      <Input
                        value={selectedBlock.options?.imageUrl || ""}
                        onChange={(e) =>
                          updateSelectedBlock({ options: { ...selectedBlock.options, imageUrl: e.target.value } })
                        }
                        placeholder="https://..."
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Modo Banner Completo</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isBanner"
                          checked={Boolean(selectedBlock.options?.isBanner)}
                          onChange={(e) =>
                            updateSelectedBlock({ options: { ...selectedBlock.options, isBanner: e.target.checked } })
                          }
                          className="rounded cursor-pointer"
                        />
                        <label htmlFor="isBanner" className="text-xs cursor-pointer">
                          Franja superior tipo banner (Ej. HubSpot Naranja)
                        </label>
                      </div>
                    </div>

                    {selectedBlock.options?.isBanner && (
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Color de Fondo del Banner</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={selectedBlock.options?.bgColor || "#FF7A59"}
                            onChange={(e) =>
                              updateSelectedBlock({ options: { ...selectedBlock.options, bgColor: e.target.value } })
                            }
                            className="size-8 rounded-lg border cursor-pointer"
                          />
                          <Input
                            value={selectedBlock.options?.bgColor || "#FF7A59"}
                            onChange={(e) =>
                              updateSelectedBlock({ options: { ...selectedBlock.options, bgColor: e.target.value } })
                            }
                            className="h-8 text-xs font-mono uppercase"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedBlock.type === "image" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">URL de la Imagen</label>
                      <Input
                        value={selectedBlock.options?.imageUrl || ""}
                        onChange={(e) =>
                          updateSelectedBlock({ options: { ...selectedBlock.options, imageUrl: e.target.value } })
                        }
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Texto Alternativo (Alt)</label>
                      <Input
                        value={selectedBlock.options?.alt || ""}
                        onChange={(e) =>
                          updateSelectedBlock({ options: { ...selectedBlock.options, alt: e.target.value } })
                        }
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                )}

                {selectedBlock.type === "button" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Texto del Botón</label>
                      <Input
                        value={selectedBlock.options?.text || ""}
                        onChange={(e) =>
                          updateSelectedBlock({ options: { ...selectedBlock.options, text: e.target.value } })
                        }
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Enlace de Destino (URL)</label>
                      <Input
                        value={selectedBlock.options?.url || ""}
                        onChange={(e) =>
                          updateSelectedBlock({ options: { ...selectedBlock.options, url: e.target.value } })
                        }
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Color del Botón</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedBlock.options?.bgColor || theme.primaryColor}
                          onChange={(e) =>
                            updateSelectedBlock({
                              options: { ...selectedBlock.options, bgColor: e.target.value },
                            })
                          }
                          className="size-8 rounded-lg border cursor-pointer"
                        />
                        <Input
                          value={selectedBlock.options?.bgColor || theme.primaryColor}
                          onChange={(e) =>
                            updateSelectedBlock({
                              options: { ...selectedBlock.options, bgColor: e.target.value },
                            })
                          }
                          className="h-8 text-xs font-mono uppercase"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedBlock.type === "product" && (
                  <div className="space-y-3">
                    <InspectorInput label="Título del producto" value={selectedBlock.options?.title || ""} onChange={(title) => updateSelectedBlock({ options: { ...selectedBlock.options, title } })} />
                    <InspectorInput label="Descripción" value={selectedBlock.options?.description || ""} onChange={(description) => updateSelectedBlock({ options: { ...selectedBlock.options, description } })} />
                    <InspectorInput label="Precio" value={selectedBlock.options?.price || ""} onChange={(price) => updateSelectedBlock({ options: { ...selectedBlock.options, price } })} />
                    <InspectorInput label="URL de imagen" value={selectedBlock.options?.imageUrl || ""} onChange={(imageUrl) => updateSelectedBlock({ options: { ...selectedBlock.options, imageUrl } })} placeholder="https://..." />
                    <InspectorInput label="Texto del botón" value={selectedBlock.options?.buttonText || ""} onChange={(buttonText) => updateSelectedBlock({ options: { ...selectedBlock.options, buttonText } })} />
                    <InspectorInput label="URL del botón" value={selectedBlock.options?.buttonUrl || ""} onChange={(buttonUrl) => updateSelectedBlock({ options: { ...selectedBlock.options, buttonUrl } })} placeholder="https://..." />
                  </div>
                )}

                {selectedBlock.type === "dynamic" && (
                  <div className="space-y-3">
                    <InspectorInput label="Variable" value={selectedBlock.options?.variable || ""} onChange={(variable) => updateSelectedBlock({ options: { ...selectedBlock.options, variable } })} placeholder="first_name" />
                    <VariablePicker onInsert={(variable) => updateSelectedBlock({ options: { ...selectedBlock.options, variable } })} detectedVariables={selectedBlock.options?.variable ? [selectedBlock.options.variable] : []} variables={availableVariables} />
                    <InspectorInput label="Valor alternativo" value={selectedBlock.options?.fallback || ""} onChange={(fallback) => updateSelectedBlock({ options: { ...selectedBlock.options, fallback } })} placeholder="Asistente" />
                    <p className="text-[11px] text-muted-foreground">Se enviará como <code>{`{{ ${selectedBlock.options?.variable || "first_name"} }}`}</code>. Usa el valor alternativo cuando no exista información.</p>
                  </div>
                )}

                {selectedBlock.type === "social" && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Configura los enlaces que se mostrarán en el correo.</p>
                    {(selectedBlock.options?.networks || []).map((network: any, index: number) => (
                      <div key={`${network.name}-${index}`} className="rounded-lg border border-border p-2 space-y-2">
                        <div className="flex gap-2">
                          <Input value={network.name || ""} onChange={(e) => { const networks = [...(selectedBlock.options?.networks || [])]; networks[index] = { ...network, name: e.target.value }; updateSelectedBlock({ options: { ...selectedBlock.options, networks } }) }} className="h-8 text-xs" placeholder="red" />
                          <button type="button" onClick={() => { const networks = (selectedBlock.options?.networks || []).filter((_: any, i: number) => i !== index); updateSelectedBlock({ options: { ...selectedBlock.options, networks } }) }} className="text-xs text-rose-500 px-1 cursor-pointer">Quitar</button>
                        </div>
                        <Input value={network.url || ""} onChange={(e) => { const networks = [...(selectedBlock.options?.networks || [])]; networks[index] = { ...network, url: e.target.value }; updateSelectedBlock({ options: { ...selectedBlock.options, networks } }) }} className="h-8 text-xs" placeholder="https://..." />
                      </div>
                    ))}
                    <Button type="button" size="sm" variant="outline" className="h-8 text-xs cursor-pointer" onClick={() => updateSelectedBlock({ options: { ...selectedBlock.options, networks: [...(selectedBlock.options?.networks || []), { name: "web", url: "https://" }] } })}>Añadir red</Button>
                  </div>
                )}

                {selectedBlock.type === "navigation" && (
                  <div className="space-y-3">
                    {(selectedBlock.options?.links || []).map((link: any, index: number) => (
                      <div key={`${link.label}-${index}`} className="rounded-lg border border-border p-2 space-y-2">
                        <div className="flex gap-2">
                          <Input value={link.label || ""} onChange={(e) => { const links = [...(selectedBlock.options?.links || [])]; links[index] = { ...link, label: e.target.value }; updateSelectedBlock({ options: { ...selectedBlock.options, links } }) }} className="h-8 text-xs" placeholder="Etiqueta" />
                          <button type="button" onClick={() => { const links = (selectedBlock.options?.links || []).filter((_: any, i: number) => i !== index); updateSelectedBlock({ options: { ...selectedBlock.options, links } }) }} className="text-xs text-rose-500 px-1 cursor-pointer">Quitar</button>
                        </div>
                        <Input value={link.url || ""} onChange={(e) => { const links = [...(selectedBlock.options?.links || [])]; links[index] = { ...link, url: e.target.value }; updateSelectedBlock({ options: { ...selectedBlock.options, links } }) }} className="h-8 text-xs" placeholder="https://..." />
                      </div>
                    ))}
                    <Button type="button" size="sm" variant="outline" className="h-8 text-xs cursor-pointer" onClick={() => updateSelectedBlock({ options: { ...selectedBlock.options, links: [...(selectedBlock.options?.links || []), { label: "Nuevo enlace", url: "https://" }] } })}>Añadir enlace</Button>
                  </div>
                )}

                {selectedBlock.type === "html" && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">Código HTML</label>
                    <textarea value={selectedBlock.options?.html || ""} onChange={(e) => updateSelectedBlock({ options: { ...selectedBlock.options, html: e.target.value } })} rows={10} className="w-full rounded-xl border border-border bg-background p-3 font-mono text-xs resize-y" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Subtabs: Bloques y Secciones Reutilizables */
            <div className="flex flex-col h-full overflow-hidden">
              {/* Subtabs Header */}
              <div className="grid grid-cols-2 border-b border-border/80 text-center text-xs font-semibold bg-slate-50 dark:bg-zinc-800/40 shrink-0">
                <button
                  type="button"
                  onClick={() => setContentTab("blocks")}
                  className={`py-3 border-b-2 transition-all flex items-center justify-center cursor-pointer ${contentTab === "blocks"
                    ? "border-violet-600 text-violet-600 dark:text-violet-400 font-bold bg-white dark:bg-zinc-900"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <span>Bloques</span>
                </button>
                <button
                  type="button"
                  onClick={() => setContentTab("sections")}
                  className={`py-3 border-b-2 transition-all flex items-center justify-center cursor-pointer ${contentTab === "sections"
                    ? "border-violet-600 text-violet-600 dark:text-violet-400 font-bold bg-white dark:bg-zinc-900"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <span>Secciones</span>
                </button>
              </div>

              {contentTab === "sections" ? (
                /* SECCIONES PRE-DISEÑADAS (HubSpot, WorkAngel, Universe, Hello There, Cabeceras) */
                <div className="flex flex-col h-full overflow-hidden">
                  {/* Search and Category Filters */}
                  <div className="p-3 border-b border-border/70 space-y-2 shrink-0 bg-white dark:bg-zinc-900">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                      <Input
                        value={sectionSearch}
                        onChange={(e) => setSectionSearch(e.target.value)}
                        placeholder="Buscar cabeceras, bienvenida, cta..."
                        className="pl-8 h-8 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700"
                      />
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                      {EMAIL_SECTION_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSectionCategory(cat.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all cursor-pointer ${sectionCategory === cat.id
                            ? "bg-violet-600 text-white shadow-2xs font-bold"
                            : "bg-slate-100 dark:bg-zinc-800 text-muted-foreground hover:text-foreground"
                            }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Section Cards List */}
                  <div className="p-3 flex-1 overflow-y-auto space-y-3">
                    {filteredSections.length === 0 ? (
                      <div className="p-8 text-center text-xs text-muted-foreground">
                        No se encontraron secciones para esta búsqueda.
                      </div>
                    ) : (
                      filteredSections.map((section) => (
                        <div
                          key={section.id}
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData("application/x-email-section", JSON.stringify(section))
                          }}
                          className="p-3 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:border-violet-500/80 hover:shadow-md transition-all group flex flex-col gap-2.5 cursor-grab active:cursor-grabbing"
                        >
                          {/* Card Header: Badge + Section Title */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                              {section.name}
                            </span>
                            {section.badgeText && (
                              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 shrink-0">
                                {section.badgeText}
                              </span>
                            )}
                          </div>

                          {/* Visual SVG Miniature Preview */}
                          <div
                            onClick={() => addSection(section)}
                            title="Haz clic para añadir esta sección"
                            className="rounded-xl overflow-hidden border border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-1.5 cursor-pointer group-hover:scale-[1.01] transition-transform"
                          >
                            <img
                              src={section.previewSvg}
                              alt={section.name}
                              className="w-full h-auto max-h-24 object-contain rounded-lg pointer-events-none"
                            />
                          </div>

                          {/* Description */}
                          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {section.description}
                          </p>

                          {/* Action Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addSection(section)}
                            className="h-7 w-full text-[11px] font-semibold rounded-xl border-dashed border-violet-300 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/40 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="size-3" />
                            <span>Añadir sección</span>
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                /* 12 Emerald-bordered Blocks Grid */
                <div className="p-4 flex-1 overflow-y-auto">
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* 1. Título */}
                    <button draggable onDragStart={(event) => event.dataTransfer.setData("application/x-email-block", "heading")}
                      onClick={() => addBlock("heading", "Título")}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all group bg-white dark:bg-zinc-900 shadow-2xs cursor-pointer"
                    >
                      <div className="size-9 rounded-xl border border-emerald-600 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                        <Heading className="size-5" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Título</span>
                    </button>

                    {/* 2. Texto */}
                    <button draggable onDragStart={(event) => event.dataTransfer.setData("application/x-email-block", "text")}
                      onClick={() => addBlock("text", "Texto")}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all group bg-white dark:bg-zinc-900 shadow-2xs cursor-pointer"
                    >
                      <div className="size-9 rounded-xl border border-emerald-600 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                        <Type className="size-5" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Texto</span>
                    </button>

                    {/* 3. Imagen */}
                    <button draggable onDragStart={(event) => event.dataTransfer.setData("application/x-email-block", "image")}
                      onClick={() => addBlock("image", "Imagen")}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all group bg-white dark:bg-zinc-900 shadow-2xs cursor-pointer"
                    >
                      <div className="size-9 rounded-xl border border-emerald-600 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                        <ImageIcon className="size-5" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Imagen</span>
                    </button>

                    {/* 4. Vídeo */}
                    <button draggable onDragStart={(event) => event.dataTransfer.setData("application/x-email-block", "video")}
                      onClick={() => addBlock("video", "Vídeo")}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all group bg-white dark:bg-zinc-900 shadow-2xs cursor-pointer"
                    >
                      <div className="size-9 rounded-xl border border-emerald-600 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                        <Play className="size-5" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Vídeo</span>
                    </button>

                    {/* 5. Botón */}
                    <button draggable onDragStart={(event) => event.dataTransfer.setData("application/x-email-block", "button")}
                      onClick={() => addBlock("button", "Botón")}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all group bg-white dark:bg-zinc-900 shadow-2xs cursor-pointer"
                    >
                      <div className="size-9 rounded-xl border border-emerald-600 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                        <MousePointer className="size-5" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Botón</span>
                    </button>

                    {/* 6. Contenido dinámico */}
                    <button draggable onDragStart={(event) => event.dataTransfer.setData("application/x-email-block", "dynamic")}
                      onClick={() => addBlock("dynamic", "Contenido dinámico")}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all group bg-white dark:bg-zinc-900 shadow-2xs cursor-pointer"
                    >
                      <div className="size-9 rounded-xl border border-emerald-600 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform font-mono text-sm font-bold">
                        {"{ }"}
                      </div>
                      <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 text-center leading-tight">
                        Contenido dinámico
                      </span>
                    </button>

                    {/* 7. Logotipo */}
                    <button draggable onDragStart={(event) => event.dataTransfer.setData("application/x-email-block", "logo")}
                      onClick={() => addBlock("logo", "Logotipo")}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all group bg-white dark:bg-zinc-900 shadow-2xs cursor-pointer"
                    >
                      <div className="size-9 rounded-xl border border-emerald-600 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform font-bold text-[9px]">
                        LOGO
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Logotipo</span>
                    </button>

                    {/* 8. Redes sociales */}
                    <button draggable onDragStart={(event) => event.dataTransfer.setData("application/x-email-block", "social")}
                      onClick={() => addBlock("social", "Redes sociales")}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all group bg-white dark:bg-zinc-900 shadow-2xs cursor-pointer"
                    >
                      <div className="size-9 rounded-xl border border-emerald-600 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                        <Share2 className="size-5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 text-center leading-tight">
                        Redes sociales
                      </span>
                    </button>

                    {/* 9. HTML */}
                    <button draggable onDragStart={(event) => event.dataTransfer.setData("application/x-email-block", "html")}
                      onClick={() => addBlock("html", "HTML")}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all group bg-white dark:bg-zinc-900 shadow-2xs cursor-pointer"
                    >
                      <div className="size-9 rounded-xl border border-emerald-600 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                        <Code2 className="size-5" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">HTML</span>
                    </button>

                    {/* 10. Divisor */}
                    <button draggable onDragStart={(event) => event.dataTransfer.setData("application/x-email-block", "divider")}
                      onClick={() => addBlock("divider", "Divisor")}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all group bg-white dark:bg-zinc-900 shadow-2xs cursor-pointer"
                    >
                      <div className="size-9 rounded-xl border border-emerald-600 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                        <Minus className="size-5" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Divisor</span>
                    </button>

                    {/* 11. Producto */}
                    <button draggable onDragStart={(event) => event.dataTransfer.setData("application/x-email-block", "product")}
                      onClick={() => addBlock("product", "Producto")}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all group bg-white dark:bg-zinc-900 shadow-2xs cursor-pointer"
                    >
                      <div className="size-9 rounded-xl border border-emerald-600 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                        <ShoppingBag className="size-5" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Producto</span>
                    </button>

                    {/* 12. Navegación */}
                    <button draggable onDragStart={(event) => event.dataTransfer.setData("application/x-email-block", "navigation")}
                      onClick={() => addBlock("navigation", "Navegación")}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all group bg-white dark:bg-zinc-900 shadow-2xs cursor-pointer"
                    >
                      <div className="size-9 rounded-xl border border-emerald-600 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                        <Menu className="size-5" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Navegación</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* ======================================================================= */}
        {/* CENTER EMAIL CANVAS                                                     */}
        {/* ======================================================================= */}
        <main
          className="flex-1 overflow-y-auto p-6 md:p-10 flex items-center justify-center transition-all bg-[#f1f5f9] dark:bg-zinc-950"
          style={{
            backgroundImage: `radial-gradient(#cbd5e1 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
          onClick={() => setSelectedBlockId(null)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            const sectionJson = event.dataTransfer.getData("application/x-email-section")
            if (sectionJson) {
              try {
                const sectionData = JSON.parse(sectionJson) as EmailSectionTemplate
                addSection(sectionData)
                return
              } catch (err) {
                console.error(err)
              }
            }

            const type = event.dataTransfer.getData("application/x-email-block") as EmailBlock["type"]
            if (!type) return
            const labels: Record<EmailBlock["type"], string> = {
              heading: "Título",
              text: "Texto",
              image: "Imagen",
              video: "Vídeo",
              button: "Botón",
              dynamic: "Contenido dinámico",
              logo: "Logotipo",
              social: "Redes sociales",
              html: "HTML",
              divider: "Divisor",
              product: "Producto",
              navigation: "Navegación",
            }
            if (labels[type]) {
              addBlock(type, labels[type])
            }
          }}
        >
          {/* Email Container (600px width on desktop / 360px on mobile) */}
          <div
            className={`transition-all bg-white dark:bg-zinc-900 shadow-xl border border-slate-200/80 dark:border-zinc-800 flex flex-col ${viewMode === "desktop" ? "w-full max-w-[600px] rounded-2xl p-6 sm:p-8 space-y-4" : "w-[360px] rounded-3xl p-5 space-y-3"
              }`}
            style={{
              backgroundColor: theme.cardBgColor,
              fontFamily: theme.fontFamily,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {blocks.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                Haz clic en cualquiera de las secciones o bloques de la izquierda para diseñar tu email.
              </div>
            ) : (
              blocks.map((block) => {
                const isSelected = selectedBlockId === block.id

                return (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={() => setDraggedBlockId(block.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (!draggedBlockId || draggedBlockId === block.id) return
                      setBlocks((items) => { const next = [...items]; const from = next.findIndex((item) => item.id === draggedBlockId); const to = next.findIndex((item) => item.id === block.id); const [moved] = next.splice(from, 1); next.splice(to, 0, moved); return next })
                      setDraggedBlockId(null)
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedBlockId(block.id)
                    }}
                    className={`relative group transition-all cursor-pointer py-1.5 px-3 rounded-lg ${isSelected
                      ? "border-2 border-violet-500 bg-violet-50/10 shadow-xs"
                      : "border-2 border-transparent hover:border-slate-200 dark:hover:border-zinc-800"
                      }`}
                  >
                    {/* Active Block Top Left Tag Badge */}
                    {isSelected && (
                      <div className="absolute -top-3.5 left-2 px-2 py-0.5 rounded-md bg-violet-600 text-white text-[9px] font-bold uppercase tracking-wider shadow-xs z-10">
                        {block.type === "heading" ? "Headline" : block.label}
                      </div>
                    )}

                    {/* Floating Action Buttons: Duplicate & Delete */}
                    {isSelected && (
                      <div className="absolute -top-3 right-2 flex items-center gap-1 z-10">
                        <button
                          onClick={(e) => duplicateBlock(block.id, e)}
                          title="Duplicar"
                          className="size-6 rounded-full bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center shadow-md transition-transform hover:scale-110 cursor-pointer"
                        >
                          <Copy className="size-3" />
                        </button>
                        <button
                          onClick={(e) => deleteBlock(block.id, e)}
                          title="Eliminar"
                          className="size-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md transition-transform hover:scale-110 cursor-pointer"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    )}

                    {isSelected && (block.type === "heading" || block.type === "text") && (
                      <TextFormattingToolbar
                        block={block}
                        onUpdate={(options) => updateSelectedBlock({ options: { ...block.options, ...options } })}
                      />
                    )}

                    {/* Block Render Output */}
                    {renderEmailCanvasBlock(block, theme, isSelected, (text) => updateSelectedBlock({ options: { ...block.options, text } }), () => setSelectedBlockId(block.id))}
                  </div>
                )
              })
            )}
          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: "Vista previa y prueba"                                           */}
      {/* ========================================================================= */}
      <Dialog open={openPreviewModal} onOpenChange={setOpenPreviewModal}>
        <DialogContent className="sm:max-w-[700px] p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Eye className="size-5 text-primary" />
              Vista Previa y Envío de Prueba
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-3">
            {/* Sender / Subject Summary */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-1 text-xs">
              <p>
                <strong className="text-foreground">De:</strong> {senderName} &lt;{senderEmail}&gt;
              </p>
              <p>
                <strong className="text-foreground">Asunto:</strong> {subject || "(Sin asunto)"}
              </p>
              {previewText && (
                <p>
                  <strong className="text-foreground">Preheader:</strong> {previewText}
                </p>
              )}
            </div>

            {/* Test Email Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Enviar correo de prueba a:</label>
              <div className="flex items-center gap-2">
                <Input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="tu-correo@ejemplo.com"
                  className="h-10 text-xs rounded-xl"
                />
                <Button
                  onClick={async () => {
                    if (!testEmail || !testEmail.includes("@")) {
                      return toast.error("Ingresa un correo destinatario válido.")
                    }
                    if (!templateId || templateId === "new") {
                      return toast.error("Guarda la plantilla primero antes de enviar una prueba.")
                    }
                    try {
                      const res = await api.emailTemplates.sendTest(templateId, testEmail.trim())
                      toast.success(res.message || `Correo de prueba enviado con éxito a ${testEmail}`)
                      setOpenPreviewModal(false)
                    } catch (err: any) {
                      toast.error(err?.message || "Error al despachar correo de prueba.")
                    }
                  }}
                  className="h-10 px-5 font-semibold text-xs rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 cursor-pointer"
                >
                  <Send className="mr-1.5 size-3.5" />
                  Enviar prueba
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Render each block on the email preview canvas
function renderEmailCanvasBlock(block: EmailBlock, theme: EmailTheme, editable = false, onTextCommit?: (text: string) => void, onTextSelect?: () => void) {
  const opt = block.options || {}

  switch (block.type) {
    case "logo":
      if (opt.isBanner) {
        return (
          <div
            style={{
              backgroundColor: opt.bgColor || "#FF7A59",
              color: opt.textColor || "#ffffff",
              padding: `${opt.paddingY || 16}px 24px`,
              textAlign: opt.align || "center",
            }}
            className="rounded-xl flex items-center justify-center font-black text-xl tracking-wider shadow-xs my-1"
          >
            {opt.imageUrl ? (
              <img src={opt.imageUrl} alt={opt.text || "Logo"} className="h-6 max-h-8 object-contain mx-auto" />
            ) : (
              <span>{opt.text || "HubSpot"}</span>
            )}
          </div>
        )
      }
      if (opt.badgeShape === "circle") {
        return (
          <div style={{ textAlign: opt.align || "center" }} className="py-2">
            <div
              style={{
                backgroundColor: opt.bgColor || "#0ea5e9",
                color: opt.textColor || "#ffffff",
                width: `${opt.width || 48}px`,
                height: `${opt.width || 48}px`,
              }}
              className="inline-flex items-center justify-center rounded-full font-extrabold text-xl shadow-xs"
            >
              {opt.text || "W"}
            </div>
          </div>
        )
      }
      return (
        <div style={{ textAlign: opt.align || "center" }} className="py-2">
          {opt.imageUrl ? (
            <img
              src={opt.imageUrl}
              alt={opt.text || "Logo"}
              style={{ maxWidth: opt.width ? `${opt.width}px` : "140px" }}
              className="inline-block object-contain"
            />
          ) : (
            <div className="inline-flex items-center justify-center px-6 py-2 rounded-xl bg-slate-700 text-white font-extrabold text-lg tracking-wider shadow-xs">
              {opt.text || "Logo"}
            </div>
          )}
        </div>
      )

    case "heading":
      return (
        <div
          style={{
            textAlign: opt.align || "center",
            backgroundColor: opt.bgColor || "transparent",
            padding: opt.paddingY ? `${opt.paddingY}px 16px` : undefined,
            borderRadius: opt.bgColor ? "12px" : undefined,
          }}
          className="my-1"
        >
          <InlineCanvasText
            as="h2"
            editable={editable}
            value={opt.text || "Este es el titular."}
            onCommit={onTextCommit}
            onSelect={onTextSelect}
            style={{
              color: opt.color || (opt.bgColor ? "#ffffff" : "#0f172a"),
              fontSize: opt.fontSize ? `${opt.fontSize}px` : "24px",
              fontWeight: opt.fontWeight || 500,
              fontStyle: opt.fontStyle || "normal",
            }}
            className="font-medium tracking-tight"
          />
          {opt.subtitle && (
            <p
              style={{
                color: opt.bgColor ? "rgba(255, 255, 255, 0.85)" : "#64748b",
              }}
              className="text-xs sm:text-sm mt-1.5 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: formatTextWithVariables(opt.subtitle),
              }}
            />
          )}
        </div>
      )

    case "text":
      return (
        <InlineCanvasText
          as="div"
          editable={editable}
          value={opt.text || "Contenido del párrafo..."}
          onCommit={onTextCommit}
          onSelect={onTextSelect}
          style={{
            textAlign: opt.align || "left",
            color: opt.color || "#334155",
            fontSize: opt.fontSize ? `${opt.fontSize}px` : "14px",
            lineHeight: opt.lineHeight || 1.6,
            fontWeight: opt.fontWeight || 400,
            fontStyle: opt.fontStyle || "normal",
          }}
          className="text-xs sm:text-sm leading-relaxed my-1"
        />
      )

    case "image":
      return (
        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 my-1">
          <img
            src={opt.imageUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80"}
            alt={opt.alt || "Banner"}
            className="w-full h-44 sm:h-56 object-cover"
          />
        </div>
      )

    case "video":
      return (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-900 my-1 group">
          <img
            src={opt.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80"}
            alt="Video"
            className="w-full h-44 object-cover opacity-80"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="size-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play className="size-6 fill-white ml-0.5" />
            </div>
          </div>
        </div>
      )

    case "button":
      if ((opt.text || "").includes("App Store") || (opt.text || "").includes("Google Play")) {
        return (
          <div style={{ textAlign: opt.align || "center" }} className="py-2.5">
            <div className="inline-flex flex-wrap items-center justify-center gap-3">
              <a
                href={opt.url || "#"}
                className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs hover:bg-neutral-800 transition-colors"
              >
                <svg className="size-4 fill-white" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.7c.61-.75 1.04-1.8 0.91-2.85-.92.04-2.02.62-2.67 1.38-.58.67-1.1 1.74-.96 2.77 1.02.08 2.08-.52 2.72-1.3z" />
                </svg>
                <span>App Store</span>
              </a>
              <a
                href={opt.url || "#"}
                className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs hover:bg-neutral-800 transition-colors"
              >
                <svg className="size-4 fill-white" viewBox="0 0 24 24">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a2.22 2.22 0 0 1-.223-.748V2.562c0-.28.083-.538.222-.748zm11.24 11.242l2.368-2.368-2.368-2.368-7.915-4.568 7.915 9.304zm3.424-3.424l3.167 1.828c.84.485.84 1.275 0 1.76l-3.167 1.828-2.115-2.116 2.115-3.3zm-3.424 5.792l-7.915 9.304 7.915-4.568 2.368-2.368-2.368-2.368z" />
                </svg>
                <span>Google Play</span>
              </a>
            </div>
          </div>
        )
      }
      return (
        <div style={{ textAlign: opt.align || "center" }} className="py-2">
          <button
            type="button"
            style={{
              backgroundColor: opt.bgColor || theme.primaryColor,
              color: opt.textColor || "#ffffff",
              borderRadius: `${opt.borderRadius ?? (theme.borderRadius === "8px" ? 8 : 6)}px`,
            }}
            className="py-3 px-8 text-xs font-bold uppercase tracking-wider shadow-sm hover:opacity-90 transition-opacity cursor-default"
            dangerouslySetInnerHTML={{
              __html: formatTextWithVariables(opt.text || "Confirmar Asistencia"),
            }}
          />
        </div>
      )

    case "dynamic":
      return (
        <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-700 dark:text-violet-300 font-mono text-xs text-center">
          {"{{ " + (opt.variable || "contact.FIRSTNAME") + " }}"}
        </div>
      )

    case "social":
      return (
        <div style={{ textAlign: opt.align || "center" }} className="py-2">
          <div className="inline-flex items-center gap-3 text-slate-500">
            {(opt.networks || []).map((network: any, index: number) => (
              <a
                key={`${network.name}-${index}`}
                href={network.url || "#"}
                title={network.name}
                className="size-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center hover:text-primary transition-colors"
              >
                {socialIcon(network.name)}
              </a>
            ))}
          </div>
        </div>
      )

    case "product":
      return (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 bg-slate-50/50 dark:bg-zinc-800/30 flex items-center justify-between gap-4">
          {opt.imageUrl && <img src={opt.imageUrl} alt={opt.title || "Producto"} className="size-16 rounded-xl object-cover" />}
          <div className="space-y-1 text-left">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              {opt.title || "Entrada General"}
            </h4>
            <p className="text-xs text-slate-500 line-clamp-1">{opt.description || "Pase al evento"}</p>
          </div>
          <div className="font-extrabold text-sm text-emerald-600 shrink-0">
            {opt.price || "S/ 100.00"}
          </div>
          {opt.buttonText && <span className="text-[10px] font-bold text-primary shrink-0">{opt.buttonText}</span>}
        </div>
      )

    case "navigation":
      return (
        <div className="flex items-center justify-center gap-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          {(opt.links || [{ label: "Inicio" }, { label: "Agenda" }, { label: "Contacto" }]).map(
            (link: any, i: number) => (
              <span key={i} className="hover:text-primary transition-colors">
                {link.label}
              </span>
            )
          )}
        </div>
      )

    case "divider":
      return <hr className="border-t border-slate-200 dark:border-zinc-800 my-2" />

    case "html":
      return (
        <div
          dangerouslySetInnerHTML={{ __html: opt.html || "<div>HTML</div>" }}
          className="text-xs py-1"
        />
      )

    default:
      return <div className="text-xs text-muted-foreground py-2">Bloque {block.label}</div>
  }
}

function TextFormattingToolbar({ block, onUpdate }: { block: EmailBlock; onUpdate: (options: Record<string, unknown>) => void }) {
  const options = block.options || {}
  const alignments = [{ value: "left", icon: AlignLeft }, { value: "center", icon: AlignCenter }, { value: "right", icon: AlignRight }]
  return (
    <div onClick={(event) => event.stopPropagation()} className="absolute -top-12 left-1/2 z-20 flex h-9 -translate-x-1/2 items-center gap-1 rounded-md border border-border bg-background px-1.5 text-muted-foreground">
      <select value={options.level || 2} onChange={(event) => onUpdate({ level: Number(event.target.value) })} className="h-7 max-w-16 border-0 bg-transparent px-1 text-[11px] outline-none">
        <option value={1}>Título 1</option><option value={2}>Título 2</option><option value={3}>Título 3</option><option value={4}>Texto</option>
      </select>
      <span className="h-4 w-px bg-border" />
      <button type="button" title="Reducir tamaño" onClick={() => onUpdate({ fontSize: Math.max(12, Number(options.fontSize || 24) - 2) })} className="size-7 rounded text-sm hover:bg-muted">−</button>
      <span className="min-w-6 text-center text-[11px]">{options.fontSize || 24}</span>
      <button type="button" title="Aumentar tamaño" onClick={() => onUpdate({ fontSize: Math.min(64, Number(options.fontSize || 24) + 2) })} className="size-7 rounded text-sm hover:bg-muted">+</button>
      <span className="h-4 w-px bg-border" />
      <label title="Color" className="flex size-7 cursor-pointer items-center justify-center rounded hover:bg-muted"><span className="text-sm" style={{ color: String(options.color || "#0f172a") }}>A</span><input type="color" value={String(options.color || "#0f172a")} onChange={(event) => onUpdate({ color: event.target.value })} className="sr-only" /></label>
      {alignments.map(({ value, icon: Icon }) => <button key={value} type="button" title={`Alinear ${value}`} onClick={() => onUpdate({ align: value })} className={`flex size-7 items-center justify-center rounded ${options.align === value ? "bg-muted text-foreground" : "hover:bg-muted"}`}><Icon className="size-3.5" /></button>)}
      <span className="h-4 w-px bg-border" />
      <button type="button" title="Negrita" onClick={() => onUpdate({ fontWeight: Number(options.fontWeight || 400) >= 600 ? 400 : 600 })} className={`flex size-7 items-center justify-center rounded ${Number(options.fontWeight || 400) >= 600 ? "bg-muted text-foreground" : "hover:bg-muted"}`}><Bold className="size-3.5" /></button>
      <button type="button" title="Cursiva" onClick={() => onUpdate({ fontStyle: options.fontStyle === "italic" ? "normal" : "italic" })} className={`flex size-7 items-center justify-center rounded ${options.fontStyle === "italic" ? "bg-muted text-foreground" : "hover:bg-muted"}`}><Italic className="size-3.5" /></button>
      <button type="button" title="Emoji" className="flex size-7 items-center justify-center rounded hover:bg-muted"><Smile className="size-3.5" /></button>
    </div>
  )
}

function InlineCanvasText({ as: Tag, editable, value, onCommit, onSelect, style, className }: { as: "h2" | "div"; editable: boolean; value: string; onCommit?: (value: string) => void; onSelect?: () => void; style: CSSProperties; className?: string }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current && ref.current.textContent !== value) ref.current.textContent = value
  }, [value])
  return <Tag ref={ref as any} contentEditable={editable} suppressContentEditableWarning spellCheck={false} onMouseDown={onSelect} onBlur={(event) => { const next = event.currentTarget.textContent || ""; if (next !== value) onCommit?.(next) }} style={style} className={`outline-none ${editable ? "cursor-text" : "cursor-pointer"} ${className || ""}`} aria-label="Editar contenido">{value}</Tag>
}

function InspectorInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-foreground">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 text-xs" placeholder={placeholder} />
    </div>
  )
}

function socialIcon(name?: string) {
  switch ((name || "").toLowerCase()) {
    case "facebook": return <FacebookIcon className="size-4" />
    case "instagram": return <InstagramIcon className="size-4" />
    case "linkedin": return <LinkedinIcon className="size-4" />
    case "twitter":
    case "x": return <TwitterIcon className="size-4" />
    default: return <span className="text-xs font-bold uppercase">{(name || "web").slice(0, 1)}</span>
  }
}

function FacebookIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function InstagramIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

function LinkedinIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.2a1.66 1.66 0 0 0-1.66 1.66 1.66 1.66 0 0 0 1.66 1.66 1.66 1.66 0 0 0 1.66-1.66A1.66 1.66 0 0 0 7.83 6.2z" />
    </svg>
  )
}

function TwitterIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
