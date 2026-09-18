import { useState, useEffect } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { useEventStore } from "@/store/event.store"
import { Plus, Edit, Trash2, Globe, Layers, BookOpen, Search, Loader2, UserCheck, Check, Download, Upload, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { TablePagination } from "@/components/ui/table-pagination"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { useSpeakers } from "@/hooks/use-speakers"
import { Skeleton } from "@/components/ui/skeleton"

// @ts-ignore
import ExcelJS from "exceljs/dist/exceljs.min.js"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { useDebouncedCallback } from "use-debounce"

import { useSEO } from "@/hooks/use-seo"
import { PageHeader } from "@/components/page-header"

export function EventSpeakersSection() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const {
    events,
    roles: storeRoles,
    editions,
    deleteSpeaker,
    toggleSpeakerCheckIn,
    fetchAllSpeakersForExport,
  } = useEventStore()

  const event = events.find((e) => e.id === id)
  const eventEditions = editions.filter((ed) => ed.mainEventId === id)

  const searchQuery = searchParams.get("search") || ""
  const currentEdition = eventEditions.find((ed) => ed.isCurrent)
  const editionFilter = searchParams.get("edition") || currentEdition?.id || "all"
  const sortParam = searchParams.get("sort") || "" // "name_asc" | "name_desc" | ""

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [selectedSpeakerIds, setSelectedSpeakerIds] = useState<string[]>([])
  const [selectAllDB, setSelectAllDB] = useState(false)

  const [localSearch, setLocalSearch] = useState(searchQuery)

  // Fetch speakers using TanStack Query
  const { data, isLoading: isQueryLoading, isFetching } = useSpeakers(id!, {
    search: searchQuery,
    editionId: editionFilter,
    page: currentPage,
    pageSize,
    sort: sortParam,
  })

  const eventSpeakers = data?.speakers || []
  const speakersTotalCount = data?.totalCount || 0
  const roles = data?.roles || storeRoles || []

  useSEO({
    title: event ? `${event.name} - Ponentes` : "Ponentes de Evento",
    description: `Listado de ponentes, expertos e invitados confirmados para el evento ${event?.name || ""}.`,
  })

  // Sync local search when search query changes externally (like clear all filters)
  useEffect(() => {
    setLocalSearch(searchQuery)
  }, [searchQuery])

  // Reset page and selection when filters change
  useEffect(() => {
    setCurrentPage(1)
    setSelectedSpeakerIds([])
    setSelectAllDB(false)
  }, [searchQuery, editionFilter, sortParam])

  // Debounced search params updater
  const debouncedSearchUpdate = useDebouncedCallback((val: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (val.trim()) {
        next.set("search", val.trim())
      } else {
        next.delete("search")
      }
      return next
    })
  }, 400)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setLocalSearch(val)
    debouncedSearchUpdate(val)
  }

  const handleEditionChange = (val: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (val) {
        next.set("edition", val)
      } else {
        next.delete("edition")
      }
      return next
    })
  }

  const handleToggleCheckIn = async (speakerId: string) => {
    try {
      await toggleSpeakerCheckIn(speakerId)
      queryClient.invalidateQueries({ queryKey: ["speakers", id] })
      toast.success("Acreditación actualizada con éxito.")
    } catch (error: any) {
      toast.error("Error al actualizar la acreditación.")
    }
  }

  const handleDeleteSpeaker = async (speakerId: string) => {
    try {
      await deleteSpeaker(speakerId)
      queryClient.invalidateQueries({ queryKey: ["speakers", id] })
      toast.success("Ponente eliminado con éxito.")
    } catch (error: any) {
      toast.error(error?.message || "No se pudo eliminar al ponente.")
    }
  }

  const handleAddClick = () => {
    navigate(`/dashboard/events/${id}/speakers/new`)
  }

  const handleEditClick = (speakerId: string) => {
    navigate(`/dashboard/events/${id}/speakers/${speakerId}/edit`)
  }

  const handleExportSelected = async () => {
    let speakersToExport: any[] = []

    if (selectAllDB) {
      toast.info("Descargando la lista completa de ponentes de la base de datos...")
      speakersToExport = await fetchAllSpeakersForExport(id!, {
        search: searchQuery,
        editionId: editionFilter,
      })
    } else {
      speakersToExport = eventSpeakers.filter(sp => selectedSpeakerIds.includes(sp.id))
    }

    if (speakersToExport.length === 0) {
      toast.error("No hay ponentes seleccionados para exportar.")
      return
    }

    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet("Ponentes")

      // Enable grid lines visibility
      worksheet.views = [{ showGridLines: true }]

      // Configure columns (Uppercase titles, moderate widths)
      worksheet.columns = [
        { header: "ID", key: "id", width: 12 },
        { header: "NOMBRES", key: "firstName", width: 22 },
        { header: "APELLIDOS", key: "lastName", width: 22 },
        { header: "CORREO", key: "email", width: 28 },
        { header: "TIPO DOCUMENTO", key: "identityDocumentType", width: 18 },
        { header: "NRO DOCUMENTO", key: "identityDocumentNumber", width: 18 },
        { header: "CHARLA", key: "talkTitle", width: 30 },
        { header: "BIOGRAFÍA", key: "bio", width: 40 },
        { header: "ROL", key: "role", width: 18 },
        { header: "EDICIÓN", key: "edition", width: 18 }
      ]

      // Style Header Row: uppercase, custom height, colored background, white large font, centered
      const headerRow = worksheet.getRow(1)
      headerRow.height = 32
      headerRow.eachCell((cell: any) => {
        cell.font = {
          name: "Arial",
          size: 11,
          bold: true,
          color: { argb: "FFFFFFFF" }
        }
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4F46E5" } // Slate violet / Indigo color
        }
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true
        }
      })

      // Add data rows
      speakersToExport.forEach((sp) => {
        const roleObj = roles.find((r) => r.id === sp.roleId)
        const roleName = roleObj?.name.es || sp.roleSlug
        const editionName = editions.find((ed) => ed.id === sp.editionId)?.name || ""

        const row = worksheet.addRow({
          id: sp.id,
          firstName: sp.firstName || "",
          lastName: sp.lastName || "",
          email: sp.email || "",
          identityDocumentType: sp.identityDocumentType || "",
          identityDocumentNumber: sp.identityDocumentNumber || "",
          talkTitle: sp.talkTitle || "",
          bio: sp.bio || "",
          role: roleName || "",
          edition: editionName || ""
        })

        row.height = 24
        row.eachCell((cell: any, colNumber: number) => {
          cell.font = {
            name: "Arial",
            size: 10
          }
          cell.alignment = {
            vertical: "middle",
            horizontal: (colNumber === 1 || colNumber === 5 || colNumber === 6) ? "center" : "left",
            wrapText: true
          }
        })
      })

      // Write to buffer and trigger browser download
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `ponentes_seleccionados_${event?.slug || "evento"}.xlsx`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`Se han exportado ${speakersToExport.length} ponentes con éxito.`)
    } catch (error: any) {
      console.error("Error exporting to Excel:", error)
      toast.error(`Error al exportar a Excel: ${error.message || error}`)
    }
  }

  const columns: ColumnDef<any>[] = [
    {
      header: (
        <input
          type="checkbox"
          checked={eventSpeakers.length > 0 && eventSpeakers.every(sp => selectedSpeakerIds.includes(sp.id))}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedSpeakerIds(eventSpeakers.map(sp => sp.id))
            } else {
              setSelectedSpeakerIds([])
              setSelectAllDB(false)
            }
          }}
          className="rounded border-border text-primary focus:ring-primary size-4 cursor-pointer"
        />
      ),
      className: "p-3 w-10 text-center",
      headerClassName: "p-3 w-10 text-center",
      cell: (sp) => (
        <input
          type="checkbox"
          checked={selectedSpeakerIds.includes(sp.id)}
          onChange={(e) => {
            setSelectAllDB(false)
            if (e.target.checked) {
              setSelectedSpeakerIds(prev => [...prev, sp.id])
            } else {
              setSelectedSpeakerIds(prev => prev.filter(id => id !== sp.id))
            }
          }}
          className="rounded border-border text-primary focus:ring-primary size-4 cursor-pointer"
        />
      )
    },
    {
      header: (
        <button
          type="button"
          onClick={() => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev)
              const current = next.get("sort") || ""
              if (current === "") next.set("sort", "name_asc")
              else if (current === "name_asc") next.set("sort", "name_desc")
              else next.delete("sort")
              return next
            })
            setCurrentPage(1)
          }}
          className="flex items-center gap-1.5 group/sortbtn hover:text-foreground transition-colors cursor-pointer select-none"
          title={sortParam === "" ? "Ordenar por nombre AZ" : sortParam === "name_asc" ? "Ordenar por nombre ZA" : "Quitar ordenamiento"}
        >
          <span>Ponente</span>
          {sortParam === "" && <ArrowUpDown className="size-3 opacity-40 group-hover/sortbtn:opacity-80 transition-opacity" />}
          {sortParam === "name_asc" && <ArrowUp className="size-3 text-primary" />}
          {sortParam === "name_desc" && <ArrowDown className="size-3 text-primary" />}
        </button>
      ),
      className: "p-3",
      headerClassName: "p-3",
      cell: (sp) => sp ? (
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <img
              src={sp.avatar}
              alt={sp.name}
              className="size-10 rounded-full border border-border/80 object-cover bg-muted shadow-xs"
            />
            {(!sp.email || !sp.identityDocumentNumber) && (
              <span
                className="absolute -top-0.5 -right-0.5 size-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-background shadow-xs select-none cursor-help animate-pulse"
                title={
                  !sp.email && !sp.identityDocumentNumber
                    ? "Falta registrar correo electrónico y número de documento"
                    : !sp.email
                      ? "Falta registrar correo electrónico"
                      : "Falta registrar número de documento"
                }
              >
                !
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-foreground truncate">{sp.name}</h4>
            {sp.email ? (
              <p className="text-xs text-muted-foreground truncate">{sp.email}</p>
            ) : (
              <p className="text-xs text-amber-500 italic truncate">Sin correo registrado</p>
            )}
          </div>
        </div>
      ) : null
    },
    {
      header: "Tipo de Ponente",
      className: "p-3",
      headerClassName: "p-3",
      cell: (sp) => {
        const roleObj = roles.find((r) => r.id === sp.roleId)
        const roleName = roleObj?.name.es || (sp.roleSlug === "keynote-speaker" ? "Ponente Magistral" : "Ponente")
        const badgeColor = roleObj?.badgeColor || "#3b82f6"
        const styleBadge = {
          backgroundColor: `${badgeColor}12`,
          color: badgeColor,
          borderColor: `${badgeColor}30`,
        }
        return (
          <div
            className="inline-flex px-2 py-0.5 rounded-md border text-[10px] font-bold font-sans tracking-wide uppercase"
            style={styleBadge}
          >
            {roleName}
          </div>
        )
      }
    },
    {
      header: "Biografía",
      className: "p-3 max-w-[320px]",
      headerClassName: "p-3",
      cell: (sp) => (
        <p className="text-xs text-muted-foreground leading-normal line-clamp-2" title={sp.bio}>
          {sp.bio || "Sin biografía registrada."}
        </p>
      )
    },
    {
      header: "Ámbito (Edición)",
      className: "p-3 text-xs",
      headerClassName: "p-3",
      cell: (sp) => {
        const isGlobal = !sp.editionId
        const editionName = isGlobal
          ? ""
          : editions.find((ed) => ed.id === sp.editionId)?.name || "Edición Desconocida"
        return isGlobal ? (
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] gap-1 px-2 py-0.5">
            <Globe className="size-3" />
            Global
          </Badge>
        ) : (
          <Badge variant="outline" className="border-primary/20 text-primary text-[10px] gap-1 px-2 py-0.5">
            <Layers className="size-3" />
            {editionName}
          </Badge>
        )
      }
    },
    {
      header: "Acciones",
      headerClassName: "text-right p-3",
      className: "text-right p-3",
      cell: (sp) => (
        <div className="flex items-center justify-end gap-1">
          {sp.profileId && (
            <Button
              asChild
              variant="ghost"
              className="size-8 p-0 hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Gestionar perfil de ponente"
            >
              <a href={`/dashboard/profiles/${sp.profileId}`} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          )}
          <Button
            onClick={() => handleEditClick(sp.id)}
            variant="ghost"
            className="size-8 p-0 hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <Edit className="size-3.5" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="size-8 p-0 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar ponente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminará permanentemente a "{sp.name}" y se removerá su vinculación del evento. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDeleteSpeaker(sp.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sí, eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      <PageHeader
        title="Ponentes"
        description="Gestiona los expositores de charlas, conferencias y talleres."
        actionButton={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate(`/dashboard/events/${id}/speakers/import`)}
              variant="outline"
              className="text-xs px-3 py-1.5 h-8 flex items-center gap-1.5 transition-all hover:bg-muted"
              title="Importar ponentes desde archivo CSV"
            >
              <Upload className="size-4" />
              <span className="hidden md:inline">Importar CSV</span>
            </Button>

            <Button onClick={handleAddClick} className="text-xs px-3 py-1.5 h-8">
              <Plus className="size-4 mr-1.5" />
              Agregar Ponente
            </Button>
          </div>
        }
      />

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        {/* Search Input */}
        <div className="relative w-full sm:max-w-xs group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Buscar por nombre o correo..."
            value={localSearch}
            onChange={handleSearchChange}
            className="pl-9 h-9 text-xs rounded-xl shadow-xs border-muted-foreground/20 focus-visible:ring-primary/20"
          />
        </div>

        {/* Edition Select Filter */}
        <div className="w-full sm:max-w-xs">
          <Select value={editionFilter} onValueChange={handleEditionChange}>
            <SelectTrigger className="h-9 text-xs rounded-xl shadow-xs border-muted-foreground/20">
              <SelectValue placeholder="Todas las ediciones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ediciones</SelectItem>
              {eventEditions.map((ed) => (
                <SelectItem key={ed.id} value={ed.id}>
                  {`${ed.name} (${ed.year})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Loading Spinner for dynamic backend loading indicator */}
        {(isQueryLoading || isFetching) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-in fade-in">
            <Loader2 className="size-3.5 animate-spin text-primary" />
            <span>Actualizando...</span>
          </div>
        )}
      </div>

      {/* Selection Info Banner */}
      {selectedSpeakerIds.length > 0 && (
        <div className="bg-primary/[0.03] border border-primary/20 rounded-xl px-4 py-3 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="text-muted-foreground text-center sm:text-left">
            {selectAllDB ? (
              <span>
                Todos los <strong className="text-foreground">{speakersTotalCount}</strong> ponentes de este evento han sido seleccionados.
              </span>
            ) : (
              <span>
                Has seleccionado los <strong className="text-foreground">{selectedSpeakerIds.length}</strong> ponentes de esta página.
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!selectAllDB && speakersTotalCount > eventSpeakers.length && (
              <Button
                variant="link"
                onClick={() => setSelectAllDB(true)}
                className="h-auto p-0 font-bold text-primary hover:text-primary/80 text-xs"
              >
                Seleccionar los {speakersTotalCount} ponentes de este evento
              </Button>
            )}
            {selectAllDB && (
              <Button
                variant="link"
                onClick={() => {
                  setSelectedSpeakerIds([])
                  setSelectAllDB(false)
                }}
                className="h-auto p-0 font-bold text-destructive hover:text-destructive/80 text-xs"
              >
                Limpiar selección
              </Button>
            )}

            <Button
              onClick={handleExportSelected}
              className="text-xs h-8 px-3 flex items-center gap-1.5 transition-all bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm"
              title="Exportar ponentes seleccionados a un archivo CSV"
            >
              <Download className="size-3.5" />
              <span>Exportar Seleccionados</span>
            </Button>
          </div>
        </div>
      )}

      {/* Speakers List */}
      {isQueryLoading || isFetching ? (
        <SpeakersSkeleton />
      ) : eventSpeakers.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground text-sm border border-dashed border-border rounded-xl bg-card/10 space-y-3">
          <BookOpen className="size-8 mx-auto opacity-40 text-primary animate-pulse" />
          <div>
            <p className="font-semibold">
              {searchQuery || editionFilter !== "all"
                ? "No se encontraron ponentes"
                : "No hay ponentes registrados"}
            </p>
            <p className="text-xs text-muted-foreground">
              {searchQuery || editionFilter !== "all"
                ? "Prueba a cambiar los filtros o el término de búsqueda."
                : 'Haz clic en "Agregar Ponente" para registrar al primer conferencista.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <DataTable columns={columns} data={eventSpeakers} pagination={false} />

          {/* Pagination Controls */}
          {speakersTotalCount > pageSize && <TablePagination
            page={currentPage}
            pageSize={pageSize}
            totalItems={speakersTotalCount}
            loading={isFetching}
            onPageChange={(nextPage) => {
              setCurrentPage(nextPage)
              setSelectedSpeakerIds([])
              setSelectAllDB(false)
            }}
          />}
        </div>
      )}
    </div>
  )
}

function SpeakersSkeleton() {
  return (
    <div className="border border-border rounded-xl bg-background p-6 space-y-4 shadow-xs">
      <div className="space-y-3">
        {/* Table Header Skeleton */}
        <div className="flex gap-4 border-b border-border pb-3">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/5" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/12 ml-auto" />
        </div>
        {/* Table Rows Skeletons */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 items-center py-4 border-b border-border/50 last:border-none">
            <Skeleton className="size-4 rounded" />
            <div className="flex items-center gap-3 w-1/3">
              <Skeleton className="size-10 rounded-full shrink-0" />
              <div className="space-y-1.5 w-full">
                <Skeleton className="h-4 w-3/4 animate-pulse" />
                <Skeleton className="h-3 w-1/2 animate-pulse" />
              </div>
            </div>
            <Skeleton className="h-5 w-24 rounded-md animate-pulse" />
            <Skeleton className="h-4 w-1/3 animate-pulse" />
            <div className="w-1/12 ml-auto flex justify-end gap-2">
              <Skeleton className="size-8 rounded-lg animate-pulse" />
              <Skeleton className="size-8 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
