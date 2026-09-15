type TemplateBlock = { type?: string; options?: Record<string, unknown>; label?: string };

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[char] || char));

/** Keeps the small formatting vocabulary produced by the visual editor, while
 * escaping arbitrary input before it is inserted into an email. */
function richText(value: unknown, context: Record<string, unknown>) {
  const tags: string[] = [];
  const tokenized = String(value ?? '').replace(/<\/?(?:strong|b|em|i|br)\s*\/?\s*>|<a\b[^>]*>|<\/a\s*>/gi, (tag) => {
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
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

function button(text: string, url: string, options: Record<string, unknown>) {
  const background = String(options.bgColor || '#0f766e');
  const color = String(options.textColor || '#ffffff');
  const radius = Number(options.borderRadius || 6);
  return `<p style="text-align:${escapeHtml(options.align || 'center')};margin:24px 0"><a href="${escapeHtml(url)}" style="background:${escapeHtml(background)};border-radius:${radius}px;color:${escapeHtml(color)};display:inline-block;padding:12px 22px;text-decoration:none">${text}</a></p>`;
}

export function blocksToHtml(blocks: unknown, context: Record<string, unknown>) {
  if (!Array.isArray(blocks)) return '';
  const content = (blocks as TemplateBlock[]).map((block) => {
    const options = block.options || {};
    const text = richText(options.text || block.label || '', context);
    const align = escapeHtml(options.align || 'left');
    if (block.type === 'heading') return `<h${Math.min(6, Math.max(1, Number(options.level || 2)))} style="text-align:${align};color:${escapeHtml(options.color || '#111827')}">${text}</h${Math.min(6, Math.max(1, Number(options.level || 2)))}>`;
    if (block.type === 'text' || block.type === 'dynamic') return `<p style="text-align:${align};color:${escapeHtml(options.color || '#374151')};line-height:${escapeHtml(options.lineHeight || 1.6)}">${text}</p>`;
    if (block.type === 'image' || block.type === 'logo' || block.type === 'video') {
      const url = interpolate(String(options.imageUrl || options.thumbnailUrl || options.url || ''), context);
      return url ? `<p style="text-align:${align}"><img src="${url}" alt="${escapeHtml(options.alt || '')}" style="max-width:100%;height:auto" /></p>` : '';
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
    if (block.type === 'html') return interpolate(String(options.html || options.content || ''), context);
    return '';
  }).join('');
  return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">${content}</div>`;
}
