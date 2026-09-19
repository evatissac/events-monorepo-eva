import React, { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { TablePagination } from "@/components/ui/table-pagination"

export interface ColumnDef<T> {
  header: React.ReactNode
  accessorKey?: keyof T | string
  cell?: (row: T, index: number) => React.ReactNode
  className?: string
  headerClassName?: string
}

export interface DataTablePagination {
  pageSize?: number
  page?: number
  totalItems?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  loading?: boolean
  itemLabel?: string
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  emptyState?: React.ReactNode
  containerClassName?: string
  tableClassName?: string
  theadClassName?: string
  tbodyClassName?: string
  rowClassName?: string | ((row: T, index: number) => string)
  onRowClick?: (row: T, index: number) => void
  maxHeight?: string
  pagination?: DataTablePagination | false
}

export function DataTable<T>({ columns, data, emptyState, containerClassName = "", tableClassName = "", theadClassName = "", tbodyClassName = "", rowClassName = "", onRowClick, maxHeight = "32rem", pagination = {} }: DataTableProps<T>) {
  const isPaginated = pagination !== false
  const paginationOptions = pagination === false ? {} : pagination
  const isControlled = Boolean(paginationOptions.onPageChange)
  const [clientPage, setClientPage] = useState(1)
  const [clientPageSize, setClientPageSize] = useState(paginationOptions.pageSize ?? 10)
  const page = paginationOptions.page ?? clientPage
  const pageSize = paginationOptions.pageSize ?? clientPageSize
  const totalItems = paginationOptions.totalItems ?? data.length
  const visibleData = useMemo(() => {
    if (!isPaginated || isControlled) return data
    return data.slice((page - 1) * pageSize, page * pageSize)
  }, [data, isControlled, isPaginated, page, pageSize])
  const changePage = (nextPage: number) => paginationOptions.onPageChange ? paginationOptions.onPageChange(nextPage) : setClientPage(nextPage)
  const changePageSize = (nextPageSize: number) => {
    paginationOptions.onPageSizeChange?.(nextPageSize)
    if (!paginationOptions.onPageSizeChange) setClientPageSize(nextPageSize)
    changePage(1)
  }

  if (!data || data.length === 0) return emptyState ? <>{emptyState}</> : null

  return <div className={cn("overflow-hidden border border-border rounded-xl bg-card shadow-xs", containerClassName)}>
    <div className="overflow-auto" style={{ maxHeight }}>
      <table className={cn("w-full text-sm text-left border-collapse bg-card", tableClassName)}>
        <thead className="sticky top-0 z-10"><tr className={cn("bg-muted text-xs font-semibold text-muted-foreground border-b border-border", theadClassName)}>
          {columns.map((col, idx) => <th key={idx} scope="col" className={cn("p-4 whitespace-nowrap", col.headerClassName)}>{col.header}</th>)}
        </tr></thead>
        <tbody className={cn("divide-y divide-border/50 bg-card", tbodyClassName)}>{visibleData.map((row, rowIdx) => {
          const rClassName = typeof rowClassName === "function" ? rowClassName(row, rowIdx) : rowClassName
          return <tr key={rowIdx} onClick={() => onRowClick?.(row, rowIdx)} className={cn("hover:bg-muted/40 transition-colors bg-card", onRowClick && "cursor-pointer", rClassName)}>
            {columns.map((col, colIdx) => <td key={colIdx} className={cn("p-4", col.className)}>{col.cell ? col.cell(row, rowIdx) : col.accessorKey ? String((row as Record<string, unknown>)[String(col.accessorKey)] ?? "") : null}</td>)}
          </tr>
        })}</tbody>
      </table>
    </div>
    {isPaginated && totalItems > 0 && <TablePagination page={page} pageSize={pageSize} totalItems={totalItems} onPageChange={changePage} onPageSizeChange={changePageSize} loading={paginationOptions.loading} itemLabel={paginationOptions.itemLabel} />}
  </div>
}
