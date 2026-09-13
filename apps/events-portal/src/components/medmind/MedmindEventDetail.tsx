import React, { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Sparkles,
  User,
  Video,
} from 'lucide-react';

interface MedmindEventDetailProps {
  institution: string;
  organization: any;
  event: any;
  edition: any;
  speakers?: any[];
  activities?: any[];
  form?: any;
  heroImage?: string;
  heroVideo?: string;
  apiUrl: string;
}

type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

function getButtonClass(
  variant: ButtonVariant = 'default',
  size: ButtonSize = 'default',
  className: string = ''
) {
  const base =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer';

  const variants: Record<ButtonVariant, string> = {
    default:
      'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 border border-transparent',
    outline:
      'border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 hover:text-zinc-900',
    secondary:
      'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border border-transparent',
    ghost:
      'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 border border-transparent',
  };

  const sizes: Record<ButtonSize, string> = {
    default: 'h-10 px-4 py-2 text-sm',
    sm: 'h-9 px-3 text-xs',
    lg: 'h-11 px-6 text-base font-semibold',
    icon: 'size-10',
  };

  return [base, variants[variant], sizes[size], className]
    .filter(Boolean)
    .join(' ');
}

function Button({
  variant = 'default',
  size = 'default',
  className = '',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button className={getButtonClass(variant, size, className)} {...props}>
      {children}
    </button>
  );
}

function ButtonLink({
  href,
  variant = 'default',
  size = 'default',
  className = '',
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} className={getButtonClass(variant, size, className)}>
      {children}
    </a>
  );
}

