import { useEffect, useMemo, useState, type ReactNode } from "react"
import { ArrowLeft, CalendarClock, ChevronRight, Copy, GripVertical, Loader2, Mail, Pause, Play, Plus, Save, Sparkles, Trash2, Users, Zap } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { api } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Timing = "IMMEDIATE" | "BEFORE_EVENT" | "AFTER_EVENT"
type Step = { timing: Timing; offsetHours: number; templateId: string }

const timingLabel: Record<Timing, string> = {
  IMMEDIATE: "Inmediatamente después del registro",
  BEFORE_EVENT: "Antes del evento",
  AFTER_EVENT: "Después del evento",
}

const automationStatus = (status?: string) => status === "ACTIVE" ? "Activa" : status === "PAUSED" ? "Pausada" : "Borrador"

export function AutomationsList({ organizationId, automations, events, templates, loading, onChanged }: { organizationId: string; automations: any[]; events: any[]; templates: any[]; loading?: boolean; onChanged: () => void }) {
  const navigate = useNavigate()
  const [workingId, setWorkingId] = useState<string | null>(null)

  const changeStatus = async (automation: any) => {
    setWorkingId(automation.id)
    try {
      await api.marketing.updateAutomation(automation.id, { status: automation.status === "ACTIVE" ? "PAUSED" : "ACTIVE" })
      toast.success(automation.status === "ACTIVE" ? "Automatización pausada." : "Automatización activada.")
      onChanged()
    } catch (error: any) { toast.error(error?.message || "No se pudo actualizar la automatización.") } finally { setWorkingId(null) }
  }
  const remove = async (automation: any) => {
    if (!window.confirm(`¿Eliminar “${automation.name}”? Esta acción no se puede deshacer.`)) return
    setWorkingId(automation.id)
    try { await api.marketing.removeAutomation(automation.id); toast.success("Automatización eliminada."); onChanged() }
    catch (error: any) { toast.error(error?.message || "No se pudo eliminar la automatización.") } finally { setWorkingId(null) }
  }

  return <div className="space-y-6">
    <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl"><div className="mb-2 flex items-center gap-2 text-sm text-violet-600"><Zap className="size-4" />Flujos basados en eventos</div><h2 className="text-xl font-medium tracking-tight">Automatiza la comunicación de cada evento</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Activa una secuencia cuando una persona se registra. Puedes enviar una confirmación inmediata y recordatorios antes o después del evento.</p></div>
        <Button onClick={() => navigate("/dashboard/automations/new")} className="h-10 rounded-lg px-4"><Plus className="mr-2 size-4" />Nueva automatización</Button>
      </div>
      {!events.length && !loading && <div className="mt-5 rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">Primero crea un evento y su formulario de registro. Luego podrás asociar la automatización.</div>}
    </div>

    {loading ? <div className="grid gap-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="animate-pulse rounded-xl border border-border bg-card p-5"><div className="h-5 w-56 rounded bg-muted" /><div className="mt-3 h-4 w-80 max-w-full rounded bg-muted" /></div>)}</div> : automations.length ? <div className="grid gap-3">{automations.map((automation) => <div key={automation.id} className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-violet-500/35"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{automation.name}</h3><span className={`rounded-full px-2 py-0.5 text-xs ${automation.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : automation.status === "PAUSED" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-muted text-muted-foreground"}`}>{automationStatus(automation.status)}</span></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1.5"><CalendarClock className="size-3.5" />{automation.event?.eventName || "Sin evento asociado"}</span><span className="inline-flex items-center gap-1.5"><Mail className="size-3.5" />{automation.steps?.length || 0} {automation.steps?.length === 1 ? "correo" : "correos"}</span><span className="inline-flex items-center gap-1.5"><Users className="size-3.5" />{automation._count?.enrollments || 0} inscritos</span></div></div><div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" className="rounded-lg" onClick={() => navigate(`/dashboard/automations/${automation.id}/edit`)}>Editar<ChevronRight className="ml-1 size-3.5" /></Button><Button variant="outline" size="sm" className="rounded-lg" disabled={workingId === automation.id} onClick={() => void changeStatus(automation)}>{workingId === automation.id ? <Loader2 className="size-3.5 animate-spin" /> : automation.status === "ACTIVE" ? <><Pause className="mr-1 size-3.5" />Pausar</> : <><Play className="mr-1 size-3.5" />Activar</>}</Button><Button variant="ghost" size="icon" title="Eliminar" disabled={workingId === automation.id} onClick={() => void remove(automation)}><Trash2 className="size-4 text-rose-600" /></Button></div></div></div>)}</div> : <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center"><div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600"><Sparkles className="size-5" /></div><h3 className="mt-4 font-medium">Aún no tienes automatizaciones</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Crea la primera secuencia para enviar una confirmación y recordatorios a quienes se inscriban.</p><Button className="mt-5 rounded-lg" onClick={() => navigate("/dashboard/automations/new")}><Plus className="mr-2 size-4" />Crear automatización</Button></div>}
  </div>
}

