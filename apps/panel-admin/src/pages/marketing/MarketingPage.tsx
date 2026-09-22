import { useState, useEffect } from "react"
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useAuthStore } from "@/store/auth.store"
import { api } from "@/api/client"
import { toast } from "sonner"
import {
  Mail,
  Zap,
  Users,
  Layers,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Campaign, Automation, Contact, Segment } from "./types"
import { CampaignsTab } from "./components/CampaignsTab"
import { CampaignReportView } from "./components/CampaignReportView"
import { CampaignSetupBuilder } from "./components/CampaignSetupBuilder"
import { CreateEmailCampaignModal } from "./components/CreateEmailCampaignModal"
import { AutomationsTab } from "./components/AutomationsTab"
import { ContactsTab } from "./components/ContactsTab"
import { SegmentsTab } from "./components/SegmentsTab"
import { PageHeader } from "@/components/page-header"

type MainTab = "campaigns" | "automations" | "contacts" | "segments"

const normalizeContact = (contact: any): Contact => ({
  id: contact.id,
  email: contact.email || contact.emailFallback || "Sin correo",
  firstName: contact.firstName || contact.profile?.firstName || undefined,
  lastName: contact.lastName || contact.profile?.lastName || undefined,
  phone: contact.phone || contact.profile?.phone || undefined,
  status: contact.status || contact.consentStatus || "UNSUBSCRIBED",
  tags: Array.isArray(contact.tags) ? contact.tags : [],
  createdAt: contact.createdAt || new Date().toISOString(),
})

const normalizeCampaign = (campaign: any, organizationName?: string, index = 0): Campaign => {
  const settings = campaign.settings || {}
  return {
    id: campaign.id, campaignNumber: index + 1, name: campaign.name, subject: campaign.subject || "",
    previewText: settings.previewText, senderName: settings.senderName || organizationName || "Institución",
    senderEmail: settings.senderEmail || "", replyTo: settings.replyTo, status: campaign.status || "DRAFT",
    createdAt: campaign.createdAt || new Date().toISOString(), scheduledAt: campaign.scheduledAt || undefined,
    channel: "EMAIL", segmentIds: Array.isArray(campaign.segmentIds) ? campaign.segmentIds : [],
    recipientCount: Number(settings.recipientCount || 0), templateId: settings.templateId, sourceTemplateId: settings.sourceTemplateId, eventContext: settings.eventContext, content: settings.content,
    tags: settings.tags || [],
  }
}

