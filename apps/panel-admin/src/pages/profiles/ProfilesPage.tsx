import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAdminProfilesStore } from "@/store/admin-profiles.store"
import { Search, SlidersHorizontal, UserCheck, Eye, EyeOff, Plus, ExternalLink, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { useSEO } from "@/hooks/use-seo"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { useAuthStore } from "@/store/auth.store"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

export function ProfilesPage() {
  const navigate = useNavigate()
  const { profiles, isLoading, loadAllProfiles, deleteProfile } = useAdminProfilesStore()
  const selectedOrganization = useAuthStore((state) => state.selectedOrganization)

  useSEO({
    title: "Directorio de Perfiles Registrados",
    description: "Busca, filtra y gestiona los roles, privilegios y estado de todos los perfiles de usuario registrados en la plataforma."
  })

  useEffect(() => {
    loadAllProfiles(selectedOrganization?.id)
  }, [loadAllProfiles, selectedOrganization?.id])

  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")

  // Filter logic
  const filteredProfiles = profiles.filter((p) => {
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase()
    const email = (p.email || "").toLowerCase()
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      email.includes(searchQuery.toLowerCase())

    const matchesRole = roleFilter === "all" || p.globalRole === roleFilter
    return matchesSearch && matchesRole
  })

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    return new Date(dateStr).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric"
    })
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
      case "ADMIN":
        return <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 font-bold">Admin</Badge>
      case "super_admin":
      case "SUPER_ADMIN":
        return <Badge className="bg-violet-500/10 text-violet-500 border-violet-500/20 font-bold">Super administrador</Badge>
      default:
        return <Badge className="bg-slate-500/10 text-slate-500 border-slate-500/20">Usuario</Badge>
    }
  }

  const columns: ColumnDef<any>[] = [
    {
      header: "Usuario",
      cell: (p) => {
        const fullName = `${p.firstName} ${p.lastName}`.trim() || "Usuario sin nombre"
        const avatarSeed = encodeURIComponent(fullName || p.email || "User")
        return (
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <img
                src={p.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${avatarSeed}`}
                alt={fullName}
                className="size-9 rounded-lg object-cover border border-border/80"
              />
              {(!p.email || !p.identityDocumentNumber) && (
                <span
                  className="absolute -top-1 -right-1 size-3.5 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-background shadow-xs select-none cursor-help animate-pulse"
                  title={
                    !p.email && !p.identityDocumentNumber
                      ? "Falta registrar correo electrónico y número de documento"
                      : !p.email
                      ? "Falta registrar correo electrónico"
                      : "Falta registrar número de documento"
                  }
                >
                  !
                </span>
              )}
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="font-bold text-sm text-foreground">{fullName}</p>
              {p.email ? (
                <p className="text-xs text-muted-foreground truncate">{p.email}</p>
              ) : (
                <p className="text-xs text-amber-500 italic truncate">Sin correo registrado</p>
              )}
            </div>
          </div>
        )
      }
    },
    {
      header: "Rol Global",
      cell: (p) => getRoleBadge(p.globalRole)
    },
    {
      header: "Estado",
      cell: (p) => p.isPublic ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
          <Eye className="size-3.5" />
          Público
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
          <EyeOff className="size-3.5" />
          Privado
        </span>
      )
    },
    {
      header: "Registro",
      className: "text-xs text-muted-foreground",
      cell: (p) => formatDate(p.createdAt)
    },
    {
      header: "Acción",
      headerClassName: "text-right",
      className: "text-right",
      cell: (p) => (
        <div className="flex justify-end gap-1">
          <Button asChild variant="ghost" size="icon" className="size-8" title="Gestionar perfil">
            <a href={`/dashboard/profiles/${p.id}/info`}><ExternalLink className="size-4" /></a>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" title="Eliminar perfil"><Trash2 className="size-4" /></Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>¿Eliminar este perfil?</AlertDialogTitle><AlertDialogDescription>Se eliminará el perfil de la institución y sus datos asociados. Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void deleteProfile(p.id).then(() => toast.success("Perfil eliminado")).catch((error: any) => toast.error(error?.message || "No se pudo eliminar el perfil"))}>Eliminar perfil</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        title="Perfiles Registrados"
        description="Explora, busca y administra las cuentas, accesos y privilegios globales de los usuarios de la plataforma."
        actionButton={
          <Button onClick={() => navigate("new")} className="flex items-center gap-2">
            <Plus className="size-4" />
            Registrar Perfil
          </Button>
        }
      />

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-card p-4 rounded-xl border border-border/80">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, apellido o correo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SlidersHorizontal className="size-4 text-muted-foreground mr-1 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Rol:</span>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="Todos los roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="USER">Usuario</SelectItem>
                <SelectItem value="ADMIN">Administrador</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>
      </div>

      {/* Profiles list table */}
      {isLoading ? (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="p-4 bg-muted/20 border-b border-border h-12 animate-pulse" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-6 border-b border-border/50 flex items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3 w-1/3">
                <div className="size-9 rounded-lg bg-muted shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
              <div className="h-6 bg-muted rounded w-20" />
              <div className="h-6 bg-muted rounded w-20" />
              <div className="h-8 bg-muted rounded w-24" />
            </div>
          ))}
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="p-16 text-center text-muted-foreground text-sm border border-dashed border-border rounded-xl bg-card/20 space-y-3">
          <UserCheck className="size-10 mx-auto opacity-30" />
          <div>
            <p className="font-semibold text-lg text-foreground">No se encontraron perfiles</p>
            <p className="text-xs text-muted-foreground">
              Intenta cambiar los términos de búsqueda o los filtros aplicados.
            </p>
          </div>
        </div>
      ) : (
        <DataTable columns={columns} data={filteredProfiles} />
      )}
    </div>
  )
}
