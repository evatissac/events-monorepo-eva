import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Search,
  Trash2,
  UserPlus,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import type { Contact } from "../types"

interface ContactsTabProps {
  contacts: Contact[]
  page: number
  totalItems: number
  onPageChange: (page: number) => void
  onAddContact: (contact: { email: string; firstName?: string; lastName?: string; tags?: string[] }) => void
  onDeleteContact: (id: string) => void
}

export function ContactsTab({
  contacts,
  page,
  totalItems,
  onPageChange,
  onAddContact,
  onDeleteContact,
}: ContactsTabProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("q") || "")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [openModal, setOpenModal] = useState(false)
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [tagInput, setTagInput] = useState("")

  useEffect(() => setSearch(searchParams.get("q") || ""), [searchParams])

  const updateSearch = (value: string) => {
    setSearch(value)
    const next = new URLSearchParams(searchParams)
    if (value.trim()) next.set("q", value.trim())
    else next.delete("q")
    next.set("page", "1")
    setSearchParams(next)
  }

  const filteredContacts = contacts.filter((c) => {
    const email = c.email || ""
    const fullName = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase()
    const matchesSearch =
      email.toLowerCase().includes(search.toLowerCase()) ||
      fullName.includes(search.toLowerCase()) ||
      c.tags?.some((t) => (t || "").toLowerCase().includes(search.toLowerCase()))
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    onAddContact({
      email: email.trim(),
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      tags: tagInput ? tagInput.split(",").map((t) => t.trim()) : ["Nuevo"],
    })

    setEmail("")
    setFirstName("")
    setLastName("")
    setTagInput("")
    setOpenModal(false)
    toast.success("Contacto añadido a tu base de datos")
  }

  const handleExportCSV = () => {
    toast.success("Exportando base de contactos en formato CSV...")
  }

  const columns: ColumnDef<Contact>[] = [
    {
      header: "Contacto / Nombre",
      cell: (contact) => {
        const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ")
        return <span className="text-foreground">{fullName || "—"}</span>
      },
    },
    { header: "Correo electrónico", cell: (contact) => <span className="text-foreground">{contact.email}</span> },
    {
      header: "Estado",
      cell: (contact) => (
        <Badge variant="secondary" className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium border-0 ${contact.status === "SUBSCRIBED"
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : contact.status === "BOUNCED"
            ? "bg-red-500/10 text-red-600 dark:text-red-400"
            : "bg-muted text-muted-foreground"
          }`}>
          {contact.status === "SUBSCRIBED" ? "Suscrito" : contact.status === "BOUNCED" ? "Rebotado" : "Desuscrito"}
        </Badge>
      ),
    },
    {
      header: "Etiquetas",
      cell: (contact) => <div className="flex flex-wrap gap-1">{contact.tags?.map((tag) => <span key={tag} className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-600 dark:text-violet-400">#{tag}</span>)}</div>,
    },
    {
      header: "Fecha de alta",
      cell: (contact) => <span className="text-muted-foreground">{new Date(contact.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}</span>,
    },
    {
      header: "Acciones",
      headerClassName: "text-right",
      className: "text-right",
      cell: (contact) => <Button variant="ghost" size="icon" onClick={() => onDeleteContact(contact.id)} className="size-8 text-muted-foreground hover:text-destructive" title="Eliminar contacto" aria-label={`Eliminar ${contact.email}`}><Trash2 className="size-3.5" /></Button>,
    },
  ]

  return (
    <div className="space-y-5">
      {/* Top Filter & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, email o etiqueta..."
              value={search}
              onChange={(e) => updateSearch(e.target.value)}
              className="pl-8 h-9 text-xs rounded-xl border-border bg-background"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
          >
            <option value="ALL">Todos los estados</option>
            <option value="SUBSCRIBED">Suscritos</option>
            <option value="UNSUBSCRIBED">Desuscritos</option>
            <option value="BOUNCED">Rebotados</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span className="text-foreground">{totalItems}</span> contactos
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="rounded-xl h-9 px-3 text-xs font-semibold"
          >
            <Download className="mr-1.5 size-3.5 text-muted-foreground" />
            Exportar
          </Button>

          <Button
            onClick={() => setOpenModal(true)}
            className="rounded-xl h-9 px-4 font-semibold bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-primary dark:text-primary-foreground text-xs shadow-sm flex items-center gap-1.5"
          >
            <UserPlus className="size-3.5" />
            <span>Añadir contacto</span>
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredContacts}
        emptyState={<div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No se encontraron contactos registrados.</div>}
        containerClassName="border border-border rounded-xl bg-card"
        pagination={{ page, pageSize: 20, totalItems: statusFilter === "ALL" ? totalItems : filteredContacts.length, itemLabel: "contactos", onPageChange }}
      />

      {/* Add Contact Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-[480px] p-6 rounded-3xl border-border bg-card">
          <DialogHeader className="space-y-1 text-left pb-2">
            <DialogTitle className="text-xl font-bold text-foreground">
              Añadir contacto
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Agrega un suscriptor manual a tu base de marketing.
            </p>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Correo electrónico <span className="text-red-500">*</span>
              </label>
              <Input
                required
                type="email"
                placeholder="usuario@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl h-10 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Nombre</label>
                <Input
                  placeholder="Juan"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="rounded-xl h-10 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Apellido</label>
                <Input
                  placeholder="Pérez"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="rounded-xl h-10 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Etiquetas (separadas por coma)
              </label>
              <Input
                placeholder="CONIAP 2024, Ponente, VIP"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className="rounded-xl h-10 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenModal(false)}
                className="rounded-full text-xs h-9 px-4"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-full text-xs h-9 px-5 bg-neutral-900 text-white dark:bg-primary dark:text-primary-foreground font-semibold"
              >
                Guardar contacto
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
