import React, { useEffect, useRef, useState } from "react"
import {
  Film,
  GripVertical,
  Star,
  Trash2,
  CloudUpload,
  X,
  Loader2,
  Images,
  RefreshCw,
  Eye,
  CheckCircle2,
  Plus,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/api/client"
import { Button } from "@/components/ui/button"
import { MediaLibraryDialog } from "@/components/MediaLibraryDialog"
import { cn } from "@/lib/utils"

export type OwnerType = "ORGANIZATION" | "EVENT" | "EDITION" | "PROFILE"
export type Purpose = "COVER" | "LOGO" | "GALLERY" | "DOCUMENT" | "OTHER"

export type MediaItem = {
  id: string
  mediaId: string
  url: string
  mimeType: string
  orientation?: string
  position: number
  isFeatured: boolean
}

export type PendingFile = {
  id: string
  file: File
  preview: string
  isVideo: boolean
  orientation: "LANDSCAPE" | "PORTRAIT" | "SQUARE" | "VIDEO" | "OTHER"
}

export interface MediaUploaderProps {
  /** Valor para modo individual (URL de la imagen) */
  value?: string
  /** Callback al cambiar URL en modo individual */
  onChange?: (value: string) => void
  /** Etiqueta superior opcional */
  label?: string
  /** Variante visual de proporción o modo */
  variant?: "banner" | "square" | "avatar" | "favicon" | "gallery" | "compact" | "auto"
  /** Alias de compatibilidad para variant */
  aspectRatio?: "square" | "banner" | "favicon"
  /** Texto placeholder */
  placeholder?: string
  /** Carpeta / identificador (retrocompatibilidad) */
  folder?: string
  identifier?: string
  showUrlInput?: boolean
  disabled?: boolean
  accept?: string

  // ---- MODO SUBIDA DIRECTA O ASSET TARGET ----
  /** Recurso dueño de la imagen para subida vía API */
  assetTarget?: { organizationId?: string; type: string; resourceId?: string }
  /** Callback si el formulario padre gestiona el archivo localmente (modo creación) */
  onFileSelect?: (file: any) => void
  /** Callback tras subida R2 exitosa */
  onR2UploadComplete?: (publicUrl: string) => Promise<void>

  // ---- MODO MÚLTIPLE / GALERÍA ----
  multiple?: boolean
  maxItems?: number
  ownerType?: OwnerType
  ownerId?: string
  eventId?: string
  organizationId?: string
  purpose?: Purpose
  enableHero?: boolean
  onGalleryCountChange?: (count: number) => void
}

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

async function getOrientation(file: File): Promise<PendingFile["orientation"]> {
  if (file.type.startsWith("video/")) return "VIDEO"
  if (!file.type.startsWith("image/")) return "OTHER"
  const src = URL.createObjectURL(file)
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = reject
      image.src = src
    })
    return image.width === image.height
      ? "SQUARE"
      : image.width > image.height
      ? "LANDSCAPE"
      : "PORTRAIT"
  } catch {
    return "OTHER"
  } finally {
    URL.revokeObjectURL(src)
  }
}

