import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { Speaker, ParticipantRole } from "@/store/event.store"

export interface FetchSpeakersParams {
  search?: string
  editionId?: string
  page?: number
  pageSize?: number
  sort?: string // "name_asc" | "name_desc" | ""
}

export interface FetchSpeakersResult {
  speakers: Speaker[]
  totalCount: number
  roles: ParticipantRole[]
}

function isSpeakerRole(name?: string) {
  const normalized = String(name || "").trim().toLowerCase().replace(/[\s-]+/g, "_")
  return ["speaker", "speakers", "speaker_mg", "ponente", "ponentes"].includes(normalized)
}

function mapParticipantRole(row: any): ParticipantRole {
  const name = typeof row.name === "string"
    ? (() => { try { return JSON.parse(row.name) } catch { return { es: row.name } } })()
    : (row.name || { es: "" })
  const label = typeof name === "string" ? name : (name.es || "")
  return {
    id: row.id,
    mainEventId: row.mainEventId,
    editionId: row.editionId,
    slug: row.slug || label.toLowerCase().trim().replace(/\s+/g, "-"),
    name: typeof name === "string" ? { es: name } : name,
    badgeColor: row.badgeColor,
    isActive: row.isActive !== false,
    createdAt: row.createdAt || "",
  }
}

export async function fetchEventSpeakers(
  eventId: string,
  params: FetchSpeakersParams
): Promise<FetchSpeakersResult> {
  const formattedRoles = (await api.content.roles(eventId)).map(mapParticipantRole)
  const page = params.page || 1
  const pageSize = params.pageSize || 20
  const participantsData = await api.content.speakers(eventId, params.editionId !== "all" ? params.editionId : undefined)
  const filtered = (participantsData || []).filter((part: any) => {
    const isSpeaker = isSpeakerRole(part.role?.name)
    const matchesSearch = !params.search || `${part.profile?.firstName || ""} ${part.profile?.lastName || ""} ${part.profile?.email || ""}`.toLowerCase().includes(params.search.toLowerCase())
    return isSpeaker && matchesSearch
  })
  const totalCount = filtered.length
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize)

  const speakers: Speaker[] = []
  if (pageData) {
    pageData.forEach((part: any) => {
      const profile = part.profile || {}
      const matchedRole = formattedRoles.find((r) => r.id === part.roleId)
      const roleSlug = matchedRole?.slug || "attendee"
      const roleId = part.roleId || ""
      const fullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Participante"

      speakers.push({
        id: part.id,
        eventId,
        editionId: part.editionId,
        profileId: part.profileId || profile.id || "",
        roleId: roleId,
        roleSlug: roleSlug,
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        name: fullName,
        email: profile.email || "",
        avatar: profile.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
        talkTitle: part.ticketReference || "",
        talkDescription: profile.bio || "",
        bio: profile.bio || "",
        checkedIn: !!part.checkedIn,
        identityDocumentType: profile.identityDocumentType || null,
        identityDocumentNumber: profile.identityDocumentNumber || null,
        institution: profile.institution || "",
      })
    })
  }

  // Client-side sort by name if requested
  if (params.sort === "name_asc") {
    speakers.sort((a, b) => a.name.localeCompare(b.name))
  } else if (params.sort === "name_desc") {
    speakers.sort((a, b) => b.name.localeCompare(a.name))
  }

  return { speakers, totalCount, roles: formattedRoles }
}

export function useSpeakers(eventId: string, params: FetchSpeakersParams) {
  return useQuery({
    queryKey: ["speakers", eventId, params],
    queryFn: () => fetchEventSpeakers(eventId, params),
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60, // 1 minute stale time
  })
}
