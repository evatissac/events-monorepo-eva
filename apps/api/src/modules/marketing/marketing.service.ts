import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class MarketingService {
  constructor(private readonly prisma: PrismaService) {}

  async contacts(organizationId: string, page = 1, limit = 20, search?: string) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const term = String(search || '').trim();
    const where = { organizationId, ...(term ? { emailFallback: { contains: term, mode: 'insensitive' as const } } : {}) };
    const total = await this.prisma.marketingContact.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    const resolvedPage = Math.min(safePage, totalPages);
    const contacts = await this.prisma.marketingContact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (resolvedPage - 1) * safeLimit,
      take: safeLimit,
      include: { profile: { select: { firstName: true, lastName: true, phone: true } } },
    });
    const emails = contacts.map((contact) => contact.emailFallback).filter((email): email is string => Boolean(email));
    if (!emails.length) return { items: contacts, total, page: resolvedPage, limit: safeLimit };
    const submissions = await this.prisma.registrationSubmission.findMany({
      where: { email: { in: emails }, form: { mainEvent: { organizationId } } },
      select: { email: true, answers: true, submittedAt: true },
      orderBy: { submittedAt: 'desc' },
    });
    const names = new Map<string, { firstName?: string; lastName?: string }>();
    for (const submission of submissions) {
      const email = String(submission.email || '').trim().toLowerCase();
      if (!email || names.has(email)) continue;
      const answers = submission.answers && typeof submission.answers === 'object' ? submission.answers as Record<string, unknown> : {};
      const firstName = [answers.first_name, answers.firstName, answers.nombres, answers.name].find((value) => typeof value === 'string' && value.trim()) as string | undefined;
      const lastName = [answers.last_name, answers.lastName, answers.apellidos, answers.surname].find((value) => typeof value === 'string' && value.trim()) as string | undefined;
      const fullName = [answers.full_name, answers.nombres_completos].find((value) => typeof value === 'string' && value.trim()) as string | undefined;
      const parts = fullName?.trim().split(/\s+/) || [];
      names.set(email, { firstName: firstName?.trim() || parts[0], lastName: lastName?.trim() || (parts.length > 1 ? parts.slice(1).join(' ') : undefined) });
    }
    return { items: contacts.map((contact) => ({ ...contact, ...names.get(String(contact.emailFallback || '').toLowerCase()) })), total, page: resolvedPage, limit: safeLimit };
  }

  async createContact(organizationId: string, data: any) {
    const email = String(data.email || '').trim().toLowerCase();
    if (!email) throw new ConflictException('El correo es obligatorio');
    const exists = await this.prisma.marketingContact.findFirst({ where: { organizationId, emailFallback: email } });
    if (exists) throw new ConflictException('Este contacto ya existe');
    return this.prisma.marketingContact.create({ data: { organizationId, emailFallback: email, consentStatus: 'SUBSCRIBED', consentedAt: new Date(), source: 'MANUAL', tags: data.tags || [] } });
  }

  async removeContact(organizationId: string, id: string) {
    const item = await this.prisma.marketingContact.findFirst({ where: { id, organizationId } });
    if (!item) throw new NotFoundException('Contacto no encontrado');
    return this.prisma.marketingContact.delete({ where: { id } });
  }

  async segments(organizationId: string) {
    await this.syncEventAudiences(organizationId);
    return this.prisma.marketingSegment.findMany({ where: { organizationId }, include: { _count: { select: { members: true } } }, orderBy: { createdAt: 'desc' } });
  }

  createSegment(organizationId: string, data: any) {
    return this.prisma.marketingSegment.create({ data: { organizationId, name: data.name, description: data.description, type: data.type || 'MANUAL' }, include: { _count: { select: { members: true } } } });
  }

  async removeSegment(organizationId: string, id: string) {
    const item = await this.prisma.marketingSegment.findFirst({ where: { id, organizationId } });
    if (!item) throw new NotFoundException('Segmento no encontrado');
    return this.prisma.marketingSegment.delete({ where: { id } });
  }

  campaigns(organizationId: string) {
    return this.prisma.marketingCampaign.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });
  }

  async getCampaign(organizationId: string, id: string) {
    const item = await this.prisma.marketingCampaign.findFirst({ where: { id, organizationId } });
    if (!item) throw new NotFoundException('Campaña no encontrada');
    return item;
  }

  createCampaign(organizationId: string, data: any) {
    return this.prisma.marketingCampaign.create({ data: { id: randomUUID(), organizationId, name: String(data.name || 'Nueva campaña').trim(), subject: data.subject || '', segmentIds: Array.isArray(data.segmentIds) ? data.segmentIds : [], settings: data.settings || {} } });
  }

  async updateCampaign(organizationId: string, id: string, data: any) {
    await this.getCampaign(organizationId, id);
    return this.prisma.marketingCampaign.update({ where: { id }, data: { name: data.name === undefined ? undefined : String(data.name).trim(), subject: data.subject, segmentIds: Array.isArray(data.segmentIds) ? data.segmentIds : undefined, status: data.status, scheduledAt: data.scheduledAt === undefined ? undefined : (data.scheduledAt ? new Date(data.scheduledAt) : null), settings: data.settings } });
  }

  async removeCampaign(organizationId: string, id: string) {
    await this.getCampaign(organizationId, id);
    // Las copias son privadas de la campaña: al eliminarla no deben quedar
    // huérfanas ni aparecer como plantillas generales.
    await this.prisma.$transaction([
      this.prisma.emailTemplate.deleteMany({ where: { organizationId, tags: { has: `campaign:${id}` } } }),
      this.prisma.marketingCampaign.delete({ where: { id } }),
    ]);
    return { id, deleted: true };
  }

  /** Convierte inscripciones y participantes existentes en audiencias reutilizables por evento y edición. */
  private async syncEventAudiences(organizationId: string) {
    const audiences = new Map<string, { name: string; description: string; eventId: string; editionId?: string; emails: Set<string> }>();
    const add = (event: { id: string; eventName: string }, edition: { id: string; name: string } | null, rawEmail?: string | null) => {
      const email = String(rawEmail || '').trim().toLowerCase();
      if (!email) return;
      const key = `${event.id}:${edition?.id || 'global'}`;
      const current = audiences.get(key) || { name: edition ? `Inscritos · ${event.eventName} · ${edition.name}` : `Inscritos · ${event.eventName}`, description: edition ? `Personas inscritas en la edición ${edition.name}.` : `Personas inscritas en ${event.eventName}.`, eventId: event.id, editionId: edition?.id, emails: new Set<string>() };
      current.emails.add(email);
      audiences.set(key, current);
    };

    const [submissions, participants] = await Promise.all([
      this.prisma.registrationSubmission.findMany({ where: { email: { not: null }, form: { mainEvent: { organizationId } } }, include: { form: { include: { mainEvent: { select: { id: true, eventName: true } } } } } }),
      this.prisma.eventParticipant.findMany({ where: { edition: { mainEvent: { organizationId } } }, include: { edition: { include: { mainEvent: { select: { id: true, eventName: true } } } }, profile: { include: { authUser: { select: { email: true } } } } } }),
    ]);
    const editionIds = [...new Set(submissions.map((item) => item.editionId || item.form.editionId || item.form.defaultEditionId).filter(Boolean))] as string[];
    const editions = editionIds.length ? await this.prisma.edition.findMany({ where: { id: { in: editionIds } }, select: { id: true, name: true } }) : [];
    const editionMap = new Map(editions.map((item) => [item.id, item]));
    for (const item of submissions) add(item.form.mainEvent, editionMap.get(item.editionId || item.form.editionId || item.form.defaultEditionId || '') || null, item.email);
    for (const item of participants) {
      const alternatives = Array.isArray(item.profile.additionalEmails) ? item.profile.additionalEmails : [];
      add(item.edition.mainEvent, { id: item.edition.id, name: item.edition.name }, item.profile.authUser?.email || alternatives.find((email: unknown) => typeof email === 'string'));
    }

    for (const audience of audiences.values()) {
      const segment = await this.prisma.marketingSegment.upsert({ where: { organizationId_name: { organizationId, name: audience.name } }, update: { description: audience.description, type: 'EVENT_EDITION', rules: { eventId: audience.eventId, editionId: audience.editionId || null } }, create: { organizationId, name: audience.name, description: audience.description, type: 'EVENT_EDITION', rules: { eventId: audience.eventId, editionId: audience.editionId || null } } });
      for (const emailFallback of audience.emails) {
        const contact = await this.prisma.marketingContact.upsert({ where: { organizationId_emailFallback: { organizationId, emailFallback } }, update: { source: 'EVENT_REGISTRATION' }, create: { organizationId, emailFallback, consentStatus: 'SUBSCRIBED', consentedAt: new Date(), source: 'EVENT_REGISTRATION' } });
        await this.prisma.marketingSegmentMember.upsert({ where: { segmentId_contactId: { segmentId: segment.id, contactId: contact.id } }, update: {}, create: { segmentId: segment.id, contactId: contact.id } });
      }
    }
  }
}
