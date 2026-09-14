import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import crypto from 'node:crypto';

const isSpeakerRole = (name?: string | null) => {
  const normalized = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return ['speaker', 'speakers', 'speaker_mg', 'ponente', 'ponentes'].includes(normalized);
};
@Injectable()
export class EventContentService {
  constructor(private readonly prisma: PrismaService) {}
  activities(editionId: string) { return this.prisma.eventActivity.findMany({ where: { editionId }, include: { sessions: { include: { speakers: { include: { profile: true } } } } }, orderBy: { startsAt: 'asc' } }); }
  createActivity(editionId: string, data: { title: string; description?: string; startsAt?: string; endsAt?: string }) { return this.prisma.eventActivity.create({ data: { editionId, title: data.title, description: data.description, startsAt: data.startsAt ? new Date(data.startsAt) : undefined, endsAt: data.endsAt ? new Date(data.endsAt) : undefined } }); }
  updateActivity(id: string, data: Record<string, unknown>) { return this.prisma.eventActivity.update({ where: { id }, data }); }
  deleteActivity(id: string) { return this.prisma.eventActivity.delete({ where: { id } }); }
  sessions(activityId: string) { return this.prisma.eventSession.findMany({ where: { activityId }, include: { speakers: { include: { profile: true } } } }); }
  createSession(activityId: string, title: string, description?: string) { return this.prisma.eventSession.create({ data: { activityId, title, description } }); }
  async createSessionForEdition(editionId: string, title: string, description?: string) { let activity = await this.prisma.eventActivity.findFirst({ where: { editionId }, orderBy: { startsAt: 'asc' } }); if (!activity) activity = await this.prisma.eventActivity.create({ data: { editionId, title: 'Agenda principal' } }); return this.prisma.eventSession.create({ data: { activityId: activity.id, title, description } }); }
  async sessionsForParticipant(participantId: string) { const participant = await this.prisma.eventParticipant.findUnique({ where: { id: participantId }, select: { profileId: true } }); if (!participant) throw new NotFoundException('Ponente no encontrado'); return this.prisma.eventSession.findMany({ where: { speakers: { some: { profileId: participant.profileId } } }, include: { speakers: { include: { profile: true } } } }); }
  updateSession(id: string, data: Record<string, unknown>) { return this.prisma.eventSession.update({ where: { id }, data }); }
  deleteSession(id: string) { return this.prisma.eventSession.delete({ where: { id } }); }
  addSpeaker(sessionId: string, profileId: string) { return this.prisma.sessionSpeaker.create({ data: { sessionId, profileId }, include: { profile: true } }); }
  removeSpeaker(id: string) { return this.prisma.sessionSpeaker.delete({ where: { id } }); }
  tickets(editionId: string) { return this.prisma.eventTicket.findMany({ where: { editionId }, orderBy: { name: 'asc' } }); }
  createTicket(editionId: string, data: { name: string; price: number; capacity?: number }) { return this.prisma.eventTicket.create({ data: { editionId, name: data.name, price: data.price, capacity: data.capacity } }); }
  updateTicket(id: string, data: Record<string, unknown>) { return this.prisma.eventTicket.update({ where: { id }, data }); }
  deleteTicket(id: string) { return this.prisma.eventTicket.delete({ where: { id } }); }
  thematicLines(eventId: string) { return this.prisma.thematicLine.findMany({ where: { mainEventId: eventId }, orderBy: { name: 'asc' } }); }
  createThematicLine(eventId: string, name: string, description?: string) { return this.prisma.thematicLine.create({ data: { mainEventId: eventId, name, description } }); }
  updateThematicLine(id: string, data: Record<string, unknown>) { return this.prisma.thematicLine.update({ where: { id }, data }); }
  deleteThematicLine(id: string) { return this.prisma.thematicLine.delete({ where: { id } }); }
  roles(mainEventId?: string, editionId?: string) { return this.prisma.participantRole.findMany({ where: { mainEventId: mainEventId || undefined, editionId: editionId || undefined }, orderBy: { createdAt: 'desc' } }); }
  async createRole(data: { name: string; mainEventId?: string; editionId?: string }) {
    const name = data.name.trim();
    const existing = await this.prisma.participantRole.findFirst({ where: { mainEventId: data.mainEventId || null, editionId: data.editionId || null, name: { equals: name, mode: 'insensitive' } } });
    if (existing) return existing;
    return this.prisma.participantRole.create({ data: { ...data, name } });
  }
  updateRole(id: string, data: { name?: string; mainEventId?: string; editionId?: string }) { return this.prisma.participantRole.update({ where: { id }, data }); }
  async deleteRole(id: string) {
    const assignedParticipants = await this.prisma.eventParticipant.count({ where: { roleId: id } });
    if (assignedParticipants > 0) throw new ConflictException(`No se puede eliminar este rol porque está asignado a ${assignedParticipants} participante${assignedParticipants === 1 ? '' : 's'}. Reasigna o elimina esos participantes primero.`);
    return this.prisma.participantRole.delete({ where: { id } });
  }
  async speakers(eventId: string, editionId?: string) {
    const editions = editionId ? [editionId] : (await this.prisma.edition.findMany({ where: { mainEventId: eventId }, select: { id: true } })).map((e: { id: string }) => e.id);
    const participants = await this.prisma.eventParticipant.findMany({ where: { editionId: { in: editions } }, include: { profile: true, edition: true, role: true }, orderBy: { registeredAt: 'desc' } });
    return participants.filter((participant) => isSpeakerRole(participant.role?.name));
  }
  async createSpeaker(data: { eventId: string; editionId: string; profileId?: string | null; roleId?: string | null; firstName: string; lastName: string; bio?: string }) {
    const edition = await this.prisma.edition.findFirst({ where: { id: data.editionId, mainEventId: data.eventId } });
    if (!edition) throw new BadRequestException('La edición seleccionada no pertenece a este evento');
    if (!data.roleId) throw new BadRequestException('Debes seleccionar un rol para registrar al ponente');
    if (data.roleId) {
      const role = await this.prisma.participantRole.findFirst({ where: { id: data.roleId, OR: [{ mainEventId: data.eventId }, { editionId: data.editionId }] } });
      if (!role) throw new BadRequestException('El rol seleccionado no pertenece a este evento');
    }
    const profile = data.profileId ? await this.prisma.profile.findUnique({ where: { id: data.profileId } }) : await this.prisma.profile.create({ data: { id: crypto.randomUUID(), firstName: data.firstName, lastName: data.lastName, bio: data.bio } });
    if (!profile) throw new NotFoundException('El perfil seleccionado no existe');
    const existing = await this.prisma.eventParticipant.findUnique({ where: { editionId_profileId: { editionId: data.editionId, profileId: profile.id } } });
    if (existing) return this.prisma.eventParticipant.findUnique({ where: { id: existing.id }, include: { profile: true, edition: true, role: true } });
    return this.prisma.eventParticipant.create({ data: { editionId: data.editionId, profileId: profile.id, roleId: data.roleId || undefined }, include: { profile: true, edition: true, role: true } });
  }
  async updateSpeaker(id: string, data: Record<string, unknown>) { let participant = await this.prisma.eventParticipant.findUnique({ where: { id } }); if (!participant) participant = await this.prisma.eventParticipant.findFirst({ where: { profileId: id } }); if (!participant) throw new NotFoundException('Ponente no encontrado'); const profileData = Object.fromEntries(Object.entries({ firstName: data.firstName, lastName: data.lastName, bio: data.bio }).filter(([, v]) => v !== undefined)); if (Object.keys(profileData).length) await this.prisma.profile.update({ where: { id: participant.profileId }, data: profileData }); return this.prisma.eventParticipant.findUnique({ where: { id: participant.id }, include: { profile: true, edition: true, role: true } }); }
  async deleteSpeaker(id: string) {
    const participant = await this.prisma.eventParticipant.findUnique({ where: { id } });
    if (!participant) throw new NotFoundException('Ponente no encontrado');
    const topics = await this.prisma.sessionSpeaker.count({ where: { profileId: participant.profileId } });
    if (topics) throw new ConflictException('No se puede eliminar este ponente porque tiene temas o sesiones asignados.');
    return this.prisma.eventParticipant.delete({ where: { id } });
  }
  resources(sessionId: string) { return this.prisma.sessionResource.findMany({ where: { sessionId }, orderBy: { createdAt: 'asc' } }); }
  addResource(sessionId: string, data: { name: string; url: string; type?: string }) { return this.prisma.sessionResource.create({ data: { sessionId, ...data } }); }
  updateResource(id: string, data: Record<string, unknown>) { return this.prisma.sessionResource.update({ where: { id }, data }); }
  removeResource(id: string) { return this.prisma.sessionResource.delete({ where: { id } }); }
  sessionLines(sessionId: string) { return this.prisma.sessionThematicLine.findMany({ where: { sessionId }, include: { thematicLine: true } }); }
  addSessionLine(sessionId: string, thematicLineId: string) { return this.prisma.sessionThematicLine.create({ data: { sessionId, thematicLineId } }); }
  removeSessionLine(sessionId: string, thematicLineId: string) { return this.prisma.sessionThematicLine.delete({ where: { sessionId_thematicLineId: { sessionId, thematicLineId } } }); }
}