export function MediaUploader({
  value,
  onChange,
  label,
  variant,
  aspectRatio = "square",
  placeholder,
  folder: _folder,
  identifier: _identifier,
  showUrlInput: _showUrlInput,
  disabled = false,
  accept,
  assetTarget,
  onFileSelect,
  onR2UploadComplete,
  multiple = false,
  maxItems = 10,
  ownerType: explicitOwnerType,
  ownerId: explicitOwnerId,
  eventId,
  organizationId: explicitOrgId,
  purpose: explicitPurpose,
  enableHero = true,
  onGalleryCountChange,
}: MediaUploaderProps) {
  // Determinar variante efectiva
  const effectiveVariant =
    variant || (multiple ? "gallery" : aspectRatio || "square")

  // Determinar targets de recurso
  const effectiveOwnerId = explicitOwnerId || eventId || assetTarget?.resourceId || ""
  const effectiveOrgId = explicitOrgId || assetTarget?.organizationId || ""
  const effectiveOwnerType: OwnerType =
    explicitOwnerType ||
    (assetTarget?.type.startsWith("organizations/")
      ? "ORGANIZATION"
      : assetTarget?.type.startsWith("editions/")
      ? "EDITION"
      : assetTarget?.type.startsWith("profiles/")
      ? "PROFILE"
      : "EVENT")
  const effectivePurpose: Purpose =
    explicitPurpose ||
    (assetTarget?.type.endsWith("/cover")
      ? "COVER"
      : assetTarget?.type.endsWith("/logo")
      ? "LOGO"
      : "GALLERY")

  // Estados comunes
  const [dragActive, setDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [fullViewOpen, setFullViewOpen] = useState(false)
  const [fullViewUrl, setFullViewUrl] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados para MODO INDIVIDUAL
  const [singlePreviewUrl, setSinglePreviewUrl] = useState<string>(value || "")
  const [singlePendingFile, setSinglePendingFile] = useState<File | null>(null)
  const [singlePendingPreview, setSinglePendingPreview] = useState<string>("")

  // Estados para MODO MÚLTIPLE (GALERÍA)
  const [galleryItems, setGalleryItems] = useState<MediaItem[]>([])
  const [galleryPending, setGalleryPending] = useState<PendingFile[]>([])

  // Estados para Drag & Drop Reordering
  const [draggedPendingId, setDraggedPendingId] = useState<string | null>(null)
  const [dragOverPendingId, setDragOverPendingId] = useState<string | null>(null)

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null)
  const [_isReordering, setIsReordering] = useState(false)

  // Sincronizar valor en modo individual
  useEffect(() => {
    if (!multiple) {
      setSinglePreviewUrl(value || "")
    }
  }, [value, multiple])

  // Limpiar memoria de previews
  useEffect(() => {
    return () => {
      if (singlePendingPreview) URL.revokeObjectURL(singlePendingPreview)
      galleryPending.forEach((p) => URL.revokeObjectURL(p.preview))
    }
  }, [singlePendingPreview, galleryPending])

  // Cargar galería activa si es modo múltiple
  const refreshGallery = async () => {
    if (!effectiveOwnerId || !multiple) return
    try {
      const links = await api.media.list(effectiveOwnerType, effectiveOwnerId)
      const mapped: MediaItem[] = links
        .filter((link: any) => link.purpose === effectivePurpose)
        .map((link: any) => ({
          id: link.id,
          mediaId: link.mediaId,
          url: link.media.url,
          mimeType: link.media.mimeType,
          orientation: link.media.orientation,
          position: link.position,
          isFeatured: Boolean(link.isFeatured),
        }))
        .sort((a: MediaItem, b: MediaItem) => a.position - b.position)
      setGalleryItems(mapped)
      onGalleryCountChange?.(mapped.length)
    } catch (err: any) {
      console.error("Error loading gallery media:", err)
    }
  }

  useEffect(() => {
    if (multiple && effectiveOwnerId) {
      void refreshGallery()
    }
  }, [multiple, effectiveOwnerId, effectiveOwnerType])

  // Drag handlers para subida de archivos externos desde el explorador
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled) return
    // Si estamos arrastrando un elemento interno (reordenamiento), no activar overlay de subida externa
    if (e.dataTransfer.types.includes("application/x-zynqro-reorder")) {
      return
    }
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  // --- LÓGICA MODO INDIVIDUAL ---
  const handleStageSingleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo seleccionado no es una imagen válida.")
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("La imagen excede el límite de tamaño de 15MB.")
      return
    }

    const localUrl = URL.createObjectURL(file)
    if (singlePendingPreview) URL.revokeObjectURL(singlePendingPreview)

    if (onFileSelect) {
      setSinglePendingFile(file)
      setSinglePendingPreview(localUrl)
      onFileSelect(file)
      return
    }

    setSinglePendingFile(file)
    setSinglePendingPreview(localUrl)
  }

  const cancelSinglePending = () => {
    if (singlePendingPreview) URL.revokeObjectURL(singlePendingPreview)
    setSinglePendingFile(null)
    setSinglePendingPreview("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleConfirmSingleUpload = async () => {
    if (!singlePendingFile) return
    if (!assetTarget && !effectiveOwnerId) {
      toast.error("Falta la configuración de destino del archivo.")
      return
    }

    setIsUploading(true)
    try {
      const media = await api.media.upload(singlePendingFile, {
        ownerType: effectiveOwnerType,
        ownerId: effectiveOwnerId,
        purpose: effectivePurpose,
        organizationId: effectiveOrgId || undefined,
      })

      const publicUrl = media.url as string
      onChange?.(publicUrl)
      setSinglePreviewUrl(publicUrl)

      if (onR2UploadComplete) {
        try {
          await onR2UploadComplete(publicUrl)
        } catch (dbErr) {
          console.error("onR2UploadComplete failed:", dbErr)
        }
      }

      toast.success("Imagen subida exitosamente")
      cancelSinglePending()
    } catch (uploadErr: any) {
      console.error("Media upload failed:", uploadErr)
      toast.error(`No se pudo subir la imagen. ${uploadErr.message || uploadErr}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveSingle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    cancelSinglePending()
    onChange?.("")
    setSinglePreviewUrl("")
    if (onFileSelect) onFileSelect(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    toast.success("Imagen eliminada")
  }

  // --- LÓGICA MODO MÚLTIPLE (GALERÍA) ---
  const totalGalleryCount = galleryItems.length + galleryPending.length
  const remainingSlots = Math.max(0, maxItems - totalGalleryCount)

  const handleQueueGalleryFiles = async (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList)
    const validFiles = rawFiles.filter(
      (f) =>
        f.type.startsWith("image/") ||
        f.type.startsWith("video/") ||
        f.type === "application/pdf"
    )

    if (!validFiles.length) {
      toast.error("Selecciona archivos de imagen o video válidos.")
      return
    }

    if (totalGalleryCount >= maxItems) {
      toast.error(`Ya has alcanzado el límite máximo de ${maxItems} archivos.`)
      return
    }

    const filesToProcess = validFiles.slice(0, remainingSlots)
    if (filesToProcess.length < validFiles.length) {
      toast.info(`Solo se agregaron ${filesToProcess.length} archivo(s) para no exceder el límite.`)
    }

    const staged: PendingFile[] = await Promise.all(
      filesToProcess.map(async (file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        isVideo: file.type.startsWith("video/"),
        orientation: await getOrientation(file),
      }))
    )

    setGalleryPending((current) => [...current, ...staged])
  }

  const removeGalleryPendingItem = (id: string) => {
    setGalleryPending((current) => {
      const item = current.find((p) => p.id === id)
      if (item) URL.revokeObjectURL(item.preview)
      return current.filter((p) => p.id !== id)
    })
  }

  const clearAllGalleryPending = () => {
    galleryPending.forEach((p) => URL.revokeObjectURL(p.preview))
    setGalleryPending([])
  }

  const handleUploadGalleryPending = async () => {
    if (!galleryPending.length) return
    setIsUploading(true)
    let successCount = 0

    try {
      for (let i = 0; i < galleryPending.length; i++) {
        const item = galleryPending[i]
        try {
          await api.media.upload(item.file, {
            ownerType: effectiveOwnerType,
            ownerId: effectiveOwnerId,
            organizationId: effectiveOrgId || undefined,
            purpose: effectivePurpose,
            position: galleryItems.length + i,
            orientation: item.orientation,
          })
          successCount++
        } catch (err: any) {
          console.error(`Error uploading ${item.file.name}:`, err)
        }
      }

      clearAllGalleryPending()
      await refreshGallery()

      if (successCount === galleryPending.length) {
        toast.success(
          successCount === 1
            ? "Archivo multimedia subido correctamente"
            : `${successCount} archivos multimedia subidos correctamente`
        )
      } else {
        toast.warning(`Se subieron ${successCount} de ${galleryPending.length} archivos.`)
      }
    } catch (err: any) {
      toast.error(err.message || "Error al subir los archivos.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleToggleFeatured = async (item: MediaItem) => {
    const isCurrentlyFeatured = item.isFeatured
    const updated = galleryItems.map((candidate) => ({
      ...candidate,
      isFeatured: candidate.id === item.id ? !isCurrentlyFeatured : false,
    }))

    setGalleryItems(updated)

    try {
      await api.media.reorder(
        effectiveOwnerType,
        effectiveOwnerId,
        updated.map((candidate, position) => ({
          id: candidate.id,
          position,
          isFeatured: candidate.isFeatured,
        }))
      )
      if (!isCurrentlyFeatured) {
        toast.success("Pieza marcada como destacada para el Hero público ⭐")
      } else {
        toast.info("Pieza desmarcada del Hero público")
      }
    } catch (err: any) {
      toast.error("Error al actualizar la pieza destacada.")
      void refreshGallery()
    }
  }

  const handleRemoveGalleryItem = async (item: MediaItem) => {
    try {
      await api.media.unlink(item.id)
      setGalleryItems((current) => current.filter((c) => c.id !== item.id))
      onGalleryCountChange?.(galleryItems.length - 1)
      toast.success("Recurso eliminado de la galería")
    } catch (err: any) {
      toast.error(err.message || "No se pudo eliminar el recurso.")
      void refreshGallery()
    }
  }

  // Manejo de Drag & Drop para Reordenar Elementos Pendientes (Staged)
  const handlePendingDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("application/x-zynqro-reorder", "pending")
    e.dataTransfer.setData("text/plain", id)
    e.dataTransfer.effectAllowed = "move"
    setDraggedPendingId(id)
  }

  const handlePendingDragOver = (e: React.DragEvent, id: string) => {
    if (draggedPendingId) {
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = "move"
      if (dragOverPendingId !== id) {
        setDragOverPendingId(id)
      }
    }
  }

  const handlePendingDrop = (e: React.DragEvent, targetId: string) => {
    if (!draggedPendingId) return
    e.preventDefault()
    e.stopPropagation()

    if (draggedPendingId !== targetId) {
      setGalleryPending((current) => {
        const fromIndex = current.findIndex((p) => p.id === draggedPendingId)
        const toIndex = current.findIndex((p) => p.id === targetId)
        if (fromIndex === -1 || toIndex === -1) return current
        const copy = [...current]
        const [moved] = copy.splice(fromIndex, 1)
        copy.splice(toIndex, 0, moved)
        return copy
      })
    }
    setDraggedPendingId(null)
    setDragOverPendingId(null)
  }

  const handlePendingDragEnd = () => {
    setDraggedPendingId(null)
    setDragOverPendingId(null)
  }

  // Manejo de Drag & Drop para Reordenar Multimedia Activa
  const handleActiveDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("application/x-zynqro-reorder", "active")
    e.dataTransfer.setData("text/plain", id)
    e.dataTransfer.effectAllowed = "move"
    setDraggedItemId(id)
  }

  const handleActiveDragOver = (e: React.DragEvent, id: string) => {
    if (draggedItemId) {
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = "move"
      if (dragOverItemId !== id) {
        setDragOverItemId(id)
      }
    }
  }

  const handleActiveDrop = async (e: React.DragEvent, targetId: string) => {
    if (!draggedItemId) return
    e.preventDefault()
    e.stopPropagation()

    if (draggedItemId !== targetId) {
      const fromIndex = galleryItems.findIndex((it) => it.id === draggedItemId)
      const toIndex = galleryItems.findIndex((it) => it.id === targetId)
      if (fromIndex !== -1 && toIndex !== -1) {
        const copy = [...galleryItems]
        const [moved] = copy.splice(fromIndex, 1)
        copy.splice(toIndex, 0, moved)
        setGalleryItems(copy)

        try {
          setIsReordering(true)
          await api.media.reorder(
            effectiveOwnerType,
            effectiveOwnerId,
            copy.map((candidate, position) => ({
              id: candidate.id,
              position,
              isFeatured: candidate.isFeatured,
            }))
          )
          toast.success("Orden de galería actualizado")
        } catch (err: any) {
          console.error("Error reordering media:", err)
          toast.error("No se pudo guardar el nuevo orden.")
          void refreshGallery()
        } finally {
          setIsReordering(false)
        }
      }
    }
    setDraggedItemId(null)
    setDragOverItemId(null)
  }

  const handleActiveDragEnd = () => {
    setDraggedItemId(null)
    setDragOverItemId(null)
  }

  // Manejo de Drop externo de archivos
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (disabled) return

    // Si viene de un reorder interno, ignorar
    if (e.dataTransfer.types.includes("application/x-zynqro-reorder")) {
      return
    }

    if (multiple) {
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        void handleQueueGalleryFiles(e.dataTransfer.files)
      }
    } else {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleStageSingleFile(e.dataTransfer.files[0])
      }
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (multiple) {
      if (e.target.files && e.target.files.length) {
        void handleQueueGalleryFiles(e.target.files)
      }
      e.target.value = ""
    } else {
      if (e.target.files && e.target.files[0]) {
        handleStageSingleFile(e.target.files[0])
      }
    }
  }

  const applyFromLibrary = async (url: string) => {
    if (multiple) {
      void refreshGallery()
    } else {
      cancelSinglePending()
      onChange?.(url)
      setSinglePreviewUrl(url)
      if (onR2UploadComplete) await onR2UploadComplete(url)
      toast.success("Imagen aplicada desde la biblioteca")
    }
  }

  // Dimensiones para modo individual
  const getSingleDimensions = () => {
    switch (effectiveVariant) {
      case "banner":
        return "w-full min-h-[160px] md:min-h-[180px] max-h-[220px] aspect-[21/9]"
      case "favicon":
        return "size-20 aspect-square"
      case "avatar":
        return "size-36 sm:size-40 rounded-full aspect-square"
      case "compact":
        return "w-full h-28 aspect-video"
      case "square":
      default:
        return "size-40 sm:size-44 aspect-square"
    }
  }

  const isShowingSinglePending = Boolean(
    singlePendingFile && singlePendingPreview && !onFileSelect
  )
  const currentSingleUrl = isShowingSinglePending
    ? singlePendingPreview
    : singlePreviewUrl

  // ==========================================
  // RENDER: MODO MÚLTIPLE (GALERÍA UNIFICADA)
  // ==========================================
  if (multiple) {
    const hasAnyContent = galleryItems.length > 0 || galleryPending.length > 0

    return (
      <div
        className="w-full space-y-3 relative"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        {label && <label className="text-sm font-medium text-foreground block">{label}</label>}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept || "image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"}
          className="hidden"
          onChange={handleFileInputChange}
          disabled={disabled || isUploading}
        />

        {/* OVERLAY GLOBAL AL ARRASTRAR ARCHIVOS EXTERNOS */}
        {dragActive && (
          <div className="absolute inset-0 z-40 rounded-xl border-2 border-dashed border-primary bg-primary/10 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center pointer-events-none animate-in fade-in-50 duration-150">
            <div className="size-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-2 animate-bounce shadow-sm">
              <CloudUpload className="size-8" />
            </div>
            <p className="text-sm font-semibold text-primary">Suelta tus archivos multimedia aquí</p>
            <p className="text-xs text-primary/80 mt-0.5">Se añadirán a la lista de previsualización</p>
          </div>
        )}

        {/* BARRA SUPERIOR DE ESTADO Y ACCIONES */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl border border-border/80 bg-muted/20">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <CloudUpload className="size-4 text-primary" />
              Archivos · {galleryItems.length}/{maxItems}
            </span>
            <span className="text-muted-foreground hidden sm:inline">
              · Arrastra archivos para agregar o reordénalos libremente
            </span>
          </div>

          <div className="flex items-center gap-2">
            {totalGalleryCount < maxItems && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="h-7 text-xs px-3 rounded-lg border-border/80 hover:border-primary/60 bg-background text-foreground hover:bg-muted font-medium gap-1.5 shadow-2xs"
              >
                <Plus className="size-3.5" />
                <span>Añadir archivos</span>
              </Button>
            )}

            {effectiveOrgId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLibraryOpen(true)}
                className="h-7 text-xs px-2.5 rounded-lg border-border/80 text-muted-foreground hover:text-foreground bg-background hover:bg-muted shadow-2xs"
              >
                <Images className="mr-1.5 size-3.5" />
                Biblioteca
              </Button>
            )}
          </div>
        </div>

        {/* CONTENEDOR INTEGRADO: Si está completamente vacío, mostrar Dropzone Principal */}
        {!hasAnyContent && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "group relative flex min-h-[160px] flex-col sm:flex-row items-center justify-center gap-5 p-6 rounded-xl border border-dashed cursor-pointer transition-all duration-200 select-none text-center sm:text-left",
              dragActive
                ? "border-primary bg-primary/10 ring-2 ring-primary/20 scale-[0.99]"
                : "border-border/80 bg-muted/10 hover:border-primary/60 hover:bg-muted/30"
            )}
          >
            <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:scale-105 group-hover:bg-primary/15 transition-all shadow-2xs">
              <CloudUpload className="size-10 stroke-[1.7]" />
            </div>
            <div className="max-w-md space-y-1.5">
              <p className="text-sm font-semibold text-foreground">
                {placeholder || "Arrastra archivos de galería o selecciónalos"}
              </p>
              <p className="text-xs text-muted-foreground">
                Puedes seleccionar múltiples imágenes (JPG, PNG, WEBP) o videos (MP4, WEBM)
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 text-xs font-medium gap-1.5 shadow-2xs"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
              >
                <CloudUpload className="size-3.5" />
                Seleccionar archivos
              </Button>
            </div>
          </div>
        )}

        {/* PREVISUALIZACIÓN ANTES DE SUBIR (STAGING CON DRAG & DROP REORDER) */}
        {galleryPending.length > 0 && (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <CloudUpload className="size-4" />
                <span>
                  {galleryPending.length} archivo{galleryPending.length > 1 ? "s" : ""} listo
                  {galleryPending.length > 1 ? "s" : ""} para subir (arrastra para reordenar)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isUploading}
                  onClick={clearAllGalleryPending}
                  className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-amber-500/10"
                >
                  Descartar todo
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isUploading}
                  onClick={handleUploadGalleryPending}
                  className="h-7 px-3 text-xs font-medium gap-1.5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Subiendo ({galleryPending.length})...
                    </>
                  ) : (
                    <>
                      <CloudUpload className="size-3.5" />
                      Subir {galleryPending.length > 1 ? `(${galleryPending.length}) archivos` : "archivo"}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Tarjetas de previsualización en cola con capacidad de ordenamiento */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {galleryPending.map((p) => {
                const isBeingDragged = draggedPendingId === p.id
                const isOver = dragOverPendingId === p.id && !isBeingDragged

                return (
                  <div
                    key={p.id}
                    draggable={!isUploading}
                    onDragStart={(e) => handlePendingDragStart(e, p.id)}
                    onDragOver={(e) => handlePendingDragOver(e, p.id)}
                    onDrop={(e) => handlePendingDrop(e, p.id)}
                    onDragEnd={handlePendingDragEnd}
                    className={cn(
                      "group relative rounded-xl border bg-card overflow-hidden shadow-2xs flex flex-col cursor-grab active:cursor-grabbing transition-all duration-150 select-none",
                      isBeingDragged && "opacity-40 scale-95 border-dashed border-primary",
                      isOver && "border-primary ring-2 ring-primary/30 scale-102",
                      !isBeingDragged && !isOver && "border-border/80 hover:border-border hover:shadow-xs"
                    )}
                  >
                    <div className="relative aspect-video w-full bg-muted/40 overflow-hidden flex items-center justify-center">
                      {p.isVideo ? (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <Film className="size-6 text-primary" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider">Video</span>
                        </div>
                      ) : (
                        <img
                          src={p.preview}
                          alt={p.file.name}
                          className="size-full object-cover pointer-events-none"
                        />
                      )}

                      {/* Grip indicator */}
                      <div className="absolute top-1.5 left-1.5 p-1 rounded-md bg-black/60 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="size-3.5" />
                      </div>

                      {/* Botón descartar */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeGalleryPendingItem(p.id)
                        }}
                        disabled={isUploading}
                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 hover:bg-destructive text-white transition-colors"
                        title="Descartar archivo"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>

                    <div className="p-2 text-[11px] bg-card border-t border-border/50">
                      <p className="font-medium text-foreground truncate">{p.file.name}</p>
                      <p className="text-muted-foreground text-[10px] mt-0.5">
                        {formatBytes(p.file.size)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* CUADRÍCULA DE ELEMENTOS ACTIVOS (CON DRAG & DROP REORDER) */}
        {galleryItems.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                Multimedia activa ({galleryItems.length})
              </span>
              <span className="text-[11px]">
                {enableHero ? "⭐ Haz clic en la estrella para Hero público · Arrastra para ordenar" : "Arrastra para ordenar"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {galleryItems.map((item) => {
                const isBeingDragged = draggedItemId === item.id
                const isOver = dragOverItemId === item.id && !isBeingDragged

                return (
                  <div
                    key={item.id}
                    draggable={true}
                    onDragStart={(e) => handleActiveDragStart(e, item.id)}
                    onDragOver={(e) => handleActiveDragOver(e, item.id)}
                    onDrop={(e) => handleActiveDrop(e, item.id)}
                    onDragEnd={handleActiveDragEnd}
                    className={cn(
                      "group relative rounded-xl border bg-card overflow-hidden shadow-2xs transition-all duration-200 flex flex-col select-none cursor-grab active:cursor-grabbing",
                      isBeingDragged && "opacity-40 scale-95 border-dashed border-primary",
                      isOver && "border-primary ring-2 ring-primary/40 scale-102",
                      item.isFeatured && !isBeingDragged && !isOver
                        ? "border-amber-500/80 ring-2 ring-amber-500/20 shadow-md"
                        : !isBeingDragged && !isOver && "border-border/80 hover:border-primary/50"
                    )}
                  >
                    <div className="relative aspect-video w-full bg-muted/40 overflow-hidden flex items-center justify-center">
                      {item.mimeType.startsWith("video/") ? (
                        <div className="size-full relative">
                          <video
                            src={item.url}
                            className="size-full object-cover pointer-events-none"
                            muted
                            playsInline
                            preload="metadata"
                          />
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] flex items-center gap-1">
                            <Film className="size-3" />
                            <span>Video</span>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={item.url}
                          alt="Multimedia"
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                        />
                      )}

                      {/* Grip handle indicator on top-left */}
                      <div className="absolute top-2 left-2 z-10 p-1 rounded-md bg-black/60 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="size-3.5" />
                      </div>

                      {item.isFeatured && (
                        <div className="absolute top-2 left-2 z-10 group-hover:opacity-0 transition-opacity">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500 text-white shadow-xs">
                            <Star className="size-3 fill-current" />
                            Hero Público
                          </span>
                        </div>
                      )}

                      {/* Acciones flotantes en hover */}
                      <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 backdrop-blur-[1px]">
                        {enableHero && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              void handleToggleFeatured(item)
                            }}
                            className={cn(
                              "p-2 rounded-lg transition-transform hover:scale-110 shadow-sm text-xs flex items-center gap-1 font-medium",
                              item.isFeatured
                                ? "bg-amber-500 text-white"
                                : "bg-background/90 text-foreground hover:bg-amber-500 hover:text-white"
                            )}
                            title={
                              item.isFeatured
                                ? "Quitar del Hero público"
                                : "Destacar en el Hero público"
                            }
                          >
                            <Star
                              className={cn("size-3.5", item.isFeatured && "fill-current")}
                            />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setFullViewUrl(item.url)
                            setFullViewOpen(true)
                          }}
                          className="p-2 bg-background/90 hover:bg-background text-foreground rounded-lg transition-transform hover:scale-110 shadow-sm"
                          title="Ver en grande"
                        >
                          <Eye className="size-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleRemoveGalleryItem(item)
                          }}
                          className="p-2 bg-destructive/90 hover:bg-destructive text-destructive-foreground rounded-lg transition-transform hover:scale-110 shadow-sm"
                          title="Eliminar de la galería"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Botón / Tarjeta inline para añadir más archivos cuando ya hay galería */}
              {totalGalleryCount < maxItems && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video rounded-xl border border-dashed border-border/80 hover:border-primary/60 bg-muted/10 hover:bg-muted/30 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-muted-foreground hover:text-primary transition-all p-3 text-center group"
                >
                  <div className="size-8 rounded-full bg-muted/60 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                    <CloudUpload className="size-4" />
                  </div>
                  <span className="text-[11px] font-medium leading-tight">Añadir más</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de visor completo */}
        {fullViewOpen && fullViewUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setFullViewOpen(false)}
          >
            <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
              <button
                type="button"
                onClick={() => setFullViewOpen(false)}
                className="absolute -top-10 right-0 text-white/80 hover:text-white p-1 rounded-md"
              >
                <X className="size-6" />
              </button>
              {fullViewUrl.endsWith(".mp4") || fullViewUrl.includes("video") ? (
                <video
                  src={fullViewUrl}
                  controls
                  autoPlay
                  className="max-h-[85vh] max-w-full rounded-lg shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <img
                  src={fullViewUrl}
                  alt="Vista previa ampliada"
                  className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>
          </div>
        )}

        {/* Modal de Biblioteca Multimedia */}
        {effectiveOrgId && (
          <MediaLibraryDialog
            open={libraryOpen}
            onOpenChange={setLibraryOpen}
            organizationId={effectiveOrgId}
            ownerType={effectiveOwnerType}
            ownerId={effectiveOwnerId}
            multiple={true}
            maxItems={maxItems}
            title={label || "Biblioteca Multimedia"}
            onChange={() => void refreshGallery()}
          />
        )}
      </div>
    )
  }

  // ==========================================
  // RENDER: MODO INDIVIDUAL
  // ==========================================
  return (
    <div className="w-full space-y-3">
      {label && <label className="text-sm font-medium text-foreground block">{label}</label>}

      <div className="flex flex-col gap-3 items-start w-full">
        {/* Contenedor principal / Dropzone */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => {
            if (!currentSingleUrl && !disabled) fileInputRef.current?.click()
          }}
          className={cn(
            "relative group overflow-hidden transition-all duration-200 select-none",
            getSingleDimensions(),
            effectiveVariant === "avatar" ? "rounded-full" : "rounded-xl",
            !currentSingleUrl && !isShowingSinglePending
              ? cn(
                  "border border-dashed flex flex-col items-center justify-center cursor-pointer",
                  dragActive
                    ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20"
                    : "border-border/80 bg-muted/20 hover:border-primary/60 hover:bg-muted/40"
                )
              : "border border-border/70 bg-card shadow-xs"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept || "image/png,image/jpeg,image/webp,image/svg+xml,image/gif"}
            className="hidden"
            onChange={handleFileInputChange}
            disabled={disabled || isUploading}
          />

          {/* Hay imagen activa o previsualización */}
          {currentSingleUrl ? (
            <div className="size-full relative flex items-center justify-center bg-black/5 dark:bg-black/20">
              <img
                src={currentSingleUrl}
                alt="Vista previa"
                className={cn(
                  "size-full transition-transform duration-300",
                  effectiveVariant === "favicon" ? "object-contain p-2" : "object-cover"
                )}
              />

              {/* Tag de previsualización pendiente */}
              {isShowingSinglePending && (
                <div className="absolute top-2.5 left-2.5 z-10">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/90 text-white shadow-xs backdrop-blur-xs">
                    <span className="size-1.5 rounded-full bg-white animate-pulse" />
                    Vista previa · Listo para subir
                  </span>
                </div>
              )}

              {/* Acciones flotantes en hover */}
              {!isShowingSinglePending && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all duration-200 backdrop-blur-[2px]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      fileInputRef.current?.click()
                    }}
                    className="p-2 bg-background/90 hover:bg-background text-foreground rounded-lg transition-transform hover:scale-105 shadow-sm text-xs flex items-center gap-1.5 font-medium"
                    title="Cambiar imagen"
                  >
                    <RefreshCw className="size-3.5" />
                    <span className="hidden sm:inline">Cambiar</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFullViewUrl(currentSingleUrl)
                      setFullViewOpen(true)
                    }}
                    className="p-2 bg-background/90 hover:bg-background text-foreground rounded-lg transition-transform hover:scale-105 shadow-sm"
                    title="Ver en grande"
                  >
                    <Eye className="size-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleRemoveSingle}
                    className="p-2 bg-destructive/90 hover:bg-destructive text-destructive-foreground rounded-lg transition-transform hover:scale-105 shadow-sm"
                    title="Eliminar imagen"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              )}

              {/* Spinner si está subiendo */}
              {isUploading && (
                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2 backdrop-blur-xs z-20">
                  <Loader2 className="size-6 text-primary animate-spin" />
                  <span className="text-xs font-medium text-foreground">Subiendo imagen...</span>
                </div>
              )}
            </div>
          ) : (
            /* Estado vacío */
            <div className="p-4 text-center flex flex-col items-center justify-center space-y-2.5">
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary",
                  dragActive && "bg-primary/20 text-primary scale-110"
                )}
              >
                <CloudUpload className="size-5" />
              </div>

              {effectiveVariant !== "favicon" ? (
                <div className="space-y-0.5 max-w-[220px]">
                  <p className="text-xs font-medium text-foreground">
                    {placeholder || "Arrastra o selecciona una imagen"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    PNG, JPG o WEBP · Máx. 15MB
                  </p>
                </div>
              ) : (
                <span className="text-[11px] text-muted-foreground">Favicon</span>
              )}
            </div>
          )}
        </div>

        {/* BARRA DE CONFIRMACIÓN PENDIENTE (Previsualización -> Botón Subir) */}
        {isShowingSinglePending && singlePendingFile && (
          <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs animate-in fade-in-50 duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                <CloudUpload className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate max-w-[240px]">
                  {singlePendingFile.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatBytes(singlePendingFile.size)} · Listo para cargar
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={cancelSinglePending}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="mr-1 size-3.5" />
                Descartar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isUploading}
                onClick={handleConfirmSingleUpload}
                className="h-8 px-3 text-xs font-medium gap-1.5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <CloudUpload className="size-3.5" />
                    Subir imagen
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Acciones auxiliares: Biblioteca Multimedia y Cambiar */}
        <div className="flex flex-wrap items-center gap-2">
          {effectiveOrgId && !onFileSelect && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg text-xs font-medium border-border/80 text-muted-foreground hover:text-foreground bg-muted/20 hover:bg-muted/50"
              onClick={() => setLibraryOpen(true)}
            >
              <Images className="mr-1.5 size-3.5" />
              Biblioteca multimedia
            </Button>
          )}

          {currentSingleUrl && !isShowingSinglePending && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
            >
              <RefreshCw className="mr-1.5 size-3" />
              Reemplazar archivo
            </Button>
          )}
        </div>
      </div>

      {/* Modal de visor completo */}
      {fullViewOpen && fullViewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setFullViewOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setFullViewOpen(false)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white p-1 rounded-md"
            >
              <X className="size-6" />
            </button>
            <img
              src={fullViewUrl}
              alt="Vista previa ampliada"
              className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Modal de Biblioteca Multimedia */}
      {effectiveOrgId && (
        <MediaLibraryDialog
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
          organizationId={effectiveOrgId}
          ownerType={effectiveOwnerType}
          ownerId={effectiveOwnerId}
          purpose={effectivePurpose}
          multiple={false}
          title={label || "Seleccionar imagen"}
          onChange={(items) => {
            const item = items[0]
            if (item) void applyFromLibrary(item.url)
          }}
        />
      )}
    </div>
  )
}

