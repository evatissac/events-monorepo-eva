const HAS_TIMEZONE = /(Z|[+-]\d{2}:\d{2})$/i;

/** Converts a value entered in the dashboard into an absolute instant in Peru time. */
export function parsePeruDateTime(value: string): Date {
  const normalized = value.trim();
  if (HAS_TIMEZONE.test(normalized)) return new Date(normalized);
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return new Date(`${normalized}T00:00:00-05:00`);
  return new Date(`${normalized.length === 16 ? `${normalized}:00` : normalized}-05:00`);
}
