import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Check, ChevronRight, Users, CalendarDays, Mail, Settings2, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api } from "@/api/client"
import { useSEO } from "@/hooks/use-seo"

type Progress = Record<string, boolean> & { currentStep: number; completed: boolean }

const steps = [
  { key: "basicInfoCompleted", title: "Información general", description: "Nombre, descripción e imagen del evento.", icon: Settings2 },
  { key: "editionCompleted", title: "Primera edición", description: "Crea la edición que recibirán tus asistentes.", icon: CalendarDays },
  { key: "rolesCompleted", title: "Roles", description: "Define los roles que tendrá tu evento.", icon: Users },
  { key: "peopleCompleted", title: "Primer ponente", description: "Asocia una persona registrada al evento.", icon: Users },
  { key: "contactCompleted", title: "Contactos", description: "Puedes añadir responsables de consultas y coordinación cuando los tengas.", icon: Mail, optional: true },
]

function EventSetupLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground" aria-busy="true" aria-label="Cargando configuración del evento">
      <LoaderCircle className="size-9 animate-spin text-primary" />
    </main>
  )
}

export function EventSetupPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [event, setEvent] = useState<any>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useSEO({ title: "Configurar evento", description: "Completa la configuración inicial de tu evento en Zyncro." })

  useEffect(() => {
    if (!id) return
    const load = () => Promise.all([api.events.get(id), api.events.setup(id)])
      .then(([eventData, progressData]) => { setEvent(eventData); setProgress(progressData); setError("") })
      .catch((err) => setError(err?.message || "No se pudo cargar la configuración del evento."))
      .finally(() => setLoading(false))
    load()
    window.addEventListener("focus", load)
    return () => window.removeEventListener("focus", load)
  }, [id])

  const requiredSteps = useMemo(() => steps.filter((step) => !step.optional), [])
  const completedCount = useMemo(() => progress ? requiredSteps.filter((step) => progress[step.key]).length : 0, [progress, requiredSteps])

  const getStepPath = (key: string) => {
    if (key === "contactCompleted") return `/dashboard/events/${id}/info#contacts`
    if (key === "basicInfoCompleted") return `/dashboard/events/${id}/info`
    if (key === "rolesCompleted") return `/dashboard/events/${id}/roles`
    if (key === "editionCompleted") return `/dashboard/events/${id}/editions/new`
    if (key === "peopleCompleted") return `/dashboard/events/${id}/speakers/new`
    return `/dashboard/events/${id}/edit`
  }

  if (loading) return <EventSetupLoading />
  if (error) return <div className="p-8"><p className="text-destructive">{error}</p><Button className="mt-4" onClick={() => navigate("/dashboard/events")}>Volver a eventos</Button></div>
  if (!event || !progress) return <EventSetupLoading />

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground">Configuración inicial</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Configura {event.eventName}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Completa estos pasos mínimos para habilitar la gestión completa del evento. Puedes salir y continuar después.</p>
        </div>
        <div className="mb-8 rounded-md border bg-card p-5">
          <div className="flex items-center justify-between text-sm"><span>Progreso de configuración</span><span className="text-muted-foreground">{completedCount} de {requiredSteps.length}</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(completedCount / requiredSteps.length) * 100}%` }} /></div>
        </div>
        <div className="space-y-3">
          {steps.map((step, index) => {
            const done = Boolean(progress[step.key])
            const previousDone = index === 0 || Boolean(progress[steps[index - 1].key])
            const Icon = step.icon
            return <div key={step.key} className="flex items-center gap-4 rounded-md border bg-card p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">{done ? <Check className="h-5 w-5 text-emerald-600" /> : <Icon className="h-5 w-5 text-muted-foreground" />}</div>
              <div className="min-w-0 flex-1"><p className="font-medium">{index + 1}. {step.title}</p><p className="text-sm text-muted-foreground">{step.description}</p></div>
              {step.optional ? <Button variant="outline" size="sm" disabled={!previousDone} onClick={() => navigate(getStepPath(step.key))}>{previousDone ? "Opcional" : "Bloqueado"} {previousDone && <ChevronRight className="ml-1 h-4 w-4" />}</Button> : done ? <span className="text-sm text-emerald-600">Completado automáticamente</span> : <Button variant="outline" size="sm" disabled={!previousDone} onClick={() => navigate(getStepPath(step.key))}>{previousDone ? "Configurar" : "Bloqueado"} {previousDone && <ChevronRight className="ml-1 h-4 w-4" />}</Button>}
            </div>
          })}
        </div>
        <div className="mt-8 flex flex-wrap justify-between gap-3">
          <Button variant="ghost" onClick={() => navigate("/dashboard/events")}>Salir y continuar después</Button>
          <Button disabled={!progress.completed} onClick={() => navigate(`/dashboard/events/${id}`)}>Ir a la gestión del evento <ChevronRight className="ml-1 h-4 w-4" /></Button>
        </div>
        {!progress.completed && <p className="mt-3 text-right text-xs text-muted-foreground">Completa todos los pasos para habilitar las secciones del evento.</p>}
      </div>
    </main>
  )
}
