import { useEffect, useCallback, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuthStore } from "@/store/auth.store"
import { useEventStore, type EventFilters } from "@/store/event.store"
import { DynamicFilters, type FilterConfig, type FilterValues } from "@/components/ui/dynamic-filters"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, Globe, Plus, Grid2X2, List, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/page-header"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

const FILTER_CONFIGS: FilterConfig[] = [
  {
    key: "search",
    label: "Buscar",
    type: "text",
    placeholder: "Buscar eventos...",
    isBasic: true,
  },
  {
    key: "status",
    label: "Estado",
    type: "select",
    placeholder: "Todos",
    options: [
      { value: "published", label: "Publicados" },
      { value: "draft", label: "Borradores" },
      { value: "archived", label: "Archivados" },
    ],
    isBasic: true,
  },
  {
    key: "hasEditions",
    label: "Con Ediciones",
    type: "select",
    placeholder: "Todos",
    options: [
      { value: "true", label: "Sí" },
      { value: "false", label: "No" },
    ],
    isBasic: false,
  },
]

function DeleteEventDialog({ event }: { event: any }) {
  const [confirmation, setConfirmation] = useState("")
  return <AlertDialog onOpenChange={(open) => { if (!open) setConfirmation("") }}>
    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" title="Eliminar evento" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}><Trash2 className="size-4 text-destructive" /></Button></AlertDialogTrigger>
    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
      <AlertDialogHeader><AlertDialogTitle>¿Eliminar este evento?</AlertDialogTitle><AlertDialogDescription>Esta acción eliminará permanentemente “{event.name}”, sus ediciones, ponentes, agenda y participantes. Escribe ELIMINAR para confirmar.</AlertDialogDescription></AlertDialogHeader>
      <Input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="Escribe ELIMINAR" autoFocus />
      <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction disabled={confirmation !== "ELIMINAR"}
        className="bg-red-500 text-white"
        onClick={() => useEventStore.getState().deleteEvent(event.id)}>Sí, eliminar</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}

const defaultBanner = "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=60"

function EventCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col h-full">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <div className="border-t border-border pt-4 flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </div>
  )
}

