import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { blocksToHtml, interpolate } from './email-renderer.js';

@Injectable()
export class AutomationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomationService.name);
  private dispatcher?: NodeJS.Timeout;
  constructor(private readonly prisma: PrismaService, private readonly mail: MailService) {}

  onModuleInit() {
    this.dispatcher = setInterval(() => void this.dispatchDue().catch((error) => this.logger.error('No se pudo procesar la cola de marketing', error)), 60_000);
  }
  onModuleDestroy() { if (this.dispatcher) clearInterval(this.dispatcher); }

  list(organizationId: string) {
    return this.prisma.marketingAutomation.findMany({ where: { organizationId }, include: { steps: { orderBy: { position: 'asc' }, include: { template: { select: { id: true, name: true, subject: true, status: true } } } }, event: { select: { id: true, eventName: true, startDate: true } }, registrationForm: { select: { id: true, title: true, slug: true } }, _count: { select: { steps: true, enrollments: true } } }, orderBy: { updatedAt: 'desc' } });
  }

  async create(organizationId: string, data: any) {
    if (data.eventId) await this.assertEvent(organizationId, data.eventId);
    const form = data.registrationFormId ? await this.assertForm(organizationId, data.registrationFormId) : null;
    if (form && data.eventId && form.mainEventId !== data.eventId) throw new BadRequestException('El formulario no pertenece al evento seleccionado');
    await this.assertTemplates(organizationId, data.steps);
    return this.prisma.marketingAutomation.create({ data: { organizationId, eventId: data.eventId || form?.mainEventId || null, registrationFormId: data.registrationFormId || null, trigger: data.trigger || 'REGISTRATION_SUBMITTED', name: data.name, status: data.status || 'DRAFT', settings: data.settings || null, steps: { create: this.steps(data.steps) } }, include: { steps: { orderBy: { position: 'asc' }, include: { template: true } }, event: true, registrationForm: true } });
  }

  async update(id: string, data: any) {
    const current = await this.prisma.marketingAutomation.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Automatización no encontrada');
    if (data.eventId) await this.assertEvent(current.organizationId, data.eventId);
    const form = data.registrationFormId ? await this.assertForm(current.organizationId, data.registrationFormId) : null;
    if (form && data.eventId && form.mainEventId !== data.eventId) throw new BadRequestException('El formulario no pertenece al evento seleccionado');
    if (Array.isArray(data.steps)) await this.assertTemplates(current.organizationId, data.steps);
    return this.prisma.$transaction(async (tx) => {
      if (Array.isArray(data.steps)) await tx.marketingAutomationStep.deleteMany({ where: { automationId: id } });
      return tx.marketingAutomation.update({ where: { id }, data: { name: data.name, status: data.status, eventId: data.eventId === undefined ? undefined : (data.eventId || form?.mainEventId || null), registrationFormId: data.registrationFormId === undefined ? undefined : (data.registrationFormId || null), trigger: data.trigger, settings: data.settings, ...(Array.isArray(data.steps) ? { steps: { create: this.steps(data.steps) } } : {}) }, include: { steps: { orderBy: { position: 'asc' }, include: { template: true } }, registrationForm: true } });
    });
  }

  /** Configura la bienvenida de un formulario sin duplicar la plantilla. */
  async setWelcomeTemplate(formId: string, templateId?: string | null) {
    const form = await this.prisma.registrationForm.findUnique({ where: { id: formId }, include: { mainEvent: { select: { organizationId: true } } } });
    if (!form?.mainEvent.organizationId) throw new NotFoundException('Formulario o institución no encontrados');
    const organizationId = form.mainEvent.organizationId;
    const trigger = 'REGISTRATION_SUBMITTED';
    if (!templateId) {
      const existing = await this.prisma.marketingAutomation.findUnique({ where: { registrationFormId_trigger: { registrationFormId: form.id, trigger } } });
      if (existing) await this.prisma.marketingAutomation.update({ where: { id: existing.id }, data: { status: 'ARCHIVED' } });
      return { templateId: null, automationId: existing?.id || null, status: 'ARCHIVED' };
    }
    const template = await this.prisma.emailTemplate.findFirst({ where: { id: templateId, organizationId, status: { not: 'ARCHIVED' } }, select: { id: true, name: true, status: true } });
    if (!template) throw new BadRequestException('La plantilla debe pertenecer a la institución y no puede estar archivada');
    // Elegirla explícitamente para una comunicación transaccional autoriza su activación.
    if (template.status !== 'ACTIVE') await this.prisma.emailTemplate.update({ where: { id: template.id }, data: { status: 'ACTIVE' } });
    const existing = await this.prisma.marketingAutomation.findUnique({ where: { registrationFormId_trigger: { registrationFormId: form.id, trigger } } });
    const data = { organizationId, eventId: form.mainEventId, registrationFormId: form.id, trigger, name: `Bienvenida · ${form.title}`, status: 'ACTIVE' as const };
    const automation = existing
      ? await this.prisma.$transaction(async (tx) => { await tx.marketingAutomationStep.deleteMany({ where: { automationId: existing.id } }); return tx.marketingAutomation.update({ where: { id: existing.id }, data: { ...data, steps: { create: this.steps([{ timing: 'IMMEDIATE', templateId: template.id }]) } }, include: { steps: { include: { template: true } } } }); })
      : await this.prisma.marketingAutomation.create({ data: { ...data, steps: { create: this.steps([{ timing: 'IMMEDIATE', templateId: template.id }]) } }, include: { steps: { include: { template: true } } } });
    return { templateId: template.id, automationId: automation.id, status: automation.status };
  }

  /** Enrola una inscripción sólo en automatizaciones activas de su evento. */
  async enrollRegistration(input: { eventId: string; registrationFormId?: string; submissionId: string; email?: string | null; firstName?: string | null; lastName?: string | null; registeredAt?: Date }) {
    const email = String(input.email || '').trim().toLowerCase();
    if (!email) return { enrolled: 0, reason: 'La inscripción no tiene correo' };
    const event = await this.prisma.mainEvent.findUnique({ where: { id: input.eventId }, select: { id: true, organizationId: true, eventName: true, startDate: true, venueAddress: true } });
    if (!event?.organizationId) return { enrolled: 0, reason: 'El evento no tiene institución' };
    const contact = await this.prisma.marketingContact.upsert({ where: { organizationId_emailFallback: { organizationId: event.organizationId, emailFallback: email } }, update: { source: 'EVENT_REGISTRATION' }, create: { organizationId: event.organizationId, emailFallback: email, consentStatus: 'SUBSCRIBED', consentedAt: new Date(), source: 'EVENT_REGISTRATION' } });
    const automations = await this.prisma.marketingAutomation.findMany({ where: { organizationId: event.organizationId, eventId: event.id, status: 'ACTIVE', OR: [{ registrationFormId: null }, ...(input.registrationFormId ? [{ registrationFormId: input.registrationFormId }] : [])] }, include: { steps: { orderBy: { position: 'asc' } } } });
    let enrolled = 0;
    for (const automation of automations) {
      await this.prisma.marketingEventEnrollment.upsert({ where: { automationId_contactId: { automationId: automation.id, contactId: contact.id } }, update: { submissionId: input.submissionId, firstName: input.firstName || null, registeredAt: input.registeredAt || new Date(), attendanceStatus: 'REGISTERED' }, create: { organizationId: event.organizationId, eventId: event.id, automationId: automation.id, contactId: contact.id, submissionId: input.submissionId, firstName: input.firstName || null, registeredAt: input.registeredAt || new Date() } });
      await this.queueContact(automation, contact, event, input.firstName || null, input.registeredAt || new Date(), { last_name: input.lastName || '', registration_code: input.submissionId });
      enrolled++;
    }
    return { enrolled };
  }

  /** La cola ahora usa exclusivamente inscritos del evento. */
  async queue(id: string) {
    const automation = await this.prisma.marketingAutomation.findUnique({ where: { id }, include: { event: true, steps: { orderBy: { position: 'asc' } }, enrollments: { include: { contact: true } } } });
    if (!automation) throw new NotFoundException('Automatización no encontrada');
    if (!automation.event) throw new BadRequestException('La automatización requiere un evento');
    let queued = 0;
    for (const enrollment of automation.enrollments) {
      if (enrollment.contact.consentStatus !== 'SUBSCRIBED' || !enrollment.contact.emailFallback || enrollment.purchaseStatus === 'PURCHASED' || enrollment.benefitUsedAt) continue;
      queued += await this.queueContact(automation, enrollment.contact, automation.event, enrollment.firstName, enrollment.registeredAt);
    }
    return { queued };
  }

  async dispatchDue(limit = 100) {
    const jobs = await this.prisma.emailDelivery.findMany({ where: { status: 'QUEUED', scheduledAt: { lte: new Date() } }, take: limit, orderBy: { scheduledAt: 'asc' } });
    let sent = 0; let failed = 0; let skipped = 0;
    for (const job of jobs) {
      const step = await this.prisma.marketingAutomationStep.findUnique({ where: { id: job.stepId } });
      const enrollment = job.contactId ? await this.prisma.marketingEventEnrollment.findUnique({ where: { automationId_contactId: { automationId: job.automationId, contactId: job.contactId } } }) : null;
      if (!step || enrollment?.purchaseStatus === 'PURCHASED' || enrollment?.benefitUsedAt) { await this.prisma.emailDelivery.update({ where: { id: job.id }, data: { status: 'SKIPPED', error: 'No cumple las condiciones de envío' } }); skipped++; continue; }
      const template = step.templateId ? await this.prisma.emailTemplate.findUnique({ where: { id: step.templateId } }) : null;
      const context = (job.context as Record<string, unknown> | null) || {};
      const subject = interpolate(step.subject || template?.subject || 'Información importante', context);
      const html = step.htmlContent ? interpolate(step.htmlContent, context) : template?.htmlContent ? interpolate(template.htmlContent, context) : blocksToHtml(template?.content, context) || '<p>Gracias por registrarte.</p>';
      const result = await this.mail.send({ to: job.recipientEmail, subject, html, organizationId: job.organizationId });
      await this.prisma.emailDelivery.update({ where: { id: job.id }, data: result.sent ? { status: 'SENT', sentAt: new Date(), providerMessageId: result.messageId } : { status: 'FAILED', error: result.reason } });
      result.sent ? sent++ : failed++;
    }
    return { processed: jobs.length, sent, failed, skipped };
  }

  async analytics(organizationId: string) { const group = await this.prisma.emailDelivery.groupBy({ by: ['status'], where: { organizationId }, _count: { _all: true } }); return Object.fromEntries(group.map((x) => [x.status, x._count._all])); }

  private async queueContact(automation: any, contact: any, event: any, firstName: string | null, registeredAt: Date, extraContext: Record<string, unknown> = {}) {
    if (contact.consentStatus !== 'SUBSCRIBED' || !contact.emailFallback) return 0;
    const settings = (automation.settings as Record<string, unknown> | null) || {};
    const context = { first_name: firstName || 'amigo', email: contact.emailFallback, event_name: event.eventName, event_start_date: event.startDate.toISOString(), event_location: event.venueAddress || '', unsubscribe_url: '', ...settings, ...extraContext };
    let queued = 0;
    for (const step of automation.steps) {
      const date = this.when(step, event.startDate, registeredAt, new Date());
      if (!date) continue;
      await this.prisma.emailDelivery.upsert({ where: { stepId_recipientEmail: { stepId: step.id, recipientEmail: contact.emailFallback } }, update: { scheduledAt: date, status: 'QUEUED', context: context as any }, create: { organizationId: automation.organizationId, automationId: automation.id, stepId: step.id, contactId: contact.id, recipientEmail: contact.emailFallback, recipientName: firstName, scheduledAt: date, context: context as any } });
      queued++;
    }
    return queued;
  }

  private when(step: any, eventStart: Date, registeredAt: Date, now: Date) {
    if (step.timing === 'IMMEDIATE') return registeredAt > now ? registeredAt : now;
    const date = step.timing === 'BEFORE_EVENT' ? new Date(eventStart.getTime() - step.offsetHours * 3600000) : step.timing === 'AFTER_EVENT' ? new Date(eventStart.getTime() + step.offsetHours * 3600000) : new Date(registeredAt.getTime() + step.offsetHours * 3600000);
    return date <= now ? null : date;
  }
  private steps(steps: any[] = []) { return steps.map((step, index) => ({ position: index + 1, timing: step.timing, offsetHours: Number(step.offsetHours || 0), templateId: step.templateId || null, subject: step.subject || null, htmlContent: step.htmlContent || null, conditions: step.conditions || null })); }
  private async assertEvent(organizationId: string, eventId: string) { const event = await this.prisma.mainEvent.findFirst({ where: { id: eventId, organizationId } }); if (!event) throw new BadRequestException('El evento no pertenece a la institución'); }
  private async assertForm(organizationId: string, formId: string) { const form = await this.prisma.registrationForm.findFirst({ where: { id: formId, mainEvent: { organizationId } } }); if (!form) throw new BadRequestException('El formulario no pertenece a la institución'); return form; }
  private async assertTemplates(organizationId: string, steps: any[] | undefined) { const ids = [...new Set((steps || []).map((step) => step.templateId).filter(Boolean))]; if (!ids.length) return; const count = await this.prisma.emailTemplate.count({ where: { id: { in: ids }, organizationId } }); if (count !== ids.length) throw new BadRequestException('Una o más plantillas no pertenecen a la institución'); }
}
