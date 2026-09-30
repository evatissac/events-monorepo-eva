import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { api } from "@/api/client"
import { useAuthStore } from "@/store/auth.store"
import { AutomationEditor } from "./components/AutomationsWorkspace"

/** Editor independiente: no hereda el sidebar ni el encabezado del dashboard. */
export function AutomationStudioPage() {
  const { selectedOrganization } = useAuthStore()
  const { automationId } = useParams()
  const organizationId = selectedOrganization?.id
  const [loading, setLoading] = useState(true)
  const [automation, setAutomation] = useState<any>()
  const [events, setEvents] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])

  const load = async () => {
    if (!organizationId) return
    setLoading(true)
    try {
      const [automationsResult, eventsResult, templatesResult] = await Promise.all([
        api.marketing.automations(organizationId),
        api.events.list(organizationId),
        api.emailTemplates.list(organizationId),
      ])
      setAutomation(automationId ? automationsResult.find((item: any) => item.id === automationId) : undefined)
      setEvents(eventsResult)
      setTemplates(templatesResult.filter((template: any) => template.channel === "EMAIL" && template.status !== "ARCHIVED"))
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [organizationId, automationId])

  if (!organizationId || loading) return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground"><Loader2 className="mr-2 size-5 animate-spin" />Cargando automatización…</div>
  return <AutomationEditor organizationId={organizationId} automation={automation} events={events} templates={templates} onSaved={() => void load()} />
}
