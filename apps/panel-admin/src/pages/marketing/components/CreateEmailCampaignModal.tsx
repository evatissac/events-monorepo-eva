import { useState } from "react"
import { Crown, FolderPlus, Tag } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface CreateEmailCampaignModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (data: { name: string; type: "regular" | "ab"; tags: string[]; folder?: string }) => Promise<void>
}

export function CreateEmailCampaignModal({
  open,
  onOpenChange,
  onCreate,
}: CreateEmailCampaignModalProps) {
  const [campaignType, setCampaignType] = useState<"regular" | "ab">("regular")
  const [name, setName] = useState("")
  const [selectedTag, setSelectedTag] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [folder, setFolder] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Por favor ingresa un nombre para la campaña")
      return
    }

    setSaving(true)
    try {
      await onCreate({ name: name.trim(), type: campaignType, tags: tags.length ? tags : selectedTag ? [selectedTag] : ["General"], folder: folder || undefined })
      setName(""); setTags([]); setSelectedTag(""); onOpenChange(false)
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] p-8 rounded-3xl border-border bg-card shadow-2xl">
        <DialogHeader className="space-y-3 text-left pb-2">
          <DialogTitle className="text-2xl font-bold text-foreground tracking-tight">
            Crear una campaña de e-mail
          </DialogTitle>

          {/* Regular vs A/B Test Switch (Matches Reference Image 4) */}
          <div className="flex p-1 bg-muted rounded-xl w-full max-w-sm">
            <button
              type="button"
              onClick={() => setCampaignType("regular")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                campaignType === "regular"
                  ? "bg-card text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Regular
            </button>
            <button
              type="button"
              onClick={() => {
                toast.info("Pruebas A/B están habilitadas para planes Pro y Enterprise.")
              }}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground transition-all"
            >
              <span>Prueba A/B</span>
              <Crown className="size-3 text-amber-500 fill-amber-500" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed pt-1">
            Mantén el interés de tus suscriptores compartiendo tus novedades más recientes, promocionando tus productos más vendidos o anunciando eventos que tendrán lugar próximamente.
          </p>
        </DialogHeader>

        <form onSubmit={handleCreate} className="space-y-5 pt-2">
          {/* Nombre de la campaña */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">
                Nombre de la campaña <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-muted-foreground font-mono">
                {name.length}/128
              </span>
            </div>
            <Input
              required
              maxLength={128}
              placeholder="Ej: AMPLIACION DE FECHA CONIAP 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl h-11 border-border focus-visible:ring-violet-500 text-sm"
              autoFocus
            />
          </div>

          {/* Etiquetas */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">Etiquetas</label>
              <Crown className="size-3 text-amber-500 fill-amber-500" />
            </div>
            <div className="relative">
              <select
                value={selectedTag}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedTag(val)
                  if (val && !tags.includes(val)) setTags([...tags, val])
                }}
                className="w-full rounded-xl border border-border bg-background px-3 h-10 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none cursor-pointer"
              >
                <option value="">Selecciona etiquetas</option>
                <option value="Eventos">Eventos</option>
                <option value="Recordatorio">Recordatorio</option>
                <option value="Certificados">Certificados</option>
                <option value="Convocatoria">Convocatoria</option>
                <option value="Boletín Mensual">Boletín Mensual</option>
              </select>
              <Tag className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                      className="hover:text-red-500 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Carpeta */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Carpeta</label>
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  toast.info("La organización por carpetas está disponible en la versión Pro.")
                }}
                className="rounded-xl h-9 px-3.5 font-medium border-border text-foreground hover:bg-muted text-xs flex items-center gap-1.5"
              >
                <Crown className="size-3 text-amber-500 fill-amber-500" />
                <FolderPlus className="size-3.5 text-muted-foreground" />
                <span>Añadir a la carpeta</span>
              </Button>
            </div>
          </div>

          {/* Bottom Actions (Matches Reference Image 4) */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-full px-5 h-10 font-semibold text-muted-foreground hover:text-foreground text-xs"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={!name.trim() || saving}
              className="rounded-full px-7 h-10 font-semibold bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-primary dark:text-primary-foreground text-xs shadow-sm transition-all"
            >
              {saving ? "Creando..." : "Crear campaña"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
