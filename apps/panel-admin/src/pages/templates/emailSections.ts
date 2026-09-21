import type { EmailBlock } from "./EmailTemplateBuilderPage"

export interface EmailSectionTemplate {
  id: string
  name: string
  category: "all" | "headers" | "welcome" | "content" | "cta" | "footers"
  categoryLabel: string
  description: string
  badgeText?: string
  previewSvg: string
  blocks: Omit<EmailBlock, "id">[]
}

export const EMAIL_SECTION_CATEGORIES = [
  { id: "all", label: "Todas" },
  { id: "headers", label: "Cabecera" },
  { id: "welcome", label: "Registro" },
  { id: "content", label: "Contenido" },
  { id: "cta", label: "Acciones" },
  { id: "footers", label: "Pie de correo" },
] as const

const preview = (body: string) => `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 104" width="280" height="104"><rect width="280" height="104" rx="8" fill="%23ffffff" stroke="%23d4d4d4"/>${body}</svg>`

export const EMAIL_SECTIONS: EmailSectionTemplate[] = [
  {
    id: "standard-header", name: "Cabecera institucional", category: "headers", categoryLabel: "Cabecera",
    description: "Cabecera monocroma para identificar a la institución. Añade el logotipo desde sus propiedades.",
    previewSvg: preview('<rect width="280" height="48" rx="8" fill="%23171717"/><text x="140" y="30" fill="white" font-family="Arial" font-size="14" text-anchor="middle">LOGOTIPO DE LA INSTITUCIÓN</text>'),
    blocks: [{ type: "logo", label: "Cabecera institucional", options: { text: "LOGOTIPO DE LA INSTITUCIÓN", imageUrl: "", alt: "Logotipo institucional", align: "center", width: 140, bgColor: "#171717", textColor: "#ffffff", paddingY: 16 } }],
  },
  {
    id: "standard-registration", name: "Confirmación de registro", category: "welcome", categoryLabel: "Registro",
    description: "Confirmación transaccional lista para asociar a un formulario de evento.",
    previewSvg: preview('<text x="140" y="30" fill="%23171717" font-family="Arial" font-size="15" text-anchor="middle">Registro confirmado</text><text x="140" y="53" fill="%23525252" font-family="Arial" font-size="10" text-anchor="middle">Hola, nombre del participante</text><rect x="91" y="68" width="98" height="22" rx="3" fill="%23171717"/><text x="140" y="83" fill="white" font-family="Arial" font-size="9" text-anchor="middle">VER DETALLES</text>'),
    blocks: [
      { type: "heading", label: "Registro confirmado", options: { text: "Tu registro está confirmado", level: 1, align: "center", color: "#171717", fontSize: 26, fontWeight: 500 } },
      { type: "dynamic", label: "Saludo y detalles", options: { text: "Hola, {{ first_name }}.<br/><br/>Tu registro para <strong>{{ event_name }}</strong> fue confirmado.<br/>Fecha: {{ event_start_date }}<br/>Lugar: {{ event_location }}<br/>Código de registro: <strong>{{ registration_code }}</strong>", align: "center", color: "#404040", fontSize: 14, lineHeight: 1.65, fallback: "Hola." } },
    ],
  },
  {
    id: "standard-content", name: "Contenido informativo", category: "content", categoryLabel: "Contenido",
    description: "Bloque editorial simple para comunicar información importante sin elementos visuales innecesarios.",
    previewSvg: preview('<text x="20" y="28" fill="%23171717" font-family="Arial" font-size="15">Título de la información</text><line x1="20" y1="40" x2="260" y2="40" stroke="%23d4d4d4"/><text x="20" y="60" fill="%23525252" font-family="Arial" font-size="9">Escribe aquí el mensaje que deseas comunicar.</text><text x="20" y="74" fill="%23525252" font-family="Arial" font-size="9">Puedes incluir variables de la aplicación.</text>'),
    blocks: [
      { type: "heading", label: "Título de contenido", options: { text: "Información importante sobre {{ event_name }}", level: 2, align: "left", color: "#171717", fontSize: 21, fontWeight: 500 } },
      { type: "text", label: "Mensaje", options: { text: "Hola, {{ first_name }}.<br/><br/>Escribe aquí el mensaje que deseas comunicar a las personas registradas.", align: "left", color: "#404040", fontSize: 14, lineHeight: 1.65 } },
    ],
  },
  {
    id: "standard-cta", name: "Acción de registro", category: "cta", categoryLabel: "Acciones",
    description: "Botón neutro para comunidades, ofertas o páginas del evento. Configura su URL en las propiedades.",
    previewSvg: preview('<text x="140" y="30" fill="%23525252" font-family="Arial" font-size="10" text-anchor="middle">Completa el siguiente paso</text><rect x="82" y="47" width="116" height="30" rx="3" fill="%23171717"/><text x="140" y="66" fill="white" font-family="Arial" font-size="10" text-anchor="middle">IR A LA COMUNIDAD</text>'),
    blocks: [
      { type: "text", label: "Instrucción", options: { text: "Completa el siguiente paso para recibir la información del evento.", align: "center", color: "#404040", fontSize: 14, lineHeight: 1.6 } },
      { type: "button", label: "Acción principal", options: { text: "Ir a la comunidad", url: "{{ whatsapp_community_url }}", align: "center", bgColor: "#171717", textColor: "#ffffff", borderRadius: 3 } },
    ],
  },
  {
    id: "standard-footer", name: "Pie de correo institucional", category: "footers", categoryLabel: "Pie de correo",
    description: "Cierre estándar con código de registro y enlace obligatorio para cancelar suscripción.",
    previewSvg: preview('<line x1="20" y1="24" x2="260" y2="24" stroke="%23d4d4d4"/><text x="140" y="50" fill="%23525252" font-family="Arial" font-size="9" text-anchor="middle">Código de registro: REG-0001</text><text x="140" y="72" fill="%23525252" font-family="Arial" font-size="9" text-anchor="middle">Cancelar suscripción</text>'),
    blocks: [
      { type: "divider", label: "Separador", options: { color: "#d4d4d4", height: 1, marginY: 24 } },
      { type: "text", label: "Pie institucional", options: { text: "Código de registro: {{ registration_code }}<br/><br/><a href=\"{{ unsubscribe_url }}\">Cancelar suscripción</a>", align: "center", color: "#525252", fontSize: 12, lineHeight: 1.5 } },
    ],
  },
]

/** Crea instancias independientes para que una sección pueda reutilizarse en el lienzo. */
export function createBlocksFromSection(section: EmailSectionTemplate): EmailBlock[] {
  return section.blocks.map((block) => ({
    ...block,
    id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    options: JSON.parse(JSON.stringify(block.options || {})),
  }))
}
