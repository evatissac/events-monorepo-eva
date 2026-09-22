export type MarketingVariableDefinition = {
  key: string;
  label: string;
  category: 'Datos de contacto' | 'Datos del evento' | 'Datos de la edición' | 'Registro' | 'Automatización';
  description: string;
};

/** Contrato único entre el editor de plantillas y el motor de envío. */
export const MARKETING_VARIABLE_CATALOG: MarketingVariableDefinition[] = [
  { key: 'contact.first_name', label: 'Nombre', category: 'Datos de contacto', description: 'Nombre con el que se registró la persona' },
  { key: 'contact.last_name', label: 'Apellidos', category: 'Datos de contacto', description: 'Apellidos de la persona registrada' },
  { key: 'contact.email', label: 'Correo electrónico', category: 'Datos de contacto', description: 'Correo de contacto' },
  { key: 'event.name', label: 'Nombre del evento', category: 'Datos del evento', description: 'Evento que activa la automatización' },
  { key: 'event.start_date', label: 'Fecha del evento', category: 'Datos del evento', description: 'Fecha y hora configurada para el evento' },
  { key: 'event.location', label: 'Ubicación', category: 'Datos del evento', description: 'Lugar o enlace del evento' },
  { key: 'edition.name', label: 'Nombre de la edición', category: 'Datos de la edición', description: 'Edición asociada al registro o campaña' },
  { key: 'edition.start_date', label: 'Fecha de la edición', category: 'Datos de la edición', description: 'Fecha y hora de inicio de la edición' },
  { key: 'registration.code', label: 'Código de registro', category: 'Registro', description: 'Código único de la inscripción' },
  { key: 'automation.whatsapp_community_url', label: 'Enlace de WhatsApp', category: 'Automatización', description: 'URL configurada para la comunidad' },
  { key: 'automation.offer_url', label: 'URL de oferta', category: 'Automatización', description: 'Enlace de conversión de la automatización' },
  { key: 'automation.discount_code', label: 'Código de beneficio', category: 'Automatización', description: 'Código promocional vigente' },
  { key: 'automation.unsubscribe_url', label: 'Enlace de baja', category: 'Automatización', description: 'Enlace para cancelar suscripción' },
];
