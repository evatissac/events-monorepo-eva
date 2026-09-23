import { useEffect, useMemo, useState } from "react"
import { CalendarClock, CheckCircle2, Loader2, Pause, Play, Plus, RefreshCw, Send } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Step = { timing: "IMMEDIATE" | "BEFORE_EVENT" | "AFTER_EVENT"; offsetHours: number; templateId: string }

export function WebinarCampaignsTab({ organizationId, automations, events, templates, onChanged }: { organizationId: string; automations: any[]; events: any[]; templates: any[]; onChanged: () => void }) {
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [forms, setForms] = useState<any[]>([])
  const [name, setName] = useState("")
  const [eventId, setEventId] = useState("")
  const [formId, setFormId] = useState("")
  const [steps, setSteps] = useState<Step[]>([{ timing: "IMMEDIATE", offsetHours: 0, templateId: "" }])
  const selectedEvent = useMemo(() => events.find((event) => event.id === eventId), [events, eventId])

  useEffect(() => {
    if (!eventId) { setForms([]); setFormId(""); return }
    void api.registrationForms.list(eventId).then(setForms).catch(() => setForms([]))
    setFormId("")
  }, [eventId])

  const addStep = () => setSteps((current) => [...current, { timing: "BEFORE_EVENT", offsetHours: 24, templateId: "" }])
  const updateStep = (index: number, patch: Partial<Step>) => setSteps((current) => current.map((step, position) => position === index ? { ...step, ...patch } : step))
  const removeStep = (index: number) => setSteps((current) => current.filter((_, position) => position !== index))

  const save = async () => {
    if (!name.trim() || !eventId || steps.some((step) => !step.templateId)) { toast.error("Completa el nombre, webinar y plantilla de cada correo."); return }
    setSaving(true)
    try {
      await api.marketing.createAutomation(organizationId, { name: name.trim(), eventId, registrationFormId: formId || null, trigger: "REGISTRATION_SUBMITTED", status: "ACTIVE", steps })
      toast.success("Campaña activada. Los nuevos registros ingresarán automáticamente a la secuencia.")
      setCreating(false); setName(""); setEventId(""); setSteps([{ timing: "IMMEDIATE", offsetHours: 0, templateId: "" }]); onChanged()
    } catch (error: any) { toast.error(error?.message || "No se pudo crear la campaña.") } finally { setSaving(false) }
  }

  const sync = async (automation: any) => { try { const result = await api.marketing.enrollExisting(automation.id); toast.success(`${result.scanned} registros revisados; ${result.enrolled} incorporados.`); onChanged() } catch (error: any) { toast.error(error?.message || "No se pudieron sincronizar los registros.") } }
  const changeStatus = async (automation: any) => { try { await api.marketing.updateAutomation(automation.id, { status: automation.status === "ACTIVE" ? "PAUSED" : "ACTIVE" }); toast.success(automation.status === "ACTIVE" ? "Campaña pausada." : "Campaña activada."); onChanged() } catch (error: any) { toast.error(error?.message || "No se pudo actualizar la campaña.") } }

  return <div className="space-y-5">
    <div className="rounded-xl border border-border bg-card p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Secuencias para webinars</h2><p className="text-sm text-muted-foreground">Usan inscritos reales del formulario; los recordatorios vencidos no se envían a registros tardíos.</p></div><Button onClick={() => setCreating((open) => !open)}><Plus className="mr-2 size-4" />Nueva campaña</Button></div>
    {creating && <div className="mt-5 space-y-4 border-t pt-5"><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej.: Recordatorios Webinar RM 2027" /><div className="grid gap-3 md:grid-cols-2"><select value={eventId} onChange={(event) => setEventId(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">Selecciona el webinar</option>{events.map((event) => <option key={event.id} value={event.id}>{event.eventName || event.name}</option>)}</select><select value={formId} onChange={(event) => setFormId(event.target.value)} disabled={!eventId} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">Todos los formularios del webinar</option>{forms.map((form) => <option key={form.id} value={form.id}>{form.purpose === "MAIN" ? "Registro principal · " : ""}{form.title}</option>)}</select></div>{selectedEvent && <p className="text-xs text-muted-foreground">Inicio: {new Date(selectedEvent.startDate).toLocaleString("es-PE", { timeZone: "America/Lima" })} (hora Perú)</p>}
    <div className="space-y-3">{steps.map((step, index) => <div key={index} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_130px_1fr_auto]"><select value={step.timing} onChange={(event) => updateStep(index, { timing: event.target.value as Step["timing"] })} className="h-9 rounded-md border bg-background px-2 text-xs"><option value="IMMEDIATE">Al registrarse</option><option value="BEFORE_EVENT">Antes del webinar</option><option value="AFTER_EVENT">Después del webinar</option></select><Input type="number" min="0" disabled={step.timing === "IMMEDIATE"} value={step.offsetHours} onChange={(event) => updateStep(index, { offsetHours: Number(event.target.value) })} className="h-9" /><select value={step.templateId} onChange={(event) => updateStep(index, { templateId: event.target.value })} className="h-9 rounded-md border bg-background px-2 text-xs"><option value="">Plantilla de correo</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select><Button variant="ghost" size="sm" disabled={steps.length === 1} onClick={() => removeStep(index)}>Quitar</Button></div>)}</div><div className="flex justify-between"><Button variant="outline" onClick={addStep}>Agregar correo</Button><Button disabled={saving} onClick={() => void save()}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}Activar campaña</Button></div></div>}</div>
    <div className="grid gap-3">{automations.map((automation) => <div key={automation.id} className="rounded-xl border border-border bg-card p-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><h3 className="font-medium">{automation.name}</h3><span className={`rounded-full px-2 py-0.5 text-xs ${automation.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{automation.status === "ACTIVE" ? "Activa" : automation.status}</span></div><p className="mt-1 text-sm text-muted-foreground">{automation.event?.eventName || "Sin webinar"} · {automation.steps?.length || 0} correos · {automation._count?.enrollments || 0} inscritos en la campaña</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => void sync(automation)}><RefreshCw className="mr-1 size-3.5" />Sincronizar inscritos</Button><Button variant="outline" size="sm" onClick={() => void changeStatus(automation)}>{automation.status === "ACTIVE" ? <Pause className="mr-1 size-3.5" /> : <Play className="mr-1 size-3.5" />}{automation.status === "ACTIVE" ? "Pausar" : "Activar"}</Button></div></div></div>)}{!automations.length && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground"><CalendarClock className="mx-auto mb-2 size-6" />Aún no hay campañas operativas para esta institución.</div>}</div>
  </div>
}
