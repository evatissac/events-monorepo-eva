import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { AutomationService } from '../marketing/automation.service.js';

@Injectable()
export class RegistrationFormsService {
  constructor(private readonly prisma: PrismaService, private readonly automations: AutomationService) {}

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
        form: { select: { mainEventId: true, editionId: true, title: true, purpose: true } },
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
        opensAt: data.opensAt ? new Date(data.opensAt) : null,
        closesAt: data.closesAt ? new Date(data.closesAt) : null,
        maxSubmissions: data.maxSubmissions || null,
        approvalMode: data.approvalMode || 'MANUAL',
        purpose,
        allowEditionSelection: !!data.allowEditionSelection,
        defaultEditionId: data.defaultEditionId || null,
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
    if (clean.opensAt) clean.opensAt = new Date(clean.opensAt);
    if (clean.closesAt) clean.closesAt = new Date(clean.closesAt);

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
        mainEvent: { select: { eventName: true } },
        edition: { select: { name: true } },
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
    const email = typeof answers.email === 'string' ? answers.email.trim().toLowerCase() : null;
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
      const participantId = await this.registerMainParticipant(form, submission.id, answers, editionId);
      await this.prisma.registrationSubmission.update({ where: { id: submission.id }, data: { participantId } });
    }
    const firstName = [answers.first_name, answers.firstName, answers.name, answers.nombres].find((value) => typeof value === 'string') as string | undefined;
    const lastName = [answers.last_name, answers.lastName, answers.apellidos].find((value) => typeof value === 'string') as string | undefined;
    await this.automations.enrollRegistration({ eventId: form.mainEventId, registrationFormId: form.id, submissionId: submission.id, email, firstName, lastName, registeredAt: submission.submittedAt });
    return submission;
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
    const email = typeof answers.email === 'string' ? answers.email.trim().toLowerCase() : '';
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
      const profile = await tx.profile.create({ data: { firstName, lastName: lastNameParts.join(' '), identityDocumentType: String(answers.document_type || '') || null, identityDocumentNumber: String(answers.document_number || '') || null, additionalEmails: [email] } });
      const participant = await tx.eventParticipant.create({ data: { editionId: edition.id, profileId: profile.id, roleId: role.id } });
      return participant.id;
    });
  }
}
