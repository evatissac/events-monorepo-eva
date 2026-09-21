import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { blocksToHtml, interpolate } from '../marketing/email-renderer.js';

const LEGACY_STARTER_TEMPLATES = [
  {
    id: 'starter-default',
    name: 'Plantilla predeterminada',
    category: 'BASIC',
    subject: 'Novedades y actualización importante',
    previewText: 'Descubre todo lo nuevo que preparamos para ti',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=60',
    content: [
      {
        id: 'blk-logo-1',
        type: 'logo',
        label: 'Logotipo',
        options: {
          imageUrl: '',
          alt: 'Logo',
          align: 'center',
          width: 140,
        },
      },
      {
        id: 'blk-head-1',
        type: 'heading',
        label: 'Este es el titular.',
        options: {
          text: 'Este es el titular.',
          level: 1,
          align: 'center',
          color: '#111827',
          fontSize: 28,
        },
      },
      {
        id: 'blk-img-1',
        type: 'image',
        label: 'Imagen Principal',
        options: {
          imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80',
          alt: 'Banner',
          align: 'center',
        },
      },
      {
        id: 'blk-txt-1',
        type: 'text',
        label: 'Texto descriptivo',
        options: {
          text: 'Te invitamos a ser parte de esta experiencia única. Aquí encontrarás toda la información detallada para aprovechar al máximo este evento.',
          align: 'center',
          color: '#4b5563',
          fontSize: 14,
          lineHeight: 1.6,
        },
      },
      {
        id: 'blk-btn-1',
        type: 'button',
        label: 'Confirmar Asistencia',
        options: {
          text: 'Confirmar Asistencia',
          url: 'https://ejemplo.com',
          align: 'center',
          bgColor: '#009245',
          textColor: '#ffffff',
          borderRadius: 8,
        },
      },
      {
        id: 'blk-div-1',
        type: 'divider',
        label: 'Divisor',
        options: { color: '#e5e7eb', height: 1, marginY: 24 },
      },
      {
        id: 'blk-soc-1',
        type: 'social',
        label: 'Redes Sociales',
        options: {
          align: 'center',
          networks: [
            { name: 'facebook', url: 'https://facebook.com' },
            { name: 'instagram', url: 'https://instagram.com' },
            { name: 'linkedin', url: 'https://linkedin.com' },
            { name: 'web', url: 'https://ejemplo.com' },
          ],
        },
      },
    ],
  },
  {
    id: 'starter-product',
    name: 'Vender un producto o entrada',
    category: 'PRODUCT',
    subject: 'Equipamiento esencial para cada aventura',
    previewText: 'Asegura tu pase exclusivo antes de que se agote',
    thumbnailUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=60',
    content: [
      {
        id: 'blk-logo-p',
        type: 'logo',
        label: 'Logotipo',
        options: { imageUrl: '', alt: 'Logo', align: 'center', width: 130 },
      },
      {
        id: 'blk-head-p',
        type: 'heading',
        label: 'Equipamiento esencial para cada aventura',
        options: {
          text: 'Equipamiento esencial para cada aventura',
          level: 1,
          align: 'center',
          color: '#0f172a',
          fontSize: 26,
        },
      },
      {
        id: 'blk-txt-p1',
        type: 'text',
        label: 'Subtítulo',
        options: {
          text: 'Tanto si buscas momentos de serenidad como si te gustan las excursiones intensas, descubre nuestros nuevos pases y beneficios.',
          align: 'center',
          color: '#64748b',
          fontSize: 14,
        },
      },
      {
        id: 'blk-prod-1',
        type: 'product',
        label: 'Pase General Early Bird',
        options: {
          title: 'Entrada VIP - Acceso Total',
          price: 'S/ 150.00',
          imageUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&auto=format&fit=crop&q=80',
          description: 'Incluye acceso a todas las conferencias magistrales, talleres prácticos y certificado con código QR verificado.',
          buttonText: 'Comprar Entrada',
          buttonUrl: 'https://ejemplo.com/tickets',
        },
      },
    ],
  },
  {
    id: 'starter-story',
    name: 'Contar una historia / Newsletter',
    category: 'STORY',
    subject: 'Un mensaje especial para ti',
    previewText: 'Queremos compartir contigo los avances más recientes',
    thumbnailUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&auto=format&fit=crop&q=60',
    content: [
      {
        id: 'blk-logo-s',
        type: 'logo',
        label: 'Logotipo',
        options: { imageUrl: '', alt: 'Logo', align: 'left', width: 120 },
      },
      {
        id: 'blk-head-s',
        type: 'heading',
        label: 'Hola {{ contact.FIRSTNAME | default: "amigo" }},',
        options: {
          text: 'Hola {{ contact.FIRSTNAME | default: "amigo" }},',
          level: 2,
          align: 'left',
          color: '#1e293b',
          fontSize: 22,
        },
      },
      {
        id: 'blk-txt-s1',
        type: 'text',
        label: 'Cuerpo del mensaje',
        options: {
          text: '¡Un nuevo año significa nuevas oportunidades! Tanto si te has marcado grandes objetivos como si solo quieres perfeccionar tus habilidades, estamos listos para acompañarte en cada paso.',
          align: 'left',
          color: '#334155',
          fontSize: 14,
          lineHeight: 1.7,
        },
      },
      {
        id: 'blk-img-s',
        type: 'image',
        label: 'Imagen historia',
        options: {
          imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
          alt: 'Equipo',
          align: 'center',
        },
      },
      {
        id: 'blk-btn-s',
        type: 'button',
        label: 'Leer el artículo completo',
        options: {
          text: 'Leer el artículo completo',
          url: 'https://ejemplo.com/blog',
          align: 'center',
          bgColor: '#2563eb',
          textColor: '#ffffff',
          borderRadius: 6,
        },
      },
    ],
  },
];

