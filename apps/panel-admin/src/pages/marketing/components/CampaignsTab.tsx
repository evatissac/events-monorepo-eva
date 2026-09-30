import { useState } from "react"
import {
  Search,
  Plus,
  Activity,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Eye,
  Send,
  Calendar,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import type { Campaign } from "../types"
import { Skeleton } from "@/components/ui/skeleton"

interface CampaignsTabProps {
  loading?: boolean
  campaigns: Campaign[]
  onOpenCreateCampaign: () => void
  onOpenReport: (campaign: Campaign) => void
  onOpenSetupBuilder: (campaign: Campaign) => void
  onDuplicateCampaign: (campaign: Campaign) => void
  onDeleteCampaign: (id: string) => void
}

export function CampaignsTab({
  loading = false,
  campaigns,
  onOpenCreateCampaign,
  onOpenReport,
  onOpenSetupBuilder,
  onDuplicateCampaign,
  onDeleteCampaign,
}: CampaignsTabProps) {
  const [filterStatus, setFilterStatus] = useState<"ALL" | "SENT" | "DRAFT" | "SCHEDULED">("ALL")
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesStatus = filterStatus === "ALL" || c.status === filterStatus
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.subject?.toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCampaigns.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredCampaigns.map((c) => c.id))
    }
  }

  return (
    <div className="space-y-5">
      {loading ? <div className="space-y-4"><Skeleton className="h-10 w-full" />{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-xl" />)}</div> : <>
      {/* Top Filter pills & Search bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setFilterStatus("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === "ALL"
                ? "bg-card text-foreground shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Todas ({campaigns.length})
          </button>
          <button
            onClick={() => setFilterStatus("SENT")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === "SENT"
                ? "bg-card text-foreground shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Enviadas ({campaigns.filter((c) => c.status === "SENT").length})
          </button>
          <button
            onClick={() => setFilterStatus("DRAFT")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === "DRAFT"
                ? "bg-card text-foreground shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Borradores ({campaigns.filter((c) => c.status === "DRAFT").length})
          </button>
          <button
            onClick={() => setFilterStatus("SCHEDULED")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === "SCHEDULED"
                ? "bg-card text-foreground shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Programadas ({campaigns.filter((c) => c.status === "SCHEDULED").length})
          </button>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar campaña..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs rounded-xl border-border bg-background"
            />
          </div>

          <Button
            onClick={onOpenCreateCampaign}
            className="rounded-xl h-9 px-4 font-semibold bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-primary dark:text-primary-foreground text-xs shadow-sm flex items-center gap-1.5 shrink-0"
          >
            <Plus className="size-3.5" />
            <span>Crear campaña</span>
          </Button>
        </div>
      </div>

      {/* Campaigns List (Matches Reference Image 1) */}
      {filteredCampaigns.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card/40 p-12 text-center space-y-4 max-w-lg mx-auto my-6">
          <img src="/svg/empty_marketing.svg" alt="Sin campañas de email" className="w-44 h-36 object-contain mx-auto" />
          <div>
            <h3 className="font-bold text-foreground text-base">No hay campañas que coincidan</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Crea tu primera campaña de correo o ajusta los filtros de búsqueda.
            </p>
          </div>
          <Button
            onClick={onOpenCreateCampaign}
            className="rounded-xl h-9 px-5 text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-primary dark:text-primary-foreground"
          >
            <Plus className="mr-1.5 size-3.5" />
            Crear primera campaña
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCampaigns.map((campaign) => {
            const isChecked = selectedIds.includes(campaign.id)
            const isSent = campaign.status === "SENT"
            const isDraft = campaign.status === "DRAFT"
            const isScheduled = campaign.status === "SCHEDULED"

            return (
              <div
                key={campaign.id}
                className="group rounded-2xl border border-border/80 bg-card p-5 shadow-2xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-violet-500/30"
              >
                {/* Left side: Checkbox + Title + Status Dot + Date */}
                <div className="flex items-start gap-4">
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(campaign.id)}
                      className="size-4 rounded border-border accent-violet-600 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <h3
                      onClick={() =>
                        isSent ? onOpenReport(campaign) : onOpenSetupBuilder(campaign)
                      }
                      className="text-sm font-bold text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors uppercase tracking-tight cursor-pointer"
                    >
                      {campaign.name}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                      {/* Status indicator matching Image 1 */}
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <span
                          className={`size-2 rounded-full ${
                            isSent
                              ? "bg-emerald-500"
                              : isScheduled
                              ? "bg-blue-500"
                              : "bg-amber-500"
                          }`}
                        />
                        <span className={isSent ? "text-emerald-600 dark:text-emerald-400" : isScheduled ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}>
                          {isSent ? "Enviada" : isScheduled ? "Programada" : "Borrador"}
                        </span>
                      </span>

                      <span>
                        {isSent
                          ? `Enviada el ${campaign.sentAt ? new Date(campaign.sentAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "19 sept 2024"} ${campaign.sentAt ? new Date(campaign.sentAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "20:38"}`
                          : isScheduled
                          ? `Programada para el ${campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "25 sept 2024"}`
                          : `Creada el ${new Date(campaign.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`}
                      </span>

                      <span className="text-muted-foreground/60">
                        #{campaign.campaignNumber || 15}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side: Notice text + Mostrar datos / Editar + Action icons (Matches Reference Image 1) */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:gap-6 pl-8 md:pl-0">
                  {/* Subtle info label (Image 1) */}
                  <div className="hidden lg:block text-right max-w-xs">
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Mostramos datos de los últimos 12 meses. Puedes acceder a los datos de esta campaña en informes o utilizando <span className="font-semibold text-foreground">Mostrar datos</span>.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {/* Link "Mostrar datos" or "Configurar" */}
                    {isSent ? (
                      <button
                        onClick={() => onOpenReport(campaign)}
                        className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors cursor-pointer"
                      >
                        Mostrar datos
                      </button>
                    ) : (
                      <button
                        onClick={() => onOpenSetupBuilder(campaign)}
                        className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors cursor-pointer"
                      >
                        Configurar
                      </button>
                    )}

                    {/* Analytics / Pulse Icon (Image 1) */}
                    <button
                      onClick={() => onOpenReport(campaign)}
                      className="p-1.5 rounded-lg text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 transition-colors"
                      title="Ver análisis de entrega"
                    >
                      <Activity className="size-4" />
                    </button>

                    {/* Three dots dropdown menu (Image 1) */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          <MoreVertical className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl w-44">
                        <DropdownMenuItem
                          onClick={() => onOpenReport(campaign)}
                          className="text-xs cursor-pointer"
                        >
                          <Activity className="mr-2 size-3.5 text-violet-600" />
                          Ver informe completo
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onOpenSetupBuilder(campaign)}
                          className="text-xs cursor-pointer"
                        >
                          <Edit2 className="mr-2 size-3.5 text-foreground" />
                          Editar / Configurar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDuplicateCampaign(campaign)}
                          className="text-xs cursor-pointer"
                        >
                          <Copy className="mr-2 size-3.5 text-foreground" />
                          Duplicar campaña
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDeleteCampaign(campaign.id)}
                          className="text-xs cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 size-3.5" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </>}
    </div>
  )
}
