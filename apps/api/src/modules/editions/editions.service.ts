import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { parsePeruDateTime } from '../../common/peru-time.js';
@Injectable()
export class EditionsService {
  constructor(private readonly prisma: PrismaService) {}
  list(eventId: string) { return this.prisma.edition.findMany({ where: { mainEventId: eventId }, include: { activities: true, tickets: true, _count: { select: { participants: true } } }, orderBy: { startDate: 'desc' } }); }
  async get(id: string) { const edition = await this.prisma.edition.findUnique({ where: { id }, include: { activities: { include: { sessions: true } }, tickets: true, participants: { include: { profile: true } } } }); if (!edition) throw new NotFoundException('Edición no encontrada'); return edition; }
  create(eventId: string, data: { name: string; startDate?: string; endDate?: string; modality?: string; location?: string; description?: string; coverUrl?: string; metaThumbnailUrl?: string; isCurrent?: boolean; latitude?: number; longitude?: number }) { return this.prisma.edition.create({ data: { mainEventId: eventId, name: data.name, startDate: data.startDate ? parsePeruDateTime(data.startDate) : undefined, endDate: data.endDate ? parsePeruDateTime(data.endDate) : undefined, modality: data.modality || null, location: data.location || null, description: data.description || null, coverUrl: data.coverUrl || null, metaThumbnailUrl: data.metaThumbnailUrl || null, isCurrent: data.isCurrent ?? false, latitude: data.latitude ?? null, longitude: data.longitude ?? null } }); }
  update(id: string, data: Record<string, unknown>) {
    const input = { ...data };
    if (typeof input.startDate === 'string') input.startDate = parsePeruDateTime(input.startDate);
    if (input.endDate === '' || input.endDate === null) input.endDate = null;
    else if (typeof input.endDate === 'string') input.endDate = parsePeruDateTime(input.endDate);
    return this.prisma.edition.update({ where: { id }, data: input });
  }
  async remove(id: string) {
    const [participants, activities, tickets] = await Promise.all([
      this.prisma.eventParticipant.count({ where: { editionId: id } }),
      this.prisma.eventActivity.count({ where: { editionId: id } }),
      this.prisma.eventTicket.count({ where: { editionId: id } }),
    ]);
    if (participants || activities || tickets) {
      throw new ConflictException('No se puede eliminar esta edición porque tiene participantes, actividades o entradas asociadas.');
    }
    return this.prisma.edition.delete({ where: { id } });
  }
  createActivity(editionId: string, data: { title: string; description?: string; startsAt?: string; endsAt?: string }) { return this.prisma.eventActivity.create({ data: { editionId, title: data.title, description: data.description, startsAt: data.startsAt ? new Date(data.startsAt) : undefined, endsAt: data.endsAt ? new Date(data.endsAt) : undefined } }); }
}
