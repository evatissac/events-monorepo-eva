import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface TablePaginationProps { page: number; pageSize: number; totalItems: number; onPageChange: (page: number) => void; onPageSizeChange?: (pageSize: number) => void; loading?: boolean; itemLabel?: string }

export function TablePagination({ page, pageSize, totalItems, onPageChange, onPageSizeChange, loading, itemLabel = "items" }: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentPage = Math.min(Math.max(page, 1), totalPages)
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalItems)
  const pages = totalPages <= 7 ? Array.from({ length: totalPages }, (_, index) => index + 1) : [...new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages].filter((item) => item >= 1 && item <= totalPages))].sort((a, b) => a - b)
  return <div className="flex min-h-16 flex-wrap items-center justify-between gap-4 border-t border-border px-4 py-3 text-xs text-muted-foreground">
    <div className="flex items-center gap-3"><span className="font-semibold text-foreground">Filas</span>{onPageSizeChange && <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring/50">{[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</select>}<span>{start} - {end} de {totalItems} {itemLabel}</span></div>
    <div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="size-8" disabled={currentPage <= 1 || loading} onClick={() => onPageChange(currentPage - 1)} aria-label="Página anterior"><ChevronLeft className="size-4" /></Button>{pages.map((item, index) => { const previous = pages[index - 1]; return <span key={item} className="flex items-center">{previous && item - previous > 1 && <span className="px-2">…</span>}<Button variant={item === currentPage ? "secondary" : "ghost"} size="icon" className="size-8 text-xs" disabled={loading} onClick={() => onPageChange(item)}>{item}</Button></span> })}<Button variant="ghost" size="icon" className="size-8" disabled={currentPage >= totalPages || loading} onClick={() => onPageChange(currentPage + 1)} aria-label="Página siguiente"><ChevronRight className="size-4" /></Button></div>
  </div>
}
