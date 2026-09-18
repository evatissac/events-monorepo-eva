import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
  async add(editionId: string, profileId: string) { const exists = await this.prisma.eventParticipant.findUnique({ where: { editionId_profileId: { editionId, profileId } } }); if (exists) throw new ConflictException('El perfil ya está registrado'); return this.prisma.eventParticipant.create({ data: { editionId, profileId }, include: { profile: true } }); }
  async get(id: string) { const item = await this.prisma.eventParticipant.findUnique({ where: { id }, include: { profile: true, edition: true, certificates: true } }); if (!item) throw new NotFoundException('Participante no encontrado'); return item; }
  update(id: string, data: { checkedIn?: boolean }) { return this.prisma.eventParticipant.update({ where: { id }, data: { checkedIn: data.checkedIn } }); }
  remove(id: string) { return this.prisma.eventParticipant.delete({ where: { id } }); }
}