export function AutomationEditor({ organizationId, automation, events, templates, onSaved }: { organizationId: string; automation?: any; events: any[]; templates: any[]; onSaved: () => void }) {
  const navigate = useNavigate()
  const [name, setName] = useState(automation?.name || "")
  const [eventId, setEventId] = useState(automation?.eventId || automation?.event?.id || "")
  const [formId, setFormId] = useState(automation?.registrationFormId || automation?.registrationForm?.id || "")
  const [forms, setForms] = useState<any[]>([])
  const [steps, setSteps] = useState<Step[]>(automation?.steps?.length ? automation.steps.map((step: any) => ({ timing: step.timing, offsetHours: Number(step.offsetHours || 0), templateId: step.templateId || "" })) : [{ timing: "IMMEDIATE", offsetHours: 0, templateId: "" }])
  const [selectedStep, setSelectedStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<"triggers" | "actions" | "rules">("triggers")

  useEffect(() => {
    if (!automation) return
    setName(automation.name || "")
    setEventId(automation.eventId || automation.event?.id || "")
    setFormId(automation.registrationFormId || automation.registrationForm?.id || "")
    setSteps(automation.steps?.length ? automation.steps.map((step: any) => ({ timing: step.timing, offsetHours: Number(step.offsetHours || 0), templateId: step.templateId || "" })) : [{ timing: "IMMEDIATE", offsetHours: 0, templateId: "" }])
    setSelectedStep(0)
  }, [automation?.id])
  useEffect(() => { if (!eventId) { setForms([]); return }; void api.registrationForms.list(eventId).then((items) => { setForms(items); if (formId && !items.some((form: any) => form.id === formId)) setFormId("") }).catch(() => setForms([])) }, [eventId])
  const selectedEvent = useMemo(() => events.find((event) => event.id === eventId), [events, eventId])
  const addEmail = () => { setSteps((current) => [...current, { timing: "BEFORE_EVENT", offsetHours: 24, templateId: "" }]); setSelectedStep(steps.length); setMode("actions") }
  const patchStep = (index: number, patch: Partial<Step>) => setSteps((current) => current.map((step, position) => position === index ? { ...step, ...patch } : step))
  const removeStep = (index: number) => { if (steps.length === 1) { toast.error("Una automatización necesita al menos un correo."); return }; setSteps((current) => current.filter((_, position) => position !== index)); setSelectedStep(Math.max(0, index - 1)) }
  const save = async (activate = false) => {
    if (!name.trim() || !eventId) { toast.error("Indica un nombre y el evento asociado."); return }
    if (steps.some((step) => !step.templateId)) { toast.error("Selecciona una plantilla para cada correo."); return }
    setSaving(true)
    const data = { name: name.trim(), eventId, registrationFormId: formId || null, trigger: "REGISTRATION_SUBMITTED", status: activate ? "ACTIVE" : automation?.status === "ACTIVE" ? "ACTIVE" : "DRAFT", steps }
    try {
      const saved = automation ? await api.marketing.updateAutomation(automation.id, data) : await api.marketing.createAutomation(organizationId, data)
      toast.success(activate ? "Automatización activada." : "Cambios guardados."); onSaved(); navigate(`/dashboard/automations/${saved.id}/edit`, { replace: true })
    } catch (error: any) { toast.error(error?.message || "No se pudo guardar la automatización.") } finally { setSaving(false) }
  }
  const sidebarItems = mode === "triggers" ? [{ icon: Zap, label: "Registro enviado", detail: "Cuando se envía un formulario", enabled: true }] : mode === "actions" ? [{ icon: Mail, label: "Enviar un email", detail: "Añade un correo a la secuencia", enabled: true }, { icon: CalendarClock, label: "Esperar", detail: "Se configura en cada correo", enabled: false }] : [{ icon: Copy, label: "Condición", detail: "Disponible próximamente", enabled: false }, { icon: Users, label: "Segmentación", detail: "Disponible próximamente", enabled: false }]

  return <div className="fixed inset-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-[#fffdf5] text-slate-900 dark:bg-[#151515] dark:text-slate-100">
    <header className="flex min-h-14 shrink-0 items-center gap-2 overflow-x-auto border-b border-slate-200 bg-card px-3 py-2 dark:border-white/10 md:min-h-16 md:gap-3 md:px-5"><Button variant="ghost" size="icon" className="shrink-0 rounded-lg" onClick={() => navigate("/dashboard/automations")}><ArrowLeft className="size-4" /></Button><div className="min-w-36 flex-1"><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre de la automatización" className="h-9 min-w-44 border-transparent bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0 md:text-base" /></div><span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-xs sm:inline ${automation?.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{automationStatus(automation?.status)}</span><Button variant="outline" size="sm" className="shrink-0 rounded-lg" disabled={saving} onClick={() => void save(false)}><Save className="size-4 sm:mr-2" /><span className="hidden sm:inline">Guardar</span></Button><Button size="sm" className="shrink-0 rounded-lg" disabled={saving} onClick={() => void save(true)}>{saving ? <Loader2 className="size-4 animate-spin sm:mr-2" /> : <Play className="size-4 sm:mr-2" />}<span className="hidden sm:inline">{automation?.status === "ACTIVE" ? "Guardar y activar" : "Activar"}</span></Button></header>
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-80 shrink-0 border-r border-slate-200 bg-[#fffdf5] dark:border-white/10 dark:bg-[#151515] lg:block"><div className="border-b border-slate-200 p-4 dark:border-white/10"><div className="flex rounded-lg bg-muted p-1">{(["triggers", "actions", "rules"] as const).map((item) => <button key={item} onClick={() => setMode(item)} className={`flex-1 rounded-md px-2 py-2 text-xs capitalize ${mode === item ? "bg-card text-violet-600 shadow-sm" : "text-muted-foreground"}`}>{item === "triggers" ? "Disparador" : item === "actions" ? "Acciones" : "Reglas"}</button>)}</div></div><div className="p-4"><p className="mb-4 text-xs leading-5 text-muted-foreground">{mode === "triggers" ? "El registro del formulario inicia esta secuencia." : mode === "actions" ? "Los correos se envían en el momento configurado." : "Las reglas avanzadas estarán disponibles cuando el motor las soporte."}</p><div className="space-y-2">{sidebarItems.map(({ icon: Icon, label, detail, enabled }) => <button key={label} disabled={!enabled} onClick={() => enabled && label === "Enviar un email" && addEmail()} className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left ${enabled ? "border-slate-200 bg-card hover:border-violet-400 dark:border-white/10" : "cursor-not-allowed border-slate-200/60 opacity-55 dark:border-white/5"}`}><span className={`flex size-8 items-center justify-center rounded-md ${mode === "triggers" ? "bg-rose-500/10 text-rose-600" : mode === "actions" ? "bg-teal-500/10 text-teal-600" : "bg-violet-500/10 text-violet-600"}`}><Icon className="size-4" /></span><span><span className="block text-sm font-medium">{label}</span><span className="block text-xs text-muted-foreground">{detail}</span></span><GripVertical className="ml-auto size-4 text-muted-foreground" /></button>)}</div></div></aside>
      <main className="relative min-w-0 flex-1 overflow-auto bg-[radial-gradient(#eadfce_1px,transparent_1px)] bg-[size:18px_18px] dark:bg-[radial-gradient(#3b352c_1px,transparent_1px)]"><div className="mx-auto flex min-h-full max-w-2xl flex-col items-center px-5 py-10"><div className="mb-7 w-full rounded-xl border border-slate-200 bg-card p-4 shadow-sm dark:border-white/10"><label className="text-xs font-medium text-muted-foreground">Evento que activa el flujo</label><select value={eventId} onChange={(event) => { setEventId(event.target.value); setFormId("") }} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Selecciona un evento</option>{events.map((event) => <option key={event.id} value={event.id}>{event.eventName || event.name}</option>)}</select><select value={formId} disabled={!eventId} onChange={(event) => setFormId(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Todos los formularios del evento</option>{forms.map((form) => <option key={form.id} value={form.id}>{form.purpose === "MAIN" ? "Registro principal · " : ""}{form.title}</option>)}</select>{selectedEvent?.startDate && <p className="mt-2 text-xs text-muted-foreground">Inicio del evento: {new Date(selectedEvent.startDate).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })}</p>}</div>
        <div className="w-full max-w-md space-y-0"><FlowNode icon={<Zap className="size-4" />} color="rose" title="Formulario enviado" description={formId ? forms.find((form) => form.id === formId)?.title || "Formulario asociado" : "Cualquier formulario del evento"} /><Connector />{steps.map((step, index) => <div key={`${index}-${step.templateId}`}><FlowNode active={selectedStep === index} onClick={() => setSelectedStep(index)} icon={<Mail className="size-4" />} color="teal" title={step.templateId ? templates.find((template) => template.id === step.templateId)?.name || "Correo" : "Configurar correo"} description={timingLabel[step.timing] + (step.timing === "IMMEDIATE" ? "" : ` · ${step.offsetHours} h`)} action={<button type="button" onClick={(event) => { event.stopPropagation(); removeStep(index) }} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-rose-600" title="Eliminar correo"><Trash2 className="size-3.5" /></button>} /><Connector /></div>)}<button type="button" onClick={addEmail} className="mx-auto flex items-center gap-2 rounded-lg border border-dashed border-violet-400/70 bg-card/85 px-4 py-2 text-sm text-violet-700 hover:bg-violet-500/10 dark:text-violet-300"><Plus className="size-4" />Añadir correo</button></div></div></main>
      <aside className="hidden w-80 shrink-0 border-l border-slate-200 bg-card p-5 dark:border-white/10 xl:block"><h2 className="font-medium">Configuración</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Define cuándo se enviará el correo seleccionado.</p>{steps[selectedStep] && <div className="mt-5 space-y-4"><div><label className="text-xs font-medium">Momento de envío</label><select value={steps[selectedStep].timing} onChange={(event) => patchStep(selectedStep, { timing: event.target.value as Timing })} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="IMMEDIATE">Al registrarse</option><option value="BEFORE_EVENT">Antes del evento</option><option value="AFTER_EVENT">Después del evento</option></select></div>{steps[selectedStep].timing !== "IMMEDIATE" && <div><label className="text-xs font-medium">Horas</label><Input min="0" type="number" value={steps[selectedStep].offsetHours} onChange={(event) => patchStep(selectedStep, { offsetHours: Number(event.target.value) })} className="mt-1 h-10" /></div>}<div><label className="text-xs font-medium">Plantilla de correo</label><select value={steps[selectedStep].templateId} onChange={(event) => patchStep(selectedStep, { templateId: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Selecciona una plantilla</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select><p className="mt-2 text-xs leading-5 text-muted-foreground">La plantilla utiliza las variables del contacto, evento y registro.</p></div></div>}</aside>
    </div>
  </div>
}

function Connector() { return <div className="mx-auto h-8 w-px bg-violet-400/70" /> }
function FlowNode({ icon, color, title, description, active, onClick, action }: { icon: ReactNode; color: "rose" | "teal"; title: string; description: string; active?: boolean; onClick?: () => void; action?: ReactNode }) { return <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onClick?.() }} className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition ${active ? "border-violet-500 ring-2 ring-violet-500/15" : "border-slate-200 hover:border-violet-300 dark:border-white/10"}`}><span className={`flex size-9 items-center justify-center rounded-lg ${color === "rose" ? "bg-rose-500/10 text-rose-600" : "bg-teal-500/10 text-teal-600"}`}>{icon}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{title}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{description}</span></span>{action}</div> }
