import { useState } from "react"
import { Check, Users } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Segment } from "../types"

interface RecipientsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  segments: Segment[]
  selectedSegmentIds: string[]
  onSave: (segmentIds: string[]) => void
}

export function RecipientsModal({
  open,
  onOpenChange,
  segments,
  selectedSegmentIds,
  onSave,
}: RecipientsModalProps) {
  const [selected, setSelected] = useState<string[]>(selectedSegmentIds)

  const toggleSegment = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((item) => item !== id))
    } else {
      setSelected([...selected, id])
    }
  }

  const handleSave = () => {
    onSave(selected)
    onOpenChange(false)
  }

  const activeSegments = segments

  const totalRecipients = activeSegments
    .filter((s) => selected.includes(s.id))
    .reduce((acc, curr) => acc + (curr._count?.members || 1), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-6 rounded-3xl border-border bg-card">
        <DialogHeader className="space-y-1 text-left pb-2">
          <DialogTitle className="text-xl font-bold text-foreground">
            Añadir destinatarios
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Selecciona las listas o segmentos que recibirán esta campaña.
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {activeSegments.length === 0 && (
              <p className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">
                No hay segmentos reales todavía. Crea uno desde la pestaña Segmentos o usa una secuencia de webinar para trabajar directamente con sus inscritos.
              </p>
            )}
            {activeSegments.map((segment) => {
              const isChecked = selected.includes(segment.id)
              return (
                <div
                  key={segment.id}
                  onClick={() => toggleSegment(segment.id)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${isChecked
                    ? "border-violet-600 bg-violet-50/20 dark:bg-violet-950/20 shadow-xs"
                    : "border-border/80 hover:border-border hover:bg-muted/40"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`size-5 rounded-lg border flex items-center justify-center transition-colors ${isChecked
                        ? "bg-violet-600 border-violet-600 text-white"
                        : "border-muted-foreground/40 bg-background"
                        }`}
                    >
                      {isChecked && <Check className="size-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        {segment.name}
                      </h4>
                      {segment.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {segment.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full shrink-0">
                    <Users className="size-3 text-violet-600" />
                    <span>{segment._count?.members || 0} contactos</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-2xl border border-border/50 text-xs">
            <span className="font-semibold text-foreground">Total estimado:</span>
            <span className="font-bold text-violet-600 dark:text-violet-400">
              {totalRecipients} destinatarios seleccionados
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-full text-xs h-9 px-4"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="rounded-full text-xs h-9 px-5 bg-neutral-900 text-white dark:bg-primary dark:text-primary-foreground font-semibold"
            >
              Guardar destinatarios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
