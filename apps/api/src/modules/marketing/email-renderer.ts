type TemplateBlock = { type?: string; options?: Record<string, unknown>; label?: string };

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[char] || char));

/** Keeps the small formatting vocabulary produced by the visual editor, while
 * escaping arbitrary input before it is inserted into an email. */
function richText(value: unknown, context: Record<string, unknown>) {
  const tags: string[] = [];
  const tokenized = String(value ?? '').replace(/<\/?(?:strong|b|em|i|br)\s*\/?\s*>|<a\b[^>]*>|<\/a\s*>/gi, (tag) => {
    const rawHref = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    // Las URLs de los enlaces también pueden venir del contexto, por ejemplo
    // href="{{ unsubscribe_url }}" o href="{{ whatsapp_community_url }}".
    const href = rawHref ? interpolate(rawHref, context).replace(/&amp;/g, '&') : undefined;
    const safeAnchor = href && /^(https?:|mailto:|tel:)/i.test(href)
      ? `<a href="${escapeHtml(href)}">`
      : /^<a\b/i.test(tag) ? '' : tag.toLowerCase().replace(/\s+/g, '');
    tags.push(safeAnchor);
    return `@@EMAIL_TAG_${tags.length - 1}@@`;
  });
  const escaped = escapeHtml(tokenized);
  const withVariables = interpolate(escaped, context);
  return withVariables
    .replace(/@@EMAIL_TAG_(\d+)@@/g, (_match, index) => tags[Number(index)] || '')
    .replace(/\r?\n/g, '<br/>');
}

export function interpolate(value: string, context: Record<string, unknown>) {
  return value.replace(/{{\s*([\w.]+)\s*}}/g, (_match, key) => escapeHtml(variableValue(key, context) ?? ''));
}

function variableValue(key: string, context: Record<string, unknown>): unknown {
  const legacy: Record<string, string> = {
    'contact.FIRSTNAME': 'first_name', 'contact.LASTNAME': 'last_name', 'contact.EMAIL': 'email',
    'event.NAME': 'event_name', 'event.DATE': 'event_start_date', 'event.LOCATION': 'event_location',
    'registration.CODE': 'registration_code',
  };
  const resolved = legacy[key] || key;
  if (context[resolved] !== undefined) return context[resolved];
  return resolved.split('.').reduce<unknown>((value, part) => value && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined, context);
}

const color = (value: unknown, fallback: string) => /^#[0-9a-f]{3,8}$/i.test(String(value || '')) ? String(value) : fallback;
const number = (value: unknown, fallback: number, min = 0, max = 160) => Math.min(max, Math.max(min, Number(value) || fallback));
const alignment = (value: unknown) => ['left', 'center', 'right'].includes(String(value)) ? String(value) : 'left';