function EventTitle({ title }: { title: string }) {
  const parts = title.split(/(ENAM Y EL RESIDENTADO \d{4}|ENAM|RESIDENTADO \d{4}|RESIDENTADO)/i);
  return (
    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-900 leading-[1.15]">
      {parts.map((part, i) =>
        /(ENAM Y EL RESIDENTADO \d{4}|ENAM|RESIDENTADO \d{4}|RESIDENTADO)/i.test(part) ? (
          <span key={i} className="text-teal-600">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </h1>
  );
}

function FactCard({
  icon,
  primary,
  secondary,
}: {
  icon: React.ReactNode;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50/70 px-3.5 py-3 text-left">
      <div className="text-teal-600 shrink-0">{icon}</div>
      <div className="min-w-0">
        <span className="block text-sm font-semibold text-zinc-900 leading-tight truncate">
          {primary}
        </span>
        <span className="block text-xs text-zinc-500 mt-0.5 truncate">
          {secondary}
        </span>
      </div>
    </div>
  );
}

function SpeakerCard({ speaker }: { speaker: any }) {
  const name =
    [speaker.firstName, speaker.lastName].filter(Boolean).join(' ') ||
    'Expositor invitado';
  const initials =
    [speaker.firstName?.[0], speaker.lastName?.[0]].filter(Boolean).join('') ||
    'DR';

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
      <div className="size-16 sm:size-20 rounded-full border border-zinc-200 bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 overflow-hidden font-semibold text-base sm:text-lg">
        {speaker.avatarUrl ? (
          <img
            src={speaker.avatarUrl}
            alt={name}
            className="size-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-bold text-zinc-900 tracking-tight">{name}</h3>
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-600 mt-0.5">
          Médico · Ponente oficial
        </p>
        {speaker.bio && (
          <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
            {speaker.bio}
          </p>
        )}
      </div>
    </article>
  );
}

function Field({ field }: { field: any }) {
  const choices = Array.isArray(field.options?.choices)
    ? field.options.choices
    : [];

  if (field.type === 'header') {
    return (
      <div className="col-span-full pt-4 pb-2 border-b border-zinc-100">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-teal-700">
          {field.options?.text || field.label}
        </h4>
      </div>
    );
  }

  if (field.type === 'radio') {
    return (
      <div className="col-span-full space-y-2">
        <label className="block text-sm font-medium text-zinc-700">
          {field.label}
          {field.required && <span className="text-rose-500 ml-1">*</span>}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {choices.map((choice: string) => (
            <label
              key={choice}
              className="relative flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-700 cursor-pointer transition-all hover:bg-zinc-50 hover:border-zinc-300 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50/50 has-[:checked]:text-teal-900"
            >
              <input
                type="radio"
                name={field.key}
                value={choice}
                required={field.required}
                className="size-4 text-teal-600 border-zinc-300 focus:ring-teal-500"
              />
              <span className="font-medium text-sm">{choice}</span>
            </label>
          ))}
        </div>
        {field.options?.helpText && (
          <p className="text-xs text-zinc-500">{field.options.helpText}</p>
        )}
      </div>
    );
  }

  if (field.type === 'multiple') {
    return (
      <div className="col-span-full space-y-2">
        <label className="block text-sm font-medium text-zinc-700">
          {field.label}
          {field.required && <span className="text-rose-500 ml-1">*</span>}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {choices.map((choice: string) => (
            <label
              key={choice}
              className="relative flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-700 cursor-pointer transition-all hover:bg-zinc-50 hover:border-zinc-300 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50/50 has-[:checked]:text-teal-900"
            >
              <input
                type="checkbox"
                name={field.key}
                value={choice}
                className="size-4 rounded text-teal-600 border-zinc-300 focus:ring-teal-500"
              />
              <span className="font-medium text-sm">{choice}</span>
            </label>
          ))}
        </div>
        {field.options?.helpText && (
          <p className="text-xs text-zinc-500">{field.options.helpText}</p>
        )}
      </div>
    );
  }

  if (field.type === 'terms' || field.type === 'checkbox') {
    return (
      <div className="col-span-full mt-1">
        <label className="flex items-start gap-3 rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-3 text-sm text-zinc-600 cursor-pointer hover:bg-zinc-50 transition-colors">
          <input
            type="checkbox"
            name={field.key}
            required={field.required}
            className="mt-0.5 size-4 rounded text-teal-600 border-zinc-300 focus:ring-teal-500 shrink-0"
          />
          <span className="leading-snug">
            {field.label}
            {field.required && <span className="text-rose-500 ml-1">*</span>}
          </span>
        </label>
      </div>
    );
  }

  const baseInputClass =
    'flex h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50';

  const isFullWidth =
    field.type === 'textarea' ||
    field.key === 'email' ||
    field.key?.toLowerCase().includes('correo');

  return (
    <div className={isFullWidth ? 'col-span-full' : 'col-span-1'}>
      <label className="block text-sm font-medium text-zinc-700 mb-1.5">
        {field.label}
        {field.required && <span className="text-rose-500 ml-1">*</span>}
      </label>

      {field.type === 'textarea' ? (
        <textarea
          required={field.required}
          name={field.key}
          placeholder={field.options?.placeholder}
          className="flex min-h-[90px] w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-colors"
        />
      ) : field.type === 'select' ? (
        <div className="relative">
          <select
            required={field.required}
            name={field.key}
            className={`${baseInputClass} appearance-none pr-9`}
          >
            <option value="">Selecciona una opción</option>
            {choices.map((choice: any) => (
              <option key={String(choice)} value={choice}>
                {choice}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
        </div>
      ) : (
        <input
          required={field.required}
          name={field.key}
          type={
            field.type === 'email'
              ? 'email'
              : field.type === 'phone'
                ? 'tel'
                : 'text'
          }
          placeholder={field.options?.placeholder}
          className={baseInputClass}
        />
      )}

      {field.options?.helpText && (
        <p className="text-xs text-zinc-500 mt-1">{field.options.helpText}</p>
      )}
    </div>
  );
}

export function MedmindEventDetail({
  institution,
  organization,
  event,
  edition,
  speakers = [],
  activities = [],
  form,
  heroImage,
  apiUrl,
}: MedmindEventDetailProps) {
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const startDateStr = edition?.startDate || event.startDate;
  const date = startDateStr ? new Date(startDateStr) : null;
  const dateText = date
    ? date.toLocaleDateString('es-PE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Fecha por confirmar';
  const weekdayText = date
    ? date.toLocaleDateString('es-PE', { weekday: 'long' })
    : '';
  const timeText = date
    ? date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : 'Hora por definir';

  const fields = form?.fields || [];
  const description =
    edition?.description || event.details?.content || event.description;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const answers: Record<string, unknown> = {};

    for (const key of new Set([...data.keys()])) {
      const values = data.getAll(key).map(String);
      answers[key] = values.length > 1 ? values : values[0] || '';
    }

    setStatus('');
    setIsLoading(true);

    try {
      const response = await fetch(
        `${apiUrl}/public/registration-forms/${form.slug}/submissions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers }),
        }
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(body.message || 'No se pudo completar el registro.');
        setIsLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setStatus(
        'Ocurrió un error al enviar el formulario. Por favor intenta de nuevo.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="w-full min-h-screen overflow-x-hidden bg-white font-sans text-zinc-900 antialiased">
      {/* 1. Header / Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <a
            href={`/${institution}`}
            className="flex items-center gap-3 no-underline"
          >
            {organization?.logoUrl || event.logoUrl ? (
              <img
                src={organization?.logoUrl || event.logoUrl}
                alt={organization?.name || 'MedMind'}
                className="h-8 w-auto max-w-[140px] object-contain"
              />
            ) : (
              <span className="text-xl font-bold tracking-tight text-zinc-900">
                MedMind
              </span>
            )}
            <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-teal-700">
              WEBINAR
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-600">
            {speakers.length > 0 && (
              <a
                href="#ponentes"
                className="transition-colors hover:text-teal-600"
              >
                Expositores
              </a>
            )}
            {activities.length > 0 && (
              <a
                href="#temario"
                className="transition-colors hover:text-teal-600"
              >
                Temario
              </a>
            )}
            {form && (
              <a
                href="#registro"
                className="transition-colors hover:text-teal-600"
              >
                Reservar cupo
              </a>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {form && (
              <ButtonLink href="#registro" size="sm">
                Reservar cupo
                <ArrowRight className="size-3.5" />
              </ButtonLink>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section id="inicio" className="w-full relative py-12 sm:py-16 lg:py-20">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Headline, Description, Facts, CTAs */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50/80 px-3 py-1 text-xs font-semibold text-teal-700 mb-5">
                <span className="size-2 rounded-full bg-red-500 animate-pulse" />
                <span>WEBINAR GRATUITO · EN VIVO</span>
              </div>

              <EventTitle title={event.eventName} />

              {description && (
                <p className="mt-4 text-base sm:text-lg text-zinc-600 leading-relaxed font-normal max-w-xl">
                  {description}
                </p>
              )}

              {/* Facts Row */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl">
                <FactCard
                  icon={<CalendarDays className="size-5" />}
                  primary={dateText}
                  secondary={weekdayText ? `Día ${weekdayText}` : 'Fecha oficial'}
                />
                <FactCard
                  icon={<Clock3 className="size-5" />}
                  primary={`${timeText} (Perú)`}
                  secondary="Hora exacta de inicio"
                />
                <FactCard
                  icon={<Video className="size-5" />}
                  primary="100% Online"
                  secondary="Vía transmisión en vivo"
                />
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {form && (
                  <ButtonLink href="#registro" size="lg">
                    Quiero mi cupo gratis
                    <ArrowRight className="size-4" />
                  </ButtonLink>
                )}
                {activities.length > 0 && (
                  <ButtonLink href="#temario" variant="outline" size="lg">
                    Explorar temario
                  </ButtonLink>
                )}
              </div>
            </div>

            {/* Right Column: Hero Graphic */}
            {heroImage && (
              <div className="lg:col-span-5 flex items-center justify-center">
                <div className="w-full max-w-[420px] rounded-2xl border border-zinc-200 bg-zinc-50/70 p-6 sm:p-8 flex items-center justify-center">
                  <img
                    src={heroImage}
                    alt={event.eventName}
                    className="max-h-[340px] w-auto max-w-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. Temario / Agenda Section */}
      {activities.length > 0 && (
        <section
          id="temario"
          className="w-full border-t border-zinc-200/80 bg-zinc-50/50 py-16 sm:py-20"
        >
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 block mb-1">
                Temario
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
                Todo lo que necesitas para prepararte mejor
              </h2>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activities.map((item: any, index: number) => (
                <article
                  key={item.id || index}
                  className="rounded-xl border border-zinc-200 bg-white p-6"
                >
                  <span className="font-mono text-xs font-bold text-teal-600">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-3 text-base font-bold text-zinc-900">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Expositores / Speakers Section */}
      {speakers.length > 0 && (
        <section
          id="ponentes"
          className="w-full border-t border-zinc-200/80 py-16 sm:py-20"
        >
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 block mb-1">
                Expositores
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
                ¿Quiénes te acompañarán en este{' '}
                <span className="text-teal-600">webinar?</span>
              </h2>
              <p className="mt-2 text-sm sm:text-base text-zinc-600 leading-relaxed">
                Médicos con experiencia real y resultados comprobados, listos
                para compartir su estrategia y resolver tus dudas en vivo.
              </p>
            </div>

            <div
              className={`mt-8 grid gap-6 ${
                speakers.length === 1 ? 'max-w-2xl' : 'sm:grid-cols-2 max-w-4xl'
              }`}
            >
              {speakers.map((speaker: any, index: number) => (
                <SpeakerCard key={speaker.id || index} speaker={speaker} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. Registration Section */}
      {form && (
        <section
          id="registro"
          className="w-full border-t border-zinc-200/80 bg-zinc-50/50 py-16 sm:py-24"
        >
          <div className="w-full max-w-2xl mx-auto px-4 sm:px-6">
            <div className="w-full rounded-2xl border border-zinc-200 bg-white p-6 sm:p-10">
              <div className="text-center max-w-xl mx-auto">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                  <Sparkles className="size-3" />
                  Acceso 100% Gratuito
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 mt-3">
                  Reserva tu cupo <span className="text-teal-600">gratis</span>
                </h2>
                <p className="text-sm text-zinc-600 mt-2">
                  Cupos limitados · {dateText}, {timeText} (Hora Perú)
                </p>
              </div>

              {done ? (
                <div className="mt-8 rounded-xl border border-teal-200 bg-teal-50/60 p-8 text-center">
                  <CheckCircle2 className="size-12 text-teal-600 mx-auto" />
                  <h3 className="text-lg font-bold text-zinc-900 mt-3">
                    ¡Registro confirmado!
                  </h3>
                  <p className="text-sm text-zinc-600 mt-1 max-w-md mx-auto">
                    Te hemos reservado tu cupo. Revisa tu correo electrónico
                    para recibir el enlace de acceso al webinar.
                  </p>
                  <div className="mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDone(false)}
                    >
                      Registrar a otra persona
                    </Button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={submit}
                  className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  {fields.map((field: any) => (
                    <Field key={field.key} field={field} />
                  ))}

                  <div className="col-span-full pt-2">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={isLoading}
                      className="w-full text-base font-semibold"
                    >
                      {isLoading ? 'Enviando registro...' : 'Quiero mi cupo gratis'}
                      {!isLoading && <ArrowRight className="size-4" />}
                    </Button>

                    {status && (
                      <p className="text-center text-sm font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3 mt-3">
                        {status}
                      </p>
                    )}

                    <p className="text-center text-xs text-zinc-500 mt-3">
                      Al registrarte aceptas recibir comunicaciones de MedMind
                      sobre este webinar.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 6. Footer */}
      <footer className="w-full border-t border-zinc-200 bg-white py-10">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="text-lg font-bold tracking-tight text-zinc-900">
              MedMind
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Webinar oficial · {dateText} · {timeText} (Perú)
            </p>
          </div>
          <div className="text-xs text-zinc-400">
            © {new Date().getFullYear()} MedMind. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </main>
  );
}