function EventTableSkeleton() {
  return <div className="overflow-hidden rounded-xl border border-border bg-background">
    <div className="grid grid-cols-[5rem_minmax(14rem,1fr)_7rem_8rem_8rem] gap-4 border-b border-border bg-muted p-4">
      {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-3 w-16" />)}
    </div>
    {Array.from({ length: 8 }).map((_, row) => <div key={row} className="grid grid-cols-[5rem_minmax(14rem,1fr)_7rem_8rem_8rem] items-center gap-4 border-b border-border/50 p-4 last:border-b-0">
      <Skeleton className="h-10 w-16 rounded-md" />
      <div className="space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-20 justify-self-end rounded-md" />
    </div>)}
  </div>
}

import { useSEO } from "@/hooks/use-seo"

export function EventsPage() {
  const { selectedOrganization } = useAuthStore()
  const { events, editions, isLoading, loadData } = useEventStore()
  const navigate = useNavigate()

  useSEO({
    title: "Eventos",
    description: selectedOrganization
      ? `Lista de eventos, borradores y conferencias publicadas para la organización ${selectedOrganization.name}.`
      : "Listado de eventos de la organización."
  })

  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get("view") === "grid" ? "grid" : "table"
  const setView = (nextView: "grid" | "table") => {
    const params = new URLSearchParams(searchParams)
    params.set("view", nextView)
    setSearchParams(params)
  }

  const filterValues = useMemo<FilterValues>(() => {
    const values: FilterValues = {}
    FILTER_CONFIGS.forEach((filter) => {
      const val = searchParams.get(filter.key)
      if (val !== null) {
        values[filter.key] = val
      }
    })
    return values
  }, [searchParams])

  const fetchEvents = useCallback(() => {
    if (!selectedOrganization?.id) return
    const filters: EventFilters = {}
    if (filterValues.search) filters.search = filterValues.search as string
    if (filterValues.status) filters.status = filterValues.status as string
    if (filterValues.hasEditions) filters.hasEditions = filterValues.hasEditions as string
    loadData(selectedOrganization.id, filters)
  }, [selectedOrganization?.id, filterValues, loadData])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleFiltersChange = (values: FilterValues) => {
    const newParams = new URLSearchParams(searchParams.toString())
    FILTER_CONFIGS.forEach((filter) => {
      const val = values[filter.key]
      if (val !== undefined && val !== null && val !== "" && val !== "ALL") {
        newParams.set(filter.key, String(val))
      } else {
        newParams.delete(filter.key)
      }
    })
    setSearchParams(newParams)
  }

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "published":
        return <span className="bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">Publicado</span>
      case "archived":
        return <span className="bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">Archivado</span>
      default:
        return <span className="bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">Borrador</span>
    }
  }

  const thumbnailFor = (event: any) => event.coverUrl || editions.find((edition) => edition.mainEventId === event.id && edition.isCurrent)?.coverUrl || editions.find((edition) => edition.mainEventId === event.id)?.coverUrl || defaultBanner
  const eventColumns: ColumnDef<any>[] = [
    { header: "Miniatura", cell: (event) => <img src={thumbnailFor(event)} onError={(image) => { image.currentTarget.src = defaultBanner }} alt={`Portada de ${event.name}`} className="h-10 w-16 rounded-md object-cover" /> },
    { header: "Evento", cell: (event) => <div className="min-w-48 max-w-md"><button type="button" title={`Abrir ${event.name}`} onClick={() => navigate(`/dashboard/events/${event.id}`)} className="cursor-pointer text-left font-semibold text-foreground hover:text-primary hover:underline">{event.name}</button><p className="mt-0.5 truncate text-xs text-muted-foreground">{event.shortDescription || "Sin descripción"}</p></div> },
    { header: "Estado", cell: (event) => getStatusBadge(event.status) },
    { header: "Creado", cell: (event) => event.createdAt ? new Date(event.createdAt).toLocaleDateString("es-ES") : "—" },
    { header: "Acción", headerClassName: "text-right", className: "text-right", cell: (event) => <div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/events/${event.id}`)}>Gestionar</Button><DeleteEventDialog event={event} /></div> },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        title="Eventos"
        description={`Administra el catálogo de conferencias y congresos para ${selectedOrganization?.name}.`}
        actionButton={
          <Button
            onClick={() => navigate("/dashboard/events/new")}
            className="flex items-center gap-2"
          >
            <Plus className="size-4" />
            Nuevo Evento
          </Button>
        }
      />

      {/* Filters */}
      <DynamicFilters
        filters={FILTER_CONFIGS}
        values={filterValues}
        onChange={handleFiltersChange}
        modalTitle="Filtros de Eventos"
        trailingContent={<div className="flex gap-1 border-l border-border pl-2">
          <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" className="size-8" title="Vista en cuadrícula" onClick={() => setView("grid")}><Grid2X2 className="size-4" /></Button>
          <Button variant={view === "table" ? "secondary" : "ghost"} size="icon" className="size-8" title="Vista en tabla" onClick={() => setView("table")}><List className="size-4" /></Button>
        </div>}
      />

      {/* Events Grid */}
      {isLoading ? (
        view === "table" ? <EventTableSkeleton /> :
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-border rounded-xl bg-card space-y-4">
          <Calendar className="size-12 mx-auto text-muted-foreground" />
          <h3 className="font-bold text-lg">No hay eventos en este momento</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {filterValues.search || filterValues.status
              ? "No se encontraron eventos con los filtros aplicados."
              : "Comienza registrando un nuevo evento para publicar agendas, ponentes e inscripciones."}
          </p>
          {!filterValues.search && !filterValues.status && (
            <Button onClick={() => navigate("/dashboard/events/new")} variant="outline">
              Crear Evento
            </Button>
          )}
        </div>
      ) : view === "table" ? (
        <DataTable columns={eventColumns} data={events} maxHeight="36rem" />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all flex flex-col h-full"
            >
              <div className="h-44 w-full overflow-hidden bg-muted relative">
                <img
                  src={thumbnailFor(event)}
                  onError={(image) => { image.currentTarget.src = defaultBanner }}
                  alt={event.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3 z-10">
                  {getStatusBadge(event.status)}
                </div>
                {!event.isActive && (
                  <div className="absolute top-3 left-3 z-10">
                    <span className="bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">Inactivo</span>
                  </div>
                )}
              </div>

              <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    {event.contactEmail && (
                      <span className="text-[10px] text-muted-foreground font-semibold truncate max-w-[150px]">
                        {event.contactEmail}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 shrink-0">
                      <Calendar className="size-3" />
                      {event.createdAt ? new Date(event.createdAt).toLocaleDateString("es-ES", { year: "numeric", month: "short" }) : ""}
                    </span>
                  </div>
                  <button type="button" title={`Abrir ${event.name}`} onClick={() => navigate(`/dashboard/events/${event.id}`)} className="cursor-pointer text-left font-bold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                    {event.name}
                  </button>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {event.shortDescription || "Sin descripción proporcionada."}
                  </p>
                </div>

                <div className="border-t border-border pt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {event.websiteUrl && (
                      <a
                        href={event.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <Globe className="size-3.5" />
                        Web
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" title={`Gestionar ${event.name}`} className="cursor-pointer h-7 px-2 text-xs" onClick={() => navigate(`/dashboard/events/${event.id}`)}>Gestionar</Button>
                    <DeleteEventDialog event={event} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