/** Plantillas iniciales oficiales: estructura breve, monocroma y variables del catálogo público. */
export const STARTER_TEMPLATES = [
  {
    id: 'starter-registration', name: 'Confirmación de registro', category: 'BASIC',
    subject: 'Registro confirmado: {{ event_name }}',
    previewText: 'Tu inscripción fue registrada correctamente.',
    thumbnailUrl: null,
    content: [
      { id: 'header', type: 'logo', label: 'Cabecera institucional', options: { text: 'LOGOTIPO DE LA INSTITUCIÓN', imageUrl: '', alt: 'Logotipo institucional', align: 'center', width: 140, bgColor: '#171717', textColor: '#ffffff', paddingY: 16 } },
      { id: 'title', type: 'heading', label: 'Registro confirmado', options: { text: 'Tu registro está confirmado', level: 1, align: 'center', color: '#171717', fontSize: 26, fontWeight: 500 } },
      { id: 'content', type: 'dynamic', label: 'Detalle de registro', options: { text: 'Hola, {{ first_name }}.<br/><br/>Tu registro para <strong>{{ event_name }}</strong> fue confirmado.<br/>Fecha: {{ event_start_date }}<br/>Lugar: {{ event_location }}<br/>Código: <strong>{{ registration_code }}</strong>', align: 'center', color: '#404040', fontSize: 14, lineHeight: 1.65, fallback: 'Hola.' } },
      { id: 'footer-line', type: 'divider', label: 'Separador', options: { color: '#d4d4d4', height: 1, marginY: 24 } },
      { id: 'footer', type: 'text', label: 'Pie institucional', options: { text: '<a href="{{ unsubscribe_url }}">Cancelar suscripción</a>', align: 'center', color: '#525252', fontSize: 12, lineHeight: 1.5 } },
    ],
  },
  {
    id: 'starter-reminder', name: 'Recordatorio de evento', category: 'BASIC',
    subject: 'Recordatorio: {{ event_name }}',
    previewText: 'Revisa la fecha, ubicación y los datos de tu registro.',
    thumbnailUrl: null,
    content: [
      { id: 'header', type: 'logo', label: 'Cabecera institucional', options: { text: 'LOGOTIPO DE LA INSTITUCIÓN', imageUrl: '', alt: 'Logotipo institucional', align: 'center', width: 140, bgColor: '#171717', textColor: '#ffffff', paddingY: 16 } },
      { id: 'title', type: 'heading', label: 'Recordatorio', options: { text: 'Te esperamos en {{ event_name }}', level: 1, align: 'center', color: '#171717', fontSize: 26, fontWeight: 500 } },
      { id: 'content', type: 'text', label: 'Detalle del evento', options: { text: 'Hola, {{ first_name }}.<br/><br/>Te recordamos que el evento se realizará el {{ event_start_date }}.<br/>Ubicación: {{ event_location }}.', align: 'center', color: '#404040', fontSize: 14, lineHeight: 1.65 } },
      { id: 'cta', type: 'button', label: 'Comunidad del evento', options: { text: 'Ir a la comunidad', url: '{{ whatsapp_community_url }}', align: 'center', bgColor: '#171717', textColor: '#ffffff', borderRadius: 3 } },
      { id: 'footer', type: 'text', label: 'Pie institucional', options: { text: '<a href="{{ unsubscribe_url }}">Cancelar suscripción</a>', align: 'center', color: '#525252', fontSize: 12, lineHeight: 1.5 } },
    ],
  },
];

