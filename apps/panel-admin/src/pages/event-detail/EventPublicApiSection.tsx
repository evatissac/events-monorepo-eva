import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { Check, Clipboard, Code2, ExternalLink, Globe2, LockKeyhole, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { api } from "@/api/client"
import { useAuthStore } from "@/store/auth.store"
import { useEventStore } from "@/store/event.store"

type PublicPayload = Record<string, unknown>

function CodePanel({ value, language = "json" }: { value: string; language?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    toast.success("Copiado al portapapeles")
    window.setTimeout(() => setCopied(false), 1600)
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="font-mono text-[11px] text-muted-foreground">{language}</span>
        <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
          {copied ? <Check className="size-3.5 text-emerald-600" /> : <Clipboard className="size-3.5" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre className="max-h-[380px] overflow-auto p-4 text-xs leading-6 text-foreground"><code>{value}</code></pre>
    </div>
  )
}

export function EventPublicApiSection() {
  const { id } = useParams<{ id: string }>()
  const { selectedOrganization } = useAuthStore()
  const { events } = useEventStore()
  const [payload, setPayload] = useState<PublicPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const event = events.find((item) => item.id === id)
  const apiBase = (import.meta.env.VITE_API_URL as string).replace(/\/+$/, "")
  const organizationSlug = selectedOrganization?.slug || "institucion-slug"
  const eventId = event?.id || ":eventId"
  const listUrl = `${apiBase}/public/organizations/${organizationSlug}/events`
  const detailUrl = `${listUrl}/${eventId}`
  const published = String(event?.status || "").toUpperCase() === "PUBLISHED"

  const fetchExample = async () => {
    if (!event?.id || !selectedOrganization?.slug) return
    try {
      setLoading(true)
      const result = await api.publicEvents.get(selectedOrganization.slug, event.id)
      setPayload(result)
    } catch (error: any) {
      toast.error(error?.message || "No se pudo obtener la respuesta pública.")
    } finally {
      setLoading(false)
    }
  }

  const exampleCode = useMemo(() => `// Puedes usar esto en React, Astro, Next.js, Vue o JavaScript puro.\nconst response = await fetch('${detailUrl}');\n\nif (!response.ok) throw new Error('Evento no disponible');\n\nconst event = await response.json();\n\n// event.editions, event.registrationForms, event.details, etc.\nconsole.log(event.eventName);`, [detailUrl])

  if (!event || !selectedOrganization) return null

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-12">
      <PageHeader
        title="API pública"
        description="Consume este evento desde cualquier sitio o aplicación externa usando JSON. No requiere token y nunca expone inscritos ni datos privados."
        actionButton={<Button variant="outline" onClick={() => void fetchExample()} disabled={loading || !published} className="rounded-lg text-xs"><RefreshCw className={`mr-2 size-3.5 ${loading ? "animate-spin" : ""}`} />Ver respuesta real</Button>}
      />

      {!published && (
        <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-300">
          <LockKeyhole className="mt-0.5 size-4 shrink-0" />
          <p>Este evento aún no está publicado. Las URLs se habilitarán automáticamente cuando su estado sea <strong>Publicado</strong>.</p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2"><Globe2 className="size-4 text-primary" /><h2 className="text-base font-medium">Endpoints disponibles</h2></div>
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">Catálogo público de la institución</p>
              <CodePanel value={listUrl} language="GET" />
            </div>
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">Detalle completo de este evento</p>
              <CodePanel value={detailUrl} language="GET" />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2"><Code2 className="size-4 text-primary" /><h2 className="text-base font-medium">Ejemplo de consumo</h2></div>
          <CodePanel value={exampleCode} language="javascript" />
          <p className="mt-3 text-xs leading-5 text-muted-foreground">Para sitios con renderizado en servidor no hay configuración adicional. Para consumo desde el navegador, registra el dominio del frontend en <code className="rounded bg-muted px-1 py-0.5">FRONTEND_URL</code> del backend.</p>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-base font-medium">Contrato de respuesta</h2><p className="mt-1 text-xs text-muted-foreground">Esta es la respuesta pública exacta que tu proyecto puede usar para construir su propio diseño.</p></div>{published && <a href={detailUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline">Abrir endpoint <ExternalLink className="size-3" /></a>}</div>
        {payload ? <CodePanel value={JSON.stringify(payload, null, 2)} /> : <CodePanel value={JSON.stringify({ id: event.id, eventName: event.name, description: "…", editions: [{ id: "…", name: "…", participants: [{ profile: { firstName: "…", lastName: "…", avatarUrl: "…" } }], activities: [{ title: "…", startsAt: "…" }] }], registrationForms: [{ title: "…", slug: "…", purpose: "MAIN" }], details: { content: "…", socialLinks: {}, sponsors: [], faqs: [] } }, null, 2)} />}
      </section>
    </div>
  )
}
