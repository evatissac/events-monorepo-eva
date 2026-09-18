import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { parsePeruDateTime } from '../../common/peru-time.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AutomationService } from '../marketing/automation.service.js';
import { MailService } from '../mail/mail.service.js';

@Injectable()
export class RegistrationFormsService {
  constructor(private readonly prisma: PrismaService, private readonly automations: AutomationService, private readonly mail: MailService) {}

  list(eventId: string) {
    return this.prisma.registrationForm.findMany({
      where: { mainEventId: eventId },
      include: {
        fields: { orderBy: { position: 'asc' } },
        edition: { select: { id: true, name: true } },
        automations: { where: { trigger: 'REGISTRATION_SUBMITTED', status: { not: 'ARCHIVED' } }, include: { steps: { orderBy: { position: 'asc' }, include: { template: { select: { id: true, name: true, status: true } } } } } },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const form = await this.prisma.registrationForm.findUnique({
      where: { id },
      include: {
        fields: { orderBy: { position: 'asc' } },
        edition: { select: { id: true, name: true } },
        mainEvent: { select: { id: true, eventName: true } },
        automations: { where: { trigger: 'REGISTRATION_SUBMITTED', status: { not: 'ARCHIVED' } }, include: { steps: { orderBy: { position: 'asc' }, include: { template: { select: { id: true, name: true, status: true } } } } } },
        _count: { select: { submissions: true } },
      },
    });
    if (!form) throw new NotFoundException('Formulario no encontrado');
    return form;
  }

  listSubmissions(eventId: string) {
    return this.prisma.registrationSubmission.findMany({
      where: { form: { mainEventId: eventId } },
      select: {
        id: true,
        email: true,
        answers: true,
        status: true,
        formId: true,
        participantId: true,
        editionId: true,
        submittedAt: true,
        form: { select: { mainEventId: true, editionId: true, title: true, purpose: true, fields: { select: { key: true, label: true, type: true } } } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async removeSubmission(id: string) {
    const submission = await this.prisma.registrationSubmission.findUnique({ where: { id }, select: { participantId: true } });
    if (!submission) throw new NotFoundException('Inscripción no encontrada');
    return this.prisma.$transaction(async (tx) => {
      if (submission.participantId) await tx.eventParticipant.delete({ where: { id: submission.participantId } });
      return tx.registrationSubmission.delete({ where: { id } });
    });
  }

  async create(eventId: string, data: any) {
    const purpose = data.purpose || 'PARTICIPANT';
    if (purpose === 'MAIN') {
      await this.ensureMainFormRoles(eventId);
      const mainForm = await this.prisma.registrationForm.findFirst({ where: { mainEventId: eventId, purpose: 'MAIN', status: { not: 'ARCHIVED' } } });
      if (mainForm) throw new BadRequestException('Este evento ya cuenta con un formulario de registro principal');
    }
    if (data.editionId) {
      const edition = await this.prisma.edition.findFirst({
        where: { id: data.editionId, mainEventId: eventId },
      });
      if (!edition) throw new BadRequestException('La edición seleccionada no pertenece al evento');
    }

    const fields = purpose === 'MAIN' ? await this.mainRegistrationFields(eventId, data.title) : (data.fields || []);
    return this.prisma.registrationForm.create({
      data: {
        mainEventId: eventId,
        title: data.title,
        description: data.description || null,
        slug: data.slug,
        editionId: data.editionId || null,
        status: data.status || 'DRAFT',
        opensAt: data.opensAt ? parsePeruDateTime(data.opensAt) : null,
        closesAt: data.closesAt ? parsePeruDateTime(data.closesAt) : null,
        maxSubmissions: data.maxSubmissions || null,
        approvalMode: data.approvalMode || 'MANUAL',
        purpose,
        allowEditionSelection: !!data.allowEditionSelection,
        defaultEditionId: data.defaultEditionId || null,
        thankYouMessage: data.thankYouMessage || null,
        thankYouRedirectUrl: data.thankYouRedirectUrl || null,
        fields: {
          create: fields.map((field: any, position: number) => ({
            key: field.key,
            label: field.label,
            type: field.type,
            required: !!field.required,
            options: field.options || null,
            validation: field.validation || null,
            position,
          })),
        },
      },
      include: { fields: true },
    });
  }

  async update(id: string, data: any) {
    const clean: any = { ...data };
    const fields = clean.fields;
    delete clean.fields;
    if (clean.purpose === 'MAIN') {
      const form = await this.prisma.registrationForm.findUnique({ where: { id }, select: { mainEventId: true } });
      if (form) await this.ensureMainFormRoles(form.mainEventId);
      const mainForm = form && await this.prisma.registrationForm.findFirst({ where: { mainEventId: form.mainEventId, purpose: 'MAIN', status: { not: 'ARCHIVED' }, id: { not: id } } });
      if (mainForm) throw new BadRequestException('Este evento ya cuenta con un formulario de registro principal');
    }
    if (clean.opensAt !== undefined && clean.opensAt !== null) clean.opensAt = parsePeruDateTime(clean.opensAt);
    if (clean.closesAt !== undefined && clean.closesAt !== null) clean.closesAt = parsePeruDateTime(clean.closesAt);
    if (clean.opensAt instanceof Date && Number.isNaN(clean.opensAt.getTime())) throw new BadRequestException('La fecha de apertura no es válida');
    if (clean.closesAt instanceof Date && Number.isNaN(clean.closesAt.getTime())) throw new BadRequestException('La fecha de cierre no es válida');
    if (clean.opensAt instanceof Date && clean.closesAt instanceof Date && clean.opensAt >= clean.closesAt) {
      throw new BadRequestException('La fecha de cierre debe ser posterior a la fecha de apertura');
    }

    return this.prisma.$transaction(async (tx) => {
      if (Array.isArray(fields)) {
        await tx.registrationFormField.deleteMany({ where: { formId: id } });
        clean.fields = {
          create: fields.map((field: any, position: number) => ({
            key: field.key,
            label: field.label,
            type: field.type,
            required: !!field.required,
            options: field.options || null,
            validation: field.validation || null,
            position,
          })),
        };
      }
      return tx.registrationForm.update({
        where: { id },
        data: clean,
        include: {
          fields: { orderBy: { position: 'asc' } },
          edition: { select: { id: true, name: true } },
          _count: { select: { submissions: true } },
        },
      });
    });
  }

  async remove(id: string) {
    const uses = await this.prisma.registrationSubmission.count({ where: { formId: id } });
    if (uses) throw new BadRequestException('No se puede eliminar un formulario con envíos; archívalo en su lugar.');
    return this.prisma.registrationForm.delete({ where: { id } });
  }

  async publicForm(slug: string) {
    const form = await this.prisma.registrationForm.findUnique({
      where: { slug },
      include: {
        fields: { orderBy: { position: 'asc' } },
        mainEvent: { select: { id: true, eventName: true, startDate: true, organizationId: true, whatsappCommunityUrl: true, organization: { select: { name: true, logoUrl: true } } } },
        edition: { select: { name: true, startDate: true } },
      },
    });
    if (!form) throw new NotFoundException('Formulario no encontrado');
    if (form.status !== 'PUBLISHED') throw new BadRequestException('Este formulario no está disponible');
    const now = new Date();
    if ((form.opensAt && now < form.opensAt) || (form.closesAt && now > form.closesAt)) {
      throw new BadRequestException('Este formulario no está disponible en este momento');
    }
    return form;
  }

  async emailAvailability(slug: string, rawEmail: string) {
    const form = await this.publicForm(slug);
    const email = rawEmail.trim().toLowerCase();
    if (!email) return { available: false };
    const existing = await this.prisma.registrationSubmission.findUnique({
      where: { formId_email: { formId: form.id, email } },
      select: { id: true },
    });
    return { available: !existing };
  }

  async submit(slug: string, answers: Record<string, unknown>, editionId?: string) {
    const form = await this.publicForm(slug);
    const count = await this.prisma.registrationSubmission.count({ where: { formId: form.id } });
    if (form.maxSubmissions && count >= form.maxSubmissions) {
      throw new BadRequestException('Se alcanzó el límite de registros');
    }
    for (const field of form.fields) {
      if (field.required && (answers[field.key] === undefined || answers[field.key] === '')) {
        throw new BadRequestException(`El campo ${field.label} es obligatorio`);
      }
    }
    const emailField = form.fields.find((field: any) => field.type === 'email' || field.key === 'email');
    const emailValue = emailField ? answers[emailField.key] : answers.email;
    const email = typeof emailValue === 'string' ? emailValue.trim().toLowerCase() : null;
    if (email) {
      const existing = await this.prisma.registrationSubmission.findUnique({
        where: { formId_email: { formId: form.id, email } },
        select: { id: true },
      });
      if (existing) throw new BadRequestException('Este correo ya está registrado en este formulario');
    }
    let submission;
    try {
      submission = await this.prisma.registrationSubmission.create({
        data: {
          formId: form.id,
          editionId: editionId || form.editionId || form.defaultEditionId || null,
          answers: answers as Prisma.InputJsonValue,
          email,
          status: form.approvalMode === 'AUTOMATIC' ? 'APPROVED' : 'PENDING',
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Este correo ya está registrado en este formulario');
      }
      throw error;
    }
    if (form.purpose === 'MAIN') {
      const registration = await this.registerMainParticipant(form, submission.id, answers, editionId);
      await this.prisma.registrationSubmission.update({ where: { id: submission.id }, data: registration });
    }
    const firstName = [answers.first_name, answers.firstName, answers.name, answers.nombres, answers.nombres_completos].find((value) => typeof value === 'string') as string | undefined;
    const lastName = [answers.last_name, answers.lastName, answers.apellidos].find((value) => typeof value === 'string') as string | undefined;
    await this.automations.enrollRegistration({ eventId: form.mainEventId, registrationFormId: form.id, editionId: editionId || form.editionId || form.defaultEditionId || undefined, submissionId: submission.id, email, firstName, lastName, registeredAt: submission.submittedAt });
    const hasWelcomeTemplate = await this.prisma.marketingAutomation.count({ where: { registrationFormId: form.id, trigger: 'REGISTRATION_SUBMITTED', status: 'ACTIVE', steps: { some: { templateId: { not: null } } } } });
    if (email && form.mainEvent.organizationId && !hasWelcomeTemplate) {
      const name = firstName || 'participante';
      const eventName = form.mainEvent.eventName;
      const scheduledAt = form.edition?.startDate || form.mainEvent.startDate;
      const eventDate = scheduledAt.toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Lima' });
      const isMedmind = form.mainEvent.organization?.name?.trim().toLowerCase() === 'medmind';
      const logo = isMedmind
        ? '<img src="https://medmind.com.pe/assets/brands/logo_medmind.svg" alt="MedMind" width="150" style="display:block;width:150px;height:auto;margin:0 auto;filter:brightness(0) invert(1)"/>'
        : form.mainEvent.organization?.logoUrl
          ? `<img src="${form.mainEvent.organization.logoUrl}" alt="" style="max-height:42px;margin-bottom:20px"/>`
          : '';
      const whatsapp = form.mainEvent.whatsappCommunityUrl ? `<p style="margin:26px 0;text-align:center"><a href="${form.mainEvent.whatsappCommunityUrl}" style="display:inline-block;background:#00a98f;color:#fff;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:700">QUIERO UNIRME A LA COMUNIDAD</a></p>` : '';
      void this.mail.send({ organizationId: form.mainEvent.organizationId, to: email, subject: `Inscripción confirmada · ${eventName}`, html: `<div style="font-family:Arial,sans-serif;background:#f3f5f5;padding:32px 12px"><div style="max-width:750px;margin:auto;background:#fff"><div style="background:#16b8aa;padding:26px;text-align:center">${logo || '<span style="color:#fff;font-size:38px;font-weight:700">MedMind</span>'}</div><div style="padding:46px 52px;color:#4b4b4b;font-size:18px;line-height:1.72"><h1 style="font-size:26px;margin:0 0 24px;color:#333">¡Hola, ${name} 👋!</h1><p style="margin:0 0 22px">Tu registro para <strong>${eventName}</strong> está confirmado.</p><div style="margin:30px 0;padding:17px;background:#f2fbf9;border-radius:8px"><strong>${eventName}</strong><br/><span style="color:#65727a">${eventDate} (hora de Perú)</span></div>${whatsapp}<p style="margin:28px 0 0">Nos vemos pronto.</p><p style="margin:8px 0 0"><strong>Equipo ${form.mainEvent.organization?.name || 'MedMind'}</strong></p></div></div></div>` });
    }
    return { ...submission, mainEventId: form.mainEventId, thankYouMessage: form.thankYouMessage, thankYouRedirectUrl: form.thankYouRedirectUrl };
  }

  async makeMain(id: string) {
    const form = await this.prisma.registrationForm.findUnique({ where: { id } });
    if (!form) throw new NotFoundException('Formulario no encontrado');
    await this.ensureMainFormRoles(form.mainEventId);
    const existing = await this.prisma.registrationForm.findFirst({ where: { mainEventId: form.mainEventId, purpose: 'MAIN', status: { not: 'ARCHIVED' }, id: { not: id } } });
    if (existing) throw new BadRequestException('Ya existe otro formulario principal activo para este evento');
    const fields = await this.mainRegistrationFields(form.mainEventId, form.title);
    return this.prisma.$transaction(async (tx) => {
      await tx.registrationFormField.deleteMany({ where: { formId: id } });
      return tx.registrationForm.update({ where: { id }, data: { purpose: 'MAIN', fields: { create: fields.map((field, position) => ({ ...field, options: field.options || null, position })) } }, include: { fields: { orderBy: { position: 'asc' } } } });
    });
  }

  setWelcomeTemplate(formId: string, templateId?: string | null) {
    return this.automations.setWelcomeTemplate(formId, templateId);
  }

  private async mainRegistrationFields(eventId: string, title: string) {
    return [
      { key: 'header_title', label: title, type: 'header', required: false, options: { text: title } },
      { key: 'first_name', label: 'Nombres', type: 'text', required: true, options: { helpText: 'Nombres completos del participante.' } },
      { key: 'last_name', label: 'Apellidos', type: 'text', required: true, options: { helpText: 'Apellidos completos del participante.' } },
      { key: 'email', label: 'Correo Electrónico', type: 'email', required: true, options: { helpText: 'Dirección de correo electrónico única del participante.' } },
      { key: 'document_type', label: 'Identificación', type: 'select', required: false, options: ['Ninguno', 'DNI', 'RUC', 'Otros'] },
      { key: 'document_number', label: 'Número de identificación', type: 'text', required: false, options: { helpText: 'Tipo y número del documento nacional de identidad.' } },
    ];
  }

  private async ensureMainFormRoles(eventId: string) {
    const roles = await this.prisma.participantRole.findMany({ where: { mainEventId: eventId }, select: { name: true } });
    if (!roles.some((role) => /ponente|speaker/i.test(role.name))) {
      throw new BadRequestException('Antes de crear el registro principal debes crear el rol “Ponente” en Roles de participantes');
    }
  }

  private async registerMainParticipant(form: any, submissionId: string, answers: Record<string, unknown>, requestedEditionId?: string) {
    const emailField = form.fields?.find((field: any) => field.type === 'email' || field.key === 'email');
    const emailValue = emailField ? answers[emailField.key] : answers.email;
    const email = typeof emailValue === 'string' ? emailValue.trim().toLowerCase() : '';
    if (!email) throw new BadRequestException('El correo electrónico es obligatorio');
    const fullName = String(answers.full_name || answers.name || '').trim();
    const firstName = String(answers.first_name || answers.firstName || fullName.split(/\s+/)[0] || 'Participante').trim();
    const lastNameParts = String(answers.last_name || answers.lastName || fullName.split(/\s+/).slice(1).join(' ')).trim().split(/\s+/).filter(Boolean);
    const selectedEdition = requestedEditionId || form.editionId;
    return this.prisma.$transaction(async (tx) => {
      let edition = selectedEdition ? await tx.edition.findFirst({ where: { id: selectedEdition, mainEventId: form.mainEventId } }) : await tx.edition.findFirst({ where: { mainEventId: form.mainEventId }, orderBy: { createdAt: 'asc' } });
      if (!edition) edition = await tx.edition.create({ data: { mainEventId: form.mainEventId, name: 'Edición Principal' } });
      const ticketType = String(answers.ticket_type || 'Participante');
      let role = await tx.participantRole.findFirst({ where: { mainEventId: form.mainEventId, name: ticketType } });
      if (!role) role = await tx.participantRole.create({ data: { mainEventId: form.mainEventId, name: ticketType } });
      const profile = await tx.profile.create({ data: { organizationId: form.mainEvent.organizationId, firstName, lastName: lastNameParts.join(' '), identityDocumentType: String(answers.document_type || '') || null, identityDocumentNumber: String(answers.document_number || '') || null, additionalEmails: [email] } });
      const participant = await tx.eventParticipant.create({ data: { editionId: edition.id, profileId: profile.id, roleId: role.id } });
      return { participantId: participant.id, profileId: profile.id };
    });
  }
}