function button(text: string, url: string, options: Record<string, unknown>) {
  const background = color(options.bgColor, '#0f766e');
  const textColor = color(options.textColor, '#ffffff');
  const radius = number(options.borderRadius, 6, 0, 32);
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="${alignment(options.align)}" style="padding:16px 0"><a href="${escapeHtml(url || '#')}" style="background:${background};border-radius:${radius}px;color:${textColor};display:inline-block;font-family:Arial,sans-serif;font-size:14px;font-weight:600;padding:12px 22px;text-decoration:none">${text}</a></td></tr></table>`;
}

function logo(options: Record<string, unknown>, context: Record<string, unknown>) {
  const align = alignment(options.align);
  const url = interpolate(String(options.imageUrl || ''), context);
  const label = richText(options.text || options.alt || 'Logo', context);
  const width = number(options.width, 140, 24, 600);
  if (url) return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="${align}" style="padding:10px 0"><img src="${escapeHtml(url)}" width="${width}" alt="${escapeHtml(options.alt || '')}" style="display:inline-block;max-width:100%;height:auto;border:0" /></td></tr></table>`;
  const background = color(options.bgColor, '#334155');
  const textColor = color(options.textColor, '#ffffff');
  const padding = number(options.paddingY, 12, 6, 40);
  const shape = options.badgeShape === 'circle' ? 'border-radius:50%;width:' + width + 'px;height:' + width + 'px;line-height:' + width + 'px;' : 'border-radius:10px;padding:' + padding + 'px 20px;';
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="${align}" style="padding:10px 0"><span style="background:${background};color:${textColor};display:inline-block;font-family:Arial,sans-serif;font-size:${number(options.fontSize, 18, 10, 48)}px;font-weight:700;letter-spacing:.04em;text-align:center;${shape}">${label}</span></td></tr></table>`;
}

export function blocksToHtml(blocks: unknown, context: Record<string, unknown>) {
  if (!Array.isArray(blocks)) return '';
  const content = (blocks as TemplateBlock[]).map((block) => {
    const options = block.options || {};
    const text = richText(options.text || block.label || '', context);
    const align = escapeHtml(options.align || 'left');
    if (block.type === 'logo') return logo(options, context);
    if (block.type === 'heading') {
      const level = Math.min(6, Math.max(1, Number(options.level || 2)));
      const background = options.bgColor ? `background:${color(options.bgColor, '#ffffff')};border-radius:12px;padding:${number(options.paddingY, 16)}px 16px;` : '';
      const subtitle = options.subtitle ? `<p style="color:${options.bgColor ? '#ffffff' : '#64748b'};font-size:14px;line-height:1.5;margin:8px 0 0">${richText(options.subtitle, context)}</p>` : '';
      return `<div style="${background}text-align:${align};margin:8px 0"><h${level} style="color:${color(options.color, options.bgColor ? '#ffffff' : '#111827')};font-family:Arial,sans-serif;font-size:${number(options.fontSize, 24, 14, 48)}px;font-style:${options.fontStyle === 'italic' ? 'italic' : 'normal'};font-weight:${number(options.fontWeight, 600, 300, 800)};line-height:1.25;margin:0">${text}</h${level}>${subtitle}</div>`;
    }
    const textStyle = `color:${color(options.color, '#374151')};font-family:Arial,sans-serif;font-size:${number(options.fontSize, 14, 10, 30)}px;font-style:${options.fontStyle === 'italic' ? 'italic' : 'normal'};font-weight:${number(options.fontWeight, 400, 300, 800)};line-height:${number(options.lineHeight, 1.6, 1, 3)};margin:12px 0;text-align:${align}`;
    if (block.type === 'dynamic') {
      const variable = String(options.variable || 'first_name')
        .replace(/^\s*{{\s*|\s*}}\s*$/g, '')
        .trim();
      const source = String(options.text || `{{ ${variable} }}`);
      const value = richText(source, context);
      const isOnlyVariable = /^{{\s*[\w.]+\s*}}$/.test(source.trim());
      const rendered = isOnlyVariable && !value.trim()
        ? richText(options.fallback || '', context)
        : value;
      return `<p style="${textStyle}">${rendered}</p>`;
    }
    if (block.type === 'text') return `<p style="${textStyle}">${text}</p>`;
    if (block.type === 'image' || block.type === 'video') {
      const url = interpolate(String(options.imageUrl || options.thumbnailUrl || options.url || ''), context);
      const image = url ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(options.alt || '')}" style="display:inline-block;max-width:100%;height:auto;border:0" />` : '';
      const linked = block.type === 'video' && options.url ? `<a href="${escapeHtml(interpolate(String(options.url), context))}" style="text-decoration:none">${image}</a>` : image;
      return linked ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="${align}" style="padding:10px 0">${linked}</td></tr></table>` : '';
    }
    if (block.type === 'button') return button(text, interpolate(String(options.url || ''), context), options);
    if (block.type === 'product') {
      const image = interpolate(String(options.imageUrl || ''), context);
      const title = interpolate(String(options.title || block.label || ''), context);
      const description = interpolate(String(options.description || ''), context);
      const price = interpolate(String(options.price || ''), context);
      const action = button(interpolate(String(options.buttonText || 'Ver más'), context), interpolate(String(options.buttonUrl || ''), context), options);
      return `${image ? `<img src="${image}" alt="${title}" style="max-width:100%;height:auto" />` : ''}<h3>${title}</h3><p>${description}</p><p><strong>${price}</strong></p>${action}`;
    }
    if (block.type === 'divider') return `<hr style="border:0;border-top:${Number(options.height || 1)}px solid ${escapeHtml(options.color || '#e5e7eb')};margin:${Number(options.marginY || 24)}px 0" />`;
    if (block.type === 'social') {
      const links = Array.isArray(options.networks) ? options.networks : [];
      const rendered = links.map((network: any) => `<a href="${escapeHtml(network?.url || '#')}" style="color:${color(options.color, '#475569')};font-family:Arial,sans-serif;font-size:13px;margin:0 7px;text-decoration:underline">${escapeHtml(network?.name || 'Enlace')}</a>`).join('');
      return rendered ? `<p style="margin:18px 0;text-align:${align}">${rendered}</p>` : '';
    }
    if (block.type === 'navigation') {
      const links = Array.isArray(options.links) ? options.links : [];
      return links.length ? `<p style="margin:14px 0;text-align:${align}">${links.map((link: any) => `<a href="${escapeHtml(link?.url || '#')}" style="color:#475569;font-family:Arial,sans-serif;font-size:13px;margin:0 8px;text-decoration:none">${escapeHtml(link?.label || 'Enlace')}</a>`).join('')}</p>` : '';
    }
    if (block.type === 'html') return interpolate(String(options.html || options.content || ''), context);
    return '';
  }).join('');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;width:100%;background:#ffffff"><tr><td style="padding:28px 32px">${content}</td></tr></table></td></tr></table>`;
}
