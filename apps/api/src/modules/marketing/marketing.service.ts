import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
@Injectable()
export class MarketingService {
  constructor(private readonly prisma: PrismaService) {}
  contacts(organizationId: string) { return this.prisma.marketingContact.findMany({ where: { organizationId }, include: { profile: { select: { firstName: true, lastName: true, phone: true } } }, orderBy: { createdAt: 'desc' } }); }
  async createContact(organizationId: string, data: any) { const email = String(data.email || '').trim().toLowerCase(); if (!email) throw new ConflictException('El correo es obligatorio'); const exists = await this.prisma.marketingContact.findFirst({ where: { organizationId, emailFallback: email } }); if (exists) throw new ConflictException('Este contacto ya existe'); return this.prisma.marketingContact.create({ data: { organizationId, emailFallback: email, consentStatus: 'SUBSCRIBED', consentedAt: new Date(), source: 'MANUAL', tags: data.tags || [] } }); }
  async removeContact(organizationId: string, id: string) { const item = await this.prisma.marketingContact.findFirst({ where: { id, organizationId } }); if (!item) throw new NotFoundException('Contacto no encontrado'); return this.prisma.marketingContact.delete({ where: { id } }); }
  segments(organizationId: string) { return this.prisma.marketingSegment.findMany({ where: { organizationId }, include: { _count: { select: { members: true } } }, orderBy: { createdAt: 'desc' } }); }
  createSegment(organizationId: string, data: any) { return this.prisma.marketingSegment.create({ data: { organizationId, name: data.name, description: data.description, type: data.type || 'MANUAL' }, include: { _count: { select: { members: true } } } }); }
  async createSegmentFromEvent(organizationId: string, data: any) {
    const event = await this.prisma.mainEvent.findFirst({ where: { id: data.eventId, organizationId }, select: { id: true, eventName: true } });
    if (!event) throw new BadRequestException('El evento no pertenece a la institución');
    const audience = String(data.audience || 'PARTICIPANTS').toUpperCase();
    const roleNames = audience === 'SPEAKERS' ? ['speaker', 'speaker_mg', 'ponente', 'ponente_mg'] : audience === 'PARTICIPANTS' ? ['participant', 'participante'] : [];
    const people = await this.prisma.eventParticipant.findMany({
      where: {
        edition: { mainEventId: event.id },
        ...(roleNames.length ? { role: { name: { in: roleNames, mode: 'insensitive' } } } : {}),
      },
      include: { profile: { include: { authUser: { select: { email: true } } } } },
    });
    const segment = await this.prisma.marketingSegment.create({ data: { organizationId, name: String(data.name || `${audience === 'SPEAKERS' ? 'Ponentes' : 'Participantes'} · ${event.eventName}`).trim(), description: data.description || `${audience === 'SPEAKERS' ? 'Ponentes' : 'Participantes'} del evento ${event.eventName}`, type: 'EVENT_AUDIENCE', rules: { eventId: event.id, audience } } });
    const contactIds: string[] = [];
    for (const person of people) {
      const extras = Array.isArray(person.profile.additionalEmails) ? person.profile.additionalEmails : [];
      const email = person.profile.authUser?.email || (extras.find((value: unknown) => typeof value === 'string' && value.trim()) as string | undefined);
      if (!email) continue;
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await this.prisma.marketingContact.findFirst({ where: { organizationId, OR: [{ profileId: person.profileId }, { emailFallback: normalizedEmail }] } });
      const contact = existing ? await this.prisma.marketingContact.update({ where: { id: existing.id }, data: { profileId: existing.profileId || person.profileId, emailFallback: existing.emailFallback || normalizedEmail, source: 'EVENT_AUDIENCE' } }) : await this.prisma.marketingContact.create({ data: { organizationId, profileId: person.profileId, emailFallback: normalizedEmail, consentStatus: 'SUBSCRIBED', consentedAt: new Date(), source: 'EVENT_AUDIENCE' } });
      contactIds.push(contact.id);
    }
    if (audience === 'PARTICIPANTS') {
      const submissions = await this.prisma.registrationSubmission.findMany({ where: { form: { mainEventId: event.id }, email: { not: null } }, select: { email: true } });
      for (const submission of submissions) {
        const email = submission.email!.trim().toLowerCase();
        const existing = await this.prisma.marketingContact.findFirst({ where: { organizationId, emailFallback: email } });
        const contact = existing || await this.prisma.marketingContact.create({ data: { organizationId, emailFallback: email, consentStatus: 'SUBSCRIBED', consentedAt: new Date(), source: 'EVENT_REGISTRATION' } });
        contactIds.push(contact.id);
      }
    }
    if (contactIds.length) await this.prisma.marketingSegmentMember.createMany({ data: contactIds.map((contactId) => ({ segmentId: segment.id, contactId })), skipDuplicates: true });
    return this.prisma.marketingSegment.findUnique({ where: { id: segment.id }, include: { _count: { select: { members: true } } } });
  }
  async removeSegment(organizationId: string, id: string) { const item = await this.prisma.marketingSegment.findFirst({ where: { id, organizationId } }); if (!item) throw new NotFoundException('Segmento no encontrado'); return this.prisma.marketingSegment.delete({ where: { id } }); }
}
