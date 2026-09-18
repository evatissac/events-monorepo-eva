import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
@Injectable()
export class ParticipantsService {
  constructor(private readonly prisma: PrismaService) {}
  async list(editionId: string) {
    const participants = await this.prisma.eventParticipant.findMany({ where: { editionId }, include: { profile: { include: { authUser: true } }, edition: true, certificates: true }, orderBy: { registeredAt: 'desc' } });
    return participants.map(({ profile, ...participant }) => {
      const extraEmails = Array.isArray(profile.additionalEmails) ? profile.additionalEmails : [];
      const email = profile.authUser?.email || extraEmails.find((value: unknown) => typeof value === 'string' && value.trim()) || null;
      const { authUser, ...profileDetails } = profile;
      return { ...participant, profile: { ...profileDetails, email } };
    });
  }
  async add(editionId: string, profileId: string, roleId?: string) { const exists = await this.prisma.eventParticipant.findUnique({ where: { editionId_profileId: { editionId, profileId } } }); if (exists) throw new ConflictException('El perfil ya está registrado'); return this.prisma.eventParticipant.create({ data: { editionId, profileId, roleId }, include: { profile: true } }); }
  async addManual(eventId: string, data: { editionId?: string; firstName: string; lastName: string; email: string; identityDocumentType?: string | null; identityDocumentNumber?: string | null }) {
    const edition = data.editionId
      ? await this.prisma.edition.findFirst({ where: { id: data.editionId, mainEventId: eventId } })
      : await this.prisma.edition.findFirst({ where: { mainEventId: eventId }, orderBy: [{ isCurrent: 'desc' }, { createdAt: 'asc' }] });
    if (!edition) throw new NotFoundException('Crea o activa una edición antes de registrar participantes manualmente.');
    const event = await this.prisma.mainEvent.findUnique({ where: { id: eventId }, select: { organizationId: true } });
    if (!event) throw new NotFoundException('Evento no encontrado');
    return this.prisma.$transaction(async (tx) => {
      let role = await tx.participantRole.findFirst({ where: { mainEventId: eventId, name: { equals: 'participant', mode: 'insensitive' } } });
      if (!role) role = await tx.participantRole.create({ data: { mainEventId: eventId, name: 'participant' } });
      const normalizedEmail = data.email.trim().toLowerCase();
      const profile = await tx.profile.create({ data: { organizationId: event.organizationId, firstName: data.firstName.trim(), lastName: data.lastName.trim(), identityDocumentType: data.identityDocumentType || null, identityDocumentNumber: data.identityDocumentNumber || null, additionalEmails: [normalizedEmail] } });
      return tx.eventParticipant.create({ data: { editionId: edition.id, profileId: profile.id, roleId: role.id }, include: { profile: true, edition: true, role: true } });
    });
  }
  async get(id: string) { const item = await this.prisma.eventParticipant.findUnique({ where: { id }, include: { profile: true, edition: true, certificates: true } }); if (!item) throw new NotFoundException('Participante no encontrado'); return item; }
  update(id: string, data: { checkedIn?: boolean }) { return this.prisma.eventParticipant.update({ where: { id }, data: { checkedIn: data.checkedIn } }); }
  async changeRole(id: string, roleId: string, actor: { accountId?: string; role?: string }) {
    const participant = await this.prisma.eventParticipant.findUnique({ where: { id }, include: { edition: { include: { mainEvent: true } } } });
    if (!participant) throw new NotFoundException('Participante no encontrado');
    const isGlobalAdmin = ['SUPER_ADMIN', 'SAAS_ADMIN'].includes(actor.role || '');
    const organizationId = participant.edition.mainEvent.organizationId;
    const membership = actor.accountId && organizationId ? await this.prisma.organizationMember.findFirst({ where: { organizationId, accountId: actor.accountId, role: { in: ['OWNER', 'ADMIN'] } } }) : null;
    if (!isGlobalAdmin && !membership) throw new ForbiddenException('Solo un administrador de la organización puede cambiar el rol.');
    const role = await this.prisma.participantRole.findFirst({ where: { id: roleId, OR: [{ mainEventId: participant.edition.mainEventId }, { editionId: participant.editionId }] } });
    if (!role) throw new NotFoundException('El rol no pertenece a este evento o edición');
    return this.prisma.eventParticipant.update({ where: { id }, data: { roleId }, include: { profile: true, role: true } });
  }
  remove(id: string) { return this.prisma.eventParticipant.delete({ where: { id } }); }
}