export function MarketingPage() {
  const { selectedOrganization } = useAuthStore()
  const organizationId = selectedOrganization?.id
  const { campaignId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const contactsSearch = searchParams.get("q") || ""
  const contactsPage = Math.max(Number(searchParams.get("page")) || 1, 1)

  const navigate = useNavigate()
  const { pathname } = useLocation()
  const routeTab = pathname.split("/").pop()
  const activeTab: MainTab = (["campaigns", "contacts", "segments"].includes(routeTab || "") ? routeTab : "campaigns") as MainTab
  const setActiveTab = (tab: MainTab) => navigate(`/dashboard/marketing/${tab}`)
  const [viewMode, setViewMode] = useState<"list" | "report" | "setup">("list")
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)

  // Modals
  const [openCreateEmailModal, setOpenCreateEmailModal] = useState(false)

  // Seed Initial State (Matching reference images with real-looking demo data)
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: "camp-1",
      campaignNumber: 15,
      name: "AMPLIACION DE FECHA",
      subject: "CONIAP",
      previewText: "Últimos días para postular tu resumen al congreso",
      senderName: "IIAP",
      senderEmail: "daylersan@gmail.com",
      replyTo: "daylersan@gmail.com",
      status: "SENT",
      createdAt: "2024-09-19T10:00:00.000Z",
      sentAt: "2024-09-19T20:38:00.000Z",
      channel: "EMAIL",
      segmentIds: ["seg-1"],
      segmentNames: ["Participantes CONIAP 2024"],
      recipientCount: 88,
      stats: {
        delivered: 88,
        deliveredRate: 97.78,
        opens: 55,
        openRate: 62.5,
        clicks: 12,
        clickRate: 13.64,
        unsubscribes: 0,
        unsubscribeRate: 0,
      },
    },
    {
      id: "camp-2",
      campaignNumber: 13,
      name: "AYUDAR A SUBIR RESUMEN_copy",
      subject: "Guía paso a paso para cargar tu abstract",
      previewText: "Revisa el tutorial antes de la fecha de cierre",
      senderName: "IIAP",
      senderEmail: "daylersan@gmail.com",
      replyTo: "daylersan@gmail.com",
      status: "SENT",
      createdAt: "2024-08-30T09:00:00.000Z",
      sentAt: "2024-08-30T14:11:00.000Z",
      channel: "EMAIL",
      segmentIds: ["seg-1"],
      segmentNames: ["Participantes CONIAP 2024"],
      recipientCount: 112,
      stats: {
        delivered: 110,
        deliveredRate: 98.21,
        opens: 72,
        openRate: 65.45,
        clicks: 28,
        clickRate: 25.45,
        unsubscribes: 1,
        unsubscribeRate: 0.9,
      },
    },
    {
      id: "camp-3",
      campaignNumber: 16,
      name: "webinar",
      subject: "Invitación al Webinar Pre-Congreso",
      previewText: "Conoce a los ponentes principales este jueves",
      senderName: selectedOrganization?.name || "IIAP",
      senderEmail: "daylersan@gmail.com",
      replyTo: "daylersan@gmail.com",
      status: "DRAFT",
      createdAt: "2024-10-01T15:30:00.000Z",
      channel: "EMAIL",
      segmentIds: ["seg-1"],
      segmentNames: ["Participantes CONIAP 2024"],
      recipientCount: 88,
    },
  ])
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; sourceTemplateId?: string | null; tags?: string[] }>>([])
  const [totalContacts, setTotalContacts] = useState(0)

  const [automations, setAutomations] = useState<Automation[]>([
    {
      id: "auto-1",
      name: "Confirmación y Bienvenida CONIAP 2024",
      trigger: "REGISTRATION",
      channel: "EMAIL",
      active: true,
      segmentIds: ["seg-1"],
      createdAt: "2024-08-01T00:00:00.000Z",
      sentCount: 234,
      description: "Envío inmediato del ticket digital y credenciales tras registro",
    },
    {
      id: "auto-2",
      name: "Recordatorio 24 horas antes del inicio",
      trigger: "EVENT_REMINDER",
      channel: "EMAIL",
      active: true,
      segmentIds: ["seg-1"],
      createdAt: "2024-08-15T00:00:00.000Z",
      sentCount: 180,
      description: "Alerta con enlace Zoom y ubicación del auditorio",
    },
    {
      id: "auto-3",
      name: "Entrega de Certificados Oficiales",
      trigger: "CERTIFICATE_ISSUED",
      channel: "EMAIL",
      active: true,
      segmentIds: ["seg-1"],
      createdAt: "2024-09-01T00:00:00.000Z",
      sentCount: 88,
      description: "Envío del PDF y código QR de verificación al aprobar",
    },
  ])

  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: "con-1",
      email: "maria.torres@unap.edu.pe",
      firstName: "María",
      lastName: "Torres",
      phone: "+51 965 123 456",
      status: "SUBSCRIBED",
      tags: ["CONIAP 2024", "Docente"],
      createdAt: "2024-08-10T12:00:00.000Z",
    },
    {
      id: "con-2",
      email: "carlos.mendoza@iiap.gob.pe",
      firstName: "Carlos",
      lastName: "Mendoza",
      phone: "+51 987 654 321",
      status: "SUBSCRIBED",
      tags: ["CONIAP 2024", "Ponente"],
      createdAt: "2024-08-12T14:30:00.000Z",
    },
    {
      id: "con-3",
      email: "lucia.valdez@gmail.com",
      firstName: "Lucía",
      lastName: "Valdez",
      phone: "+51 999 888 777",
      status: "SUBSCRIBED",
      tags: ["Estudiante"],
      createdAt: "2024-08-15T09:20:00.000Z",
    },
    {
      id: "con-4",
      email: "juan.perez@concytec.gob.pe",
      firstName: "Juan",
      lastName: "Pérez",
      phone: "+51 944 332 211",
      status: "SUBSCRIBED",
      tags: ["Investigador"],
      createdAt: "2024-08-20T16:40:00.000Z",
    },
    {
      id: "con-5",
      email: "daylersan@gmail.com",
      firstName: "Dayler",
      lastName: "San",
      phone: "+51 955 444 333",
      status: "SUBSCRIBED",
      tags: ["Admin", "Organizador"],
      createdAt: "2024-08-01T08:00:00.000Z",
    },
  ])

  const [segments, setSegments] = useState<Segment[]>([
    {
      id: "seg-1",
      name: "Participantes CONIAP 2024",
      description: "Todos los inscritos y asistentes confirmados",
      createdAt: "2024-08-01T00:00:00.000Z",
      _count: { members: 88 },
    },
    {
      id: "seg-2",
      name: "Ponentes y Expositores",
      description: "Speakers con ponencias aprobadas",
      createdAt: "2024-08-05T00:00:00.000Z",
      _count: { members: 24 },
    },
    {
      id: "seg-3",
      name: "Estudiantes y Becarios",
      description: "Alumnos de pregrado y posgrado",
      createdAt: "2024-08-10T00:00:00.000Z",
      _count: { members: 142 },
    },
  ])

  // Load from API if available
  const loadData = async () => {
    if (!organizationId) return
    // Nunca conservar datos de demostración: la API es la única fuente de verdad.
    setCampaigns([])
    setAutomations([])
    setContacts([])
    setSegments([])
    try {
      const [cRes, sRes, caRes, aRes] = await Promise.allSettled([
        api.marketing.contacts(organizationId, contactsSearch, contactsPage),
        api.marketing.segments(organizationId),
        api.marketing.campaigns(organizationId),
        api.marketing.automations(organizationId),
      ])

      if (cRes.status === "fulfilled") {
        const contactItems = Array.isArray(cRes.value) ? cRes.value : cRes.value.items || []
        setContacts(contactItems.map(normalizeContact))
        setTotalContacts(Array.isArray(cRes.value) ? contactItems.length : Number(cRes.value.total || 0))
      }
      if (sRes.status === "fulfilled" && Array.isArray(sRes.value)) {
        setSegments(sRes.value)
      }
      if (caRes.status === "fulfilled" && Array.isArray(caRes.value)) {
        setCampaigns(caRes.value.map((campaign: any, index: number) => normalizeCampaign(campaign, selectedOrganization?.name, index)))
      }
      if (aRes.status === "fulfilled" && Array.isArray(aRes.value)) {
        setAutomations((prev) => {
          if (aRes.value.length === 0) return []
          const merged = [...prev]
          aRes.value.forEach((x: any) => {
            if (!merged.some((m) => m.id === x.id)) {
              merged.push({
                id: x.id,
                name: x.name,
                trigger: x.trigger || "REGISTRATION",
                channel: "EMAIL",
                active: x.active ?? true,
                segmentIds: x.segmentIds || [],
                createdAt: x.createdAt || new Date().toISOString(),
                sentCount: 0,
              })
            }
          })
          return merged
        })
      }
    } catch {
      // Keep existing demo seed
    }
  }

  useEffect(() => {
    void loadData()
  }, [organizationId, contactsSearch, contactsPage])

  useEffect(() => {
    if (!organizationId) return
    api.emailTemplates.list(organizationId).then((items) => setTemplates(items.map((item) => ({
      id: item.id,
      name: item.name,
      sourceTemplateId: item.sourceTemplateId,
      tags: item.tags || [],
    })))).catch(() => setTemplates([]))
  }, [organizationId])

  useEffect(() => {
    if (!campaignId) return
    const campaign = campaigns.find((item) => item.id === campaignId)
    if (campaign) { setSelectedCampaign(campaign); setViewMode("setup") }
  }, [campaignId, campaigns])

  // Handlers
  const handleOpenReport = (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setViewMode("report")
  }

  const handleOpenSetupBuilder = (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setViewMode("setup")
  }

  const handleCreateEmailCampaign = async (data: { name: string; type: "regular" | "ab"; tags: string[]; folder?: string }) => {
    if (!organizationId) { toast.error("Selecciona una institución antes de crear la campaña."); return }
    try {
      const created = await api.marketing.createCampaign(organizationId, { name: data.name, subject: "", segmentIds: [], settings: { tags: data.tags } })
      const newCamp = normalizeCampaign(created, selectedOrganization?.name, campaigns.length)
      setCampaigns((current) => [newCamp, ...current])
      setOpenCreateEmailModal(false)
      toast.success(`Campaña "${data.name}" creada.`)
      navigate(`/dashboard/marketing/campaigns/${created.id}/settings`)
    } catch (error: any) {
      toast.error(error?.message || "No se pudo crear la campaña.")
    }
  }

  const handleSaveCampaign = (updated: Campaign) => {
    setCampaigns((current) => current.map((campaign) => (campaign.id === updated.id ? updated : campaign)))
    setSelectedCampaign((current) => current?.id === updated.id ? updated : current)
    if (organizationId) {
      void api.marketing.updateCampaign(organizationId, updated.id, {
        name: updated.name, subject: updated.subject, segmentIds: updated.segmentIds,
        status: updated.status, scheduledAt: updated.scheduledAt,
        settings: { senderName: updated.senderName, senderEmail: updated.senderEmail, replyTo: updated.replyTo, previewText: updated.previewText, templateId: updated.templateId, sourceTemplateId: updated.sourceTemplateId, eventContext: updated.eventContext, content: updated.content, recipientCount: updated.recipientCount, tags: updated.tags },
      }).catch((error: any) => toast.error(error?.message || "No se pudo guardar la campaña."))
    }
  }

  const handleSelectCampaignTemplate = async (campaign: Campaign, sourceTemplateId: string): Promise<Campaign | null> => {
    if (!organizationId) return null
    try {
      // El endpoint devuelve siempre la misma copia privada para esta campaña y plantilla base.
      const copy = await api.emailTemplates.duplicate(sourceTemplateId, { campaignId: campaign.id, name: `${campaign.name} · Plantilla de campaña` })
      const updated = { ...campaign, templateId: copy.id, sourceTemplateId: copy.sourceTemplateId || sourceTemplateId }
      setTemplates((current) => current.some((item) => item.id === copy.id) ? current : [...current, { id: copy.id, name: copy.name, sourceTemplateId: copy.sourceTemplateId, tags: copy.tags || [] }])
      handleSaveCampaign(updated)
      toast.success("Se creó una copia privada de la plantilla para esta campaña.")
      return updated
    } catch (error: any) {
      toast.error(error?.message || "No se pudo preparar la plantilla de la campaña.")
      return null
    }
  }

  const handleLaunchCampaign = (launched: Campaign, _scheduledAt?: string) => {
    setCampaigns(campaigns.map((c) => (c.id === launched.id ? launched : c)))
    setViewMode("list")
  }

  const handleDuplicateCampaign = (campaign: Campaign) => {
    const dup: Campaign = {
      ...campaign,
      id: `camp-${Date.now()}`,
      campaignNumber: campaigns.length + 1,
      name: `${campaign.name}_copy`,
      status: "DRAFT",
      sentAt: undefined,
      createdAt: new Date().toISOString(),
    }
    setCampaigns([dup, ...campaigns])
    toast.success(`Campaña duplicada como "${dup.name}"`)
  }

  const handleDeleteCampaign = async (id: string) => {
    if (!organizationId) return
    try {
      await api.marketing.removeCampaign(organizationId, id)
      setCampaigns((current) => current.filter((campaign) => campaign.id !== id))
      setSelectedCampaign((current) => current?.id === id ? null : current)
      toast.success("Campaña y su copia privada de plantilla eliminadas.")
    } catch (error: any) {
      toast.error(error?.message || "No se pudo eliminar la campaña.")
    }
  }

  const handleCreateAutomation = (data: any) => {
    const newAuto: Automation = {
      id: `auto-${Date.now()}`,
      name: data.name,
      trigger: data.trigger || "REGISTRATION",
      channel: data.channel || "EMAIL",
      active: true,
      segmentIds: data.segmentIds || ["seg-1"],
      createdAt: new Date().toISOString(),
      sentCount: 0,
      description: data.description,
    }
    setAutomations([newAuto, ...automations])
    if (organizationId) {
      void api.marketing
        .createAutomation(organizationId, {
          name: data.name,
          trigger: data.trigger,
          segmentIds: data.segmentIds || [],
        })
        .catch(() => { })
    }
  }

  const handleAddContact = async (data: { email: string; firstName?: string; lastName?: string; tags?: string[] }) => {
    const newContact: Contact = {
      id: `con-${Date.now()}`,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      status: "SUBSCRIBED",
      tags: data.tags || ["Manual"],
      createdAt: new Date().toISOString(),
    }
    if (!organizationId) return
    try {
      const created = await api.marketing.createContact(organizationId, data)
      setContacts((current) => [normalizeContact({ ...newContact, ...created, ...data }), ...current])
    } catch (error: any) {
      toast.error(error?.message || "No se pudo guardar el contacto.")
    }
  }

  const handleDeleteContact = (id: string) => {
    setContacts(contacts.filter((c) => c.id !== id))
    toast.success("Contacto eliminado")
    if (organizationId) {
      void api.marketing.removeContact(organizationId, id).catch(() => { })
    }
  }

  const handleCreateSegment = (data: { name: string; description?: string }) => {
    const newSeg: Segment = {
      id: `seg-${Date.now()}`,
      name: data.name,
      description: data.description,
      createdAt: new Date().toISOString(),
      _count: { members: 0 },
    }
    setSegments([...segments, newSeg])
    if (organizationId) {
      void api.marketing.createSegment(organizationId, data).catch(() => { })
    }
  }

  const handleDeleteSegment = (id: string) => {
    setSegments(segments.filter((s) => s.id !== id))
    toast.success("Segmento eliminado")
    if (organizationId) {
      void api.marketing.removeSegment(organizationId, id).catch(() => { })
    }
  }

  return (
    <div className="container mx-auto space-y-6">
      {/* 1. REPORT VIEW (Matches Reference Image 2) */}
      {viewMode === "report" && selectedCampaign && (
        <CampaignReportView
          campaign={selectedCampaign}
          onBack={() => {
            setSelectedCampaign(null)
            setViewMode("list")
          }}
        />
      )}

      {/* 2. SETUP CHECKLIST WORKFLOW (Matches Reference Image 5) */}
      {viewMode === "setup" && selectedCampaign && (
        <CampaignSetupBuilder
          campaign={selectedCampaign}
          segments={segments}
          templates={templates.filter((template) => !template.sourceTemplateId && !template.tags?.includes("campaign-copy"))}
          onBack={() => {
            setSelectedCampaign(null)
            setViewMode("list")
          }}
          onSaveCampaign={handleSaveCampaign}
          onLaunchCampaign={handleLaunchCampaign}
          onSelectTemplate={handleSelectCampaignTemplate}
          onEditTemplate={async (campaign, templateId, eventContext) => {
            let privateTemplateId = templateId
            const selectedTemplate = templates.find((template) => template.id === templateId)
            const isPrivateCopy = selectedTemplate?.tags?.includes(`campaign:${campaign.id}`)

            // Compatibilidad con campañas creadas antes de que las copias llevaran
            // etiqueta: se corrigen antes de abrir el editor, sin tocar la base.
            if (!isPrivateCopy) {
              try {
                const copy = await api.emailTemplates.duplicate(campaign.sourceTemplateId || templateId, {
                  campaignId: campaign.id,
                  name: `${campaign.name} · Plantilla de campaña`,
                })
                privateTemplateId = copy.id
                const updated = { ...campaign, templateId: copy.id, sourceTemplateId: copy.sourceTemplateId || campaign.sourceTemplateId || templateId }
                setTemplates((current) => current.some((template) => template.id === copy.id) ? current : [...current, { id: copy.id, name: copy.name, sourceTemplateId: copy.sourceTemplateId, tags: copy.tags || [] }])
                handleSaveCampaign(updated)
              } catch (error: any) {
                toast.error(error?.message || "No se pudo preparar la copia privada de la campaña.")
                return
              }
            }
            const query = new URLSearchParams()
            query.set("campaignId", campaign.id)
            if (eventContext?.eventId) query.set("eventId", eventContext.eventId)
            if (eventContext?.editionId) query.set("editionId", eventContext.editionId)
            if (eventContext?.label) query.set("eventLabel", eventContext.label)
            navigate(`/dashboard/templates/${privateTemplateId}/builder${query.size ? `?${query}` : ""}`)
          }}
        />
      )}

      {/* 3. EMAIL CAMPAIGNS */}
      {viewMode === "list" && (
        <div className="space-y-6">
          <PageHeader title="Campañas de email" description="Crea, diseña, programa y consulta el rendimiento de tus comunicaciones." actionButton={<Button onClick={() => setOpenCreateEmailModal(true)} className="rounded-xl h-10 px-5 text-xs font-semibold"><Plus className="size-4 mr-2" />Crear campaña</Button>} />

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-8 border-b border-border/80 text-sm font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveTab("campaigns")}
              className={`pb-3 border-b-2 transition-all flex items-center gap-2 shrink-0 ${activeTab === "campaigns"
                ? "border-violet-600 text-violet-600 dark:text-violet-400 font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              <Mail className="size-4" />
              <span>Campañas</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
                {campaigns.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("automations")}
              disabled
              title="Automatizaciones estarán disponibles próximamente"
              className={`order-last pb-3 border-b-2 transition-all flex items-center gap-2 shrink-0 opacity-50 cursor-not-allowed ${activeTab === "automations"
                ? "border-violet-600 text-violet-600 dark:text-violet-400 font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              <Zap className="size-4 text-amber-500" />
              <span>Automatizaciones</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                {automations.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("contacts")}
              className={`pb-3 border-b-2 transition-all flex items-center gap-2 shrink-0 ${activeTab === "contacts"
                ? "border-violet-600 text-violet-600 dark:text-violet-400 font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              <Users className="size-4" />
              <span>Contactos</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                {contacts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("segments")}
              className={`pb-3 border-b-2 transition-all flex items-center gap-2 shrink-0 ${activeTab === "segments"
                ? "border-violet-600 text-violet-600 dark:text-violet-400 font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              <Layers className="size-4" />
              <span>Segmentos</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                {segments.length}
              </span>
            </button>
          </div>

          {/* Active Tab View */}
          {activeTab === "campaigns" && (
            <CampaignsTab
              campaigns={campaigns}
              onOpenCreateCampaign={() => setOpenCreateEmailModal(true)}
              onOpenReport={handleOpenReport}
              onOpenSetupBuilder={handleOpenSetupBuilder}
              onDuplicateCampaign={handleDuplicateCampaign}
              onDeleteCampaign={handleDeleteCampaign}
            />
          )}

          {activeTab === "automations" && (
            <AutomationsTab
              automations={automations}
              segments={segments}
              onCreateAutomation={handleCreateAutomation}
            />
          )}

          {activeTab === "contacts" && (
            <ContactsTab
              contacts={contacts}
              page={contactsPage}
              totalItems={totalContacts}
              onPageChange={(page) => { const next = new URLSearchParams(searchParams); next.set("page", String(page)); setSearchParams(next) }}
              onAddContact={handleAddContact}
              onDeleteContact={handleDeleteContact}
            />
          )}

          {activeTab === "segments" && (
            <SegmentsTab
              segments={segments}
              onCreateSegment={handleCreateSegment}
              onDeleteSegment={handleDeleteSegment}
            />
          )}
        </div>
      )}

      {/* Crear una campaña de email */}
      <CreateEmailCampaignModal
        open={openCreateEmailModal}
        onOpenChange={setOpenCreateEmailModal}
        onCreate={handleCreateEmailCampaign}
      />
    </div>
  )
}