import { MailService } from '../mail/mail.service.js';

@Injectable()
export class EmailTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async list(organizationId: string, search?: string, category?: string) {
    const where: any = { organizationId };

    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { subject: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    const templates = await this.prisma.emailTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return templates;
  }

  async get(id: string) {
    // Check if requested starter template
    const starter = STARTER_TEMPLATES.find((s) => s.id === id);
    if (starter) {
      return {
        ...starter,
        status: 'ACTIVE',
        channel: 'EMAIL',
        senderName: 'IIAP',
        senderEmail: 'contacto@iiap.gob.pe',
      };
    }

    const template = await this.prisma.emailTemplate.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true, logoUrl: true } },
      },
    });

    if (!template) throw new NotFoundException('Plantilla de email no encontrada');
    return template;
  }

  getStarters() {
    return STARTER_TEMPLATES;
  }

  async create(organizationId: string, data: any) {
    let initialContent = data.content;
    let initialSubject = data.subject || 'Nuevo correo informativo';
    let initialPreview = data.previewText || '';
    let initialCategory = data.category || 'CUSTOM';

    // If copying from starter
    if (data.starterId) {
      const starter = STARTER_TEMPLATES.find((s) => s.id === data.starterId);
      if (starter) {
        initialContent = starter.content;
        initialSubject = starter.subject;
        initialPreview = starter.previewText;
        initialCategory = starter.category;
      }
    }

    if (!initialContent || (Array.isArray(initialContent) && initialContent.length === 0)) {
      // Default initial blocks
      initialContent = STARTER_TEMPLATES[0].content;
    }

    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true, emailSettings: true } });
    if (!organization) throw new NotFoundException('Organización no encontrada');
    const emailSettings = organization.emailSettings;
    const provider = emailSettings?.defaultProvider || 'RESEND';
    const defaultSender = provider === 'RESEND'
      ? emailSettings?.resendFromEmail
      : (emailSettings?.smtpFromEmail || emailSettings?.smtpUser);
    const defaultSenderName = provider === 'RESEND'
      ? emailSettings?.resendFromName
      : emailSettings?.smtpFromName;
    return this.prisma.emailTemplate.create({
      data: {
        organizationId,
        name: data.name?.trim() || 'Nueva plantilla',
        channel: data.channel || 'EMAIL',
        status: data.status || 'DRAFT',
        subject: initialSubject,
        senderName: data.senderName?.trim() || defaultSenderName || organization.name,
        senderEmail: data.senderEmail?.trim() || defaultSender || null,
        previewText: initialPreview,
        category: initialCategory,
        content: initialContent,
        htmlContent: data.htmlContent || null,
        thumbnailUrl: data.thumbnailUrl || null,
        tags: data.tags || [],
        useOrgCredentials: data.useOrgCredentials !== false,
      },
    });
  }

  async update(id: string, data: any) {
    await this.get(id);

    return this.prisma.emailTemplate.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : undefined,
        channel: data.channel !== undefined ? data.channel : undefined,
        status: data.status !== undefined ? data.status : undefined,
        subject: data.subject !== undefined ? data.subject : undefined,
        senderName: data.senderName !== undefined ? data.senderName : undefined,
        senderEmail: data.senderEmail !== undefined ? data.senderEmail : undefined,
        previewText: data.previewText !== undefined ? data.previewText : undefined,
        content: data.content !== undefined ? data.content : undefined,
        htmlContent: data.htmlContent !== undefined ? data.htmlContent : undefined,
        category: data.category !== undefined ? data.category : undefined,
        thumbnailUrl: data.thumbnailUrl !== undefined ? data.thumbnailUrl : undefined,
        tags: data.tags !== undefined ? data.tags : undefined,
        useOrgCredentials: data.useOrgCredentials !== undefined ? data.useOrgCredentials : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.emailTemplate.delete({ where: { id } });
  }

  async duplicate(id: string, data: { campaignId?: string; name?: string } = {}) {
    const original = await this.get(id);

    return this.prisma.emailTemplate.create({
      data: {
        organizationId: (original as any).organizationId,
        name: data.name?.trim() || `${original.name} (Copia)`,
        channel: (original as any).channel || 'EMAIL',
        status: 'DRAFT',
        subject: original.subject,
        senderName: original.senderName,
        senderEmail: original.senderEmail,
        previewText: original.previewText,
        category: (original as any).category || 'CUSTOM',
        content: original.content as any,
        htmlContent: (original as any).htmlContent,
        thumbnailUrl: (original as any).thumbnailUrl,
        tags: (original as any).tags || [],
        sourceTemplateId: (original as any).sourceTemplateId || original.id,
      },
    });
  }

  async sendTest(id: string, recipientEmail: string) {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      throw new BadRequestException('Debes proporcionar un correo destinatario válido.');
    }

    const template = await this.get(id);
    const context = { first_name: 'María', last_name: 'Torres', email: recipientEmail, event_name: 'Evento de prueba', event_start_date: new Date().toLocaleString('es-PE'), event_location: 'Por confirmar', registration_code: 'PRUEBA-001', unsubscribe_url: '#' };
    let htmlContent = (template as any).htmlContent ? interpolate((template as any).htmlContent, context) : blocksToHtml((template as any).content, context);

    if (!htmlContent) {
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a;">${template.name}</h2>
          <p style="color: #64748b;">${(template as any).previewText || ''}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p>Este es un correo de prueba enviado desde la plantilla <strong>${template.name}</strong>.</p>
        </div>
      `;
    }

    const subject = template.subject ? `[Prueba] ${template.subject}` : `[Prueba] ${template.name}`;
    const result = await this.mailService.send({
      to: recipientEmail,
      subject,
      html: htmlContent,
      organizationId: (template as any).organizationId,
      fromEmail: (template as any).senderEmail || undefined,
      fromName: (template as any).senderName || undefined,
      requireOrganizationCredentials: true,
    });

    if (!result.sent) {
      throw new BadRequestException(`No se pudo enviar el correo de prueba: ${result.reason || 'Error desconocido'}`);
    }

    return {
      success: true,
      message: `Correo de prueba enviado exitosamente a ${recipientEmail}`,
      messageId: result.messageId,
    };
  }
}
