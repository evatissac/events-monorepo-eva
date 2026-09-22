import { useState } from "react"
import {
  ArrowLeft,
  Crown,
  Edit2,
  Eye,
  Send,
  Settings2,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import type { Campaign, Segment } from "../types"
import { SenderModal } from "./SenderModal"
import { RecipientsModal } from "./RecipientsModal"
import { SubjectModal } from "./SubjectModal"
import { ScheduleModal } from "./ScheduleModal"
import { PreviewModal } from "./PreviewModal"

interface CampaignSetupBuilderProps {
  campaign: Campaign
  segments: Segment[]
  onBack: () => void
  onSaveCampaign: (updatedCampaign: Campaign) => void
  onLaunchCampaign: (campaign: Campaign, scheduledAt?: string) => void
}

export function CampaignSetupBuilder({
  campaign,
  segments,
  onBack,
  onSaveCampaign,
  onLaunchCampaign,
}: CampaignSetupBuilderProps) {
  const [current, setCurrent] = useState<Campaign>(campaign)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState(campaign.name)

  // Modals state
  const [openSenderModal, setOpenSenderModal] = useState(false)
  const [openRecipientsModal, setOpenRecipientsModal] = useState(false)
  const [openSubjectModal, setOpenSubjectModal] = useState(false)
  const [openScheduleModal, setOpenScheduleModal] = useState(false)
  const [openPreviewModal, setOpenPreviewModal] = useState(false)

  // Additional settings modal/drawer
  const [trackingClicks, setTrackingClicks] = useState(true)
  const [trackingOpens, setTrackingOpens] = useState(true)
  const [googleAnalyticsUtm, setGoogleAnalyticsUtm] = useState(true)
  const [openSettingsModal, setOpenSettingsModal] = useState(false)

  const isSenderDone = Boolean(current.senderName && current.senderEmail)
  const isRecipientsDone = Boolean(current.segmentIds && current.segmentIds.length > 0)
  const isSubjectDone = Boolean(current.subject && current.subject.trim().length > 0)
  const isDesignDone = Boolean(current.content || current.templateId || current.subject)

  const handleSaveTitle = () => {
    if (tempTitle.trim()) {
      const updated = { ...current, name: tempTitle.trim() }
      setCurrent(updated)
      onSaveCampaign(updated)
      setIsEditingTitle(false)
      toast.success("Nombre actualizado")
    }
  }

  const handleSaveSender = (data: { senderName: string; senderEmail: string; replyTo?: string }) => {
    const updated = {
      ...current,
      senderName: data.senderName,
      senderEmail: data.senderEmail,
      replyTo: data.replyTo,
    }
    setCurrent(updated)
    onSaveCampaign(updated)
    toast.success("Remitente configurado")
  }

  const handleSaveRecipients = (segmentIds: string[]) => {
    const totalCount = segments
      .filter((s) => segmentIds.includes(s.id))
      .reduce((acc, curr) => acc + (curr._count?.members || 1), 0)

    const updated = {
      ...current,
      segmentIds,
      recipientCount: totalCount,
    }
    setCurrent(updated)
    onSaveCampaign(updated)
    toast.success("Destinatarios actualizados")
  }

  const handleSaveSubject = (data: { subject: string; previewText: string }) => {
    const updated = {
      ...current,
      subject: data.subject,
      previewText: data.previewText,
    }
    setCurrent(updated)
    onSaveCampaign(updated)
    toast.success("Asunto guardado")
  }

  const handleSendNow = () => {
    const updated: Campaign = {
      ...current,
      status: "SENT",
      sentAt: new Date().toISOString(),
    }
    setCurrent(updated)
    onLaunchCampaign(updated)
    toast.success("¡Campaña enviada con éxito!")
  }

  const handleSchedule = (datetime: string) => {
    const updated: Campaign = {
      ...current,
      status: "SCHEDULED",
      scheduledAt: datetime,
    }
    setCurrent(updated)
    onLaunchCampaign(updated, datetime)
    toast.success(`Campaña programada para ${new Date(datetime).toLocaleString()}`)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header (Matches Reference Image 5) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 border border-border rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Volver a campañas"
          >
            <ArrowLeft className="size-4" />
          </button>

          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                className="h-9 font-bold text-lg rounded-xl"
                autoFocus
              />
              <Button size="sm" onClick={handleSaveTitle} className="rounded-xl h-9 text-xs">
                Guardar
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {current.name}
              </h1>
              <button
                onClick={() => {
                  setTempTitle(current.name)
                  setIsEditingTitle(true)
                }}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
                title="Editar nombre"
              >
                <Edit2 className="size-4 text-violet-600 dark:text-violet-400" />
              </button>
            </div>
          )}

          <Badge
            variant="secondary"
            className="rounded-full px-3 py-0.5 text-xs font-semibold bg-muted text-muted-foreground"
          >
            {current.status === "SENT"
              ? "Enviada"
              : current.status === "SCHEDULED"
                ? "Programada"
                : "Borradores"}
          </Badge>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => setOpenPreviewModal(true)}
            className="rounded-xl h-10 px-4 font-semibold border-border text-foreground hover:bg-muted text-xs flex items-center gap-1.5"
          >
            <Eye className="size-4 text-muted-foreground" />
            <span>Vista previa y prueba</span>
          </Button>

          <Button
            onClick={() => setOpenScheduleModal(true)}
            disabled={!isSenderDone || !isRecipientsDone || !isSubjectDone}
            className="rounded-xl h-10 px-6 font-semibold bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-primary dark:text-primary-foreground text-xs shadow-sm flex items-center gap-2"
          >
            <Send className="size-3.5" />
            <span>Programar</span>
          </Button>
        </div>
      </div>

      {/* Main Checklist Card Container (Matches Reference Image 5) */}
      <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xs">
        {/* Banner: Añadir idiomas */}
        <div className="p-4 border-b border-border/50 bg-amber-500/5 dark:bg-amber-500/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
            <Crown className="size-4 fill-amber-500 text-amber-500" />
            <span>Añadir idiomas</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Envía versiones personalizadas según el idioma del contacto (Plan Pro)
          </span>
        </div>

        {/* 5 Step Items */}
        <div className="divide-y divide-border/60">
          {/* STEP 1: REMITENTE */}
          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
            <div className="flex items-start gap-4">
              <div className="mt-0.5">
                {isSenderDone ? (
                  <div className="size-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                    <Check className="size-4 stroke-[3]" />
                  </div>
                ) : (
                  <div className="size-7 rounded-full border-2 border-muted-foreground/30 bg-muted/40 flex items-center justify-center text-muted-foreground">
                    <span className="size-2 rounded-full bg-muted-foreground/40" />
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground">Remitente</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  {isSenderDone ? (
                    <span>
                      {current.senderName} · &lt;{current.senderEmail}&gt;
                    </span>
                  ) : (
                    "Configura quién envía este correo"
                  )}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setOpenSenderModal(true)}
              className="rounded-xl h-9 px-4 font-semibold text-xs border-border shrink-0 hover:bg-muted"
            >
              Gestionar remitente
            </Button>
          </div>

          {/* STEP 2: DESTINATARIOS */}
          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
            <div className="flex items-start gap-4">
              <div className="mt-0.5">
                {isRecipientsDone ? (
                  <div className="size-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                    <Check className="size-4 stroke-[3]" />
                  </div>
                ) : (
                  <div className="size-7 rounded-full border-2 border-muted-foreground/30 bg-muted/40 flex items-center justify-center text-muted-foreground">
                    <span className="size-2 rounded-full bg-muted-foreground/40" />
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground">Destinatarios</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  {isRecipientsDone
                    ? `${current.recipientCount || 0} contactos en ${current.segmentIds.length} lista(s)`
                    : "Las personas que reciben tu campaña"}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setOpenRecipientsModal(true)}
              className="rounded-xl h-9 px-4 font-semibold text-xs border-border shrink-0 hover:bg-muted"
            >
              {isRecipientsDone ? "Editar destinatarios" : "Añadir destinatarios"}
            </Button>
          </div>

          {/* STEP 3: ASUNTO */}
          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
            <div className="flex items-start gap-4">
              <div className="mt-0.5">
                {isSubjectDone ? (
                  <div className="size-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                    <Check className="size-4 stroke-[3]" />
                  </div>
                ) : (
                  <div className="size-7 rounded-full border-2 border-muted-foreground/30 bg-muted/40 flex items-center justify-center text-muted-foreground">
                    <span className="size-2 rounded-full bg-muted-foreground/40" />
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground">Asunto</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  {isSubjectDone ? (
                    <span className="text-foreground font-semibold">"{current.subject}"</span>
                  ) : (
                    "Añade un asunto para esta campaña."
                  )}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setOpenSubjectModal(true)}
              className="rounded-xl h-9 px-4 font-semibold text-xs border-border shrink-0 hover:bg-muted"
            >
              {isSubjectDone ? "Editar asunto" : "Añadir un asunto"}
            </Button>
          </div>

          {/* STEP 4: DISEÑO */}
          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
            <div className="flex items-start gap-4">
              <div className="mt-0.5">
                {isDesignDone ? (
                  <div className="size-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                    <Check className="size-4 stroke-[3]" />
                  </div>
                ) : (
                  <div className="size-7 rounded-full border-2 border-muted-foreground/30 bg-muted/40 flex items-center justify-center text-muted-foreground">
                    <span className="size-2 rounded-full bg-muted-foreground/40" />
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground">Diseño</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  Crea el contenido de tu email.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setOpenPreviewModal(true)}
              className="rounded-xl h-9 px-4 font-semibold text-xs border-border shrink-0 hover:bg-muted"
            >
              Empezar a diseñar
            </Button>
          </div>

          {/* STEP 5: CONFIGURACIÓN ADICIONAL */}
          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
            <div className="flex items-start gap-4">
              <div className="size-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground mt-0.5">
                <Settings2 className="size-4" />
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground">Configuración adicional</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  Seguimiento de aperturas, clics y etiquetas UTM activados.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setOpenSettingsModal(!openSettingsModal)}
              className="rounded-xl h-9 px-4 font-semibold text-xs border-border shrink-0 hover:bg-muted"
            >
              Modificar los ajustes
            </Button>
          </div>
        </div>

        {/* Collapsible Additional Settings */}
        {openSettingsModal && (
          <div className="p-6 bg-muted/30 border-t border-border/60 space-y-4 text-xs">
            <h4 className="font-bold text-foreground">Ajustes avanzados de entrega</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={trackingOpens}
                  onChange={(e) => setTrackingOpens(e.target.checked)}
                  className="rounded border-border size-4 accent-violet-600"
                />
                <span>Rastrear aperturas (Pixel)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={trackingClicks}
                  onChange={(e) => setTrackingClicks(e.target.checked)}
                  className="rounded border-border size-4 accent-violet-600"
                />
                <span>Rastrear clics en enlaces</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={googleAnalyticsUtm}
                  onChange={(e) => setGoogleAnalyticsUtm(e.target.checked)}
                  className="rounded border-border size-4 accent-violet-600"
                />
                <span>Etiquetas Google Analytics</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <SenderModal
        open={openSenderModal}
        onOpenChange={setOpenSenderModal}
        initialName={current.senderName}
        initialEmail={current.senderEmail}
        initialReplyTo={current.replyTo}
        onSave={handleSaveSender}
      />

      <RecipientsModal
        open={openRecipientsModal}
        onOpenChange={setOpenRecipientsModal}
        segments={segments}
        selectedSegmentIds={current.segmentIds}
        onSave={handleSaveRecipients}
      />

      <SubjectModal
        open={openSubjectModal}
        onOpenChange={setOpenSubjectModal}
        initialSubject={current.subject}
        initialPreviewText={current.previewText}
        onSave={handleSaveSubject}
      />

      <ScheduleModal
        open={openScheduleModal}
        onOpenChange={setOpenScheduleModal}
        recipientCount={current.recipientCount || 0}
        onSendNow={handleSendNow}
        onSchedule={handleSchedule}
      />

      <PreviewModal
        open={openPreviewModal}
        onOpenChange={setOpenPreviewModal}
        subject={current.subject}
        previewText={current.previewText}
        senderName={current.senderName}
        senderEmail={current.senderEmail}
        content={current.content}
      />
    </div>
  )
}
