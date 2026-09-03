'use client'

import React, { useEffect } from 'react';
import { WebinarNavbar } from './webinar-navbar';
import { WebinarHero } from './webinar-hero';
import { WebinarDetailsBar } from './webinar-details-bar';
import { WebinarSpeakers } from './webinar-speakers';
import { WebinarAgenda } from './webinar-agenda';
import { WebinarTarget } from './webinar-target';
import { WebinarRegistrationForm } from './webinar-registration-form';
import { WebinarFAQ } from './webinar-faq';
import { WebinarFooter } from './webinar-footer';

export interface MedmindEventDetailProps {
  institution: string;
  event: any;
  edition: any;
  speakers: any[];
  activities: any[];
  form: any;
  heroImage: string;
  heroVideo?: string;
  apiUrl: string;
}

export function MedmindEventDetail({
  institution,
  event,
  edition,
  speakers = [],
  activities = [],
  form,
  heroImage,
  heroVideo,
  apiUrl,
}: MedmindEventDetailProps) {
  // Pass runtime portal config to window for API calls
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__PORTAL_API_URL__ = apiUrl;
      if (form?.slug) {
        (window as any).__PORTAL_FORM_SLUG__ = form.slug;
      }
    }
  }, [apiUrl, form]);

  const startDate = edition?.startDate || event?.startDate;
  const date = startDate ? new Date(startDate) : null;
  const dateLabel = date
    ? date.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
    : '7 de setiembre, 2026';
  const dayLabel = date
    ? date.toLocaleDateString('es-PE', { weekday: 'long' }).replace(/^\w/, (c) => c.toUpperCase())
    : 'Lunes';
  const timeLabel = date
    ? date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : '8:00 PM (Perú)';
  const modality = (edition?.modality || event?.eventMode || '100% Online').replace('_', ' ');
  const description = edition?.description || event?.details?.content || event?.description;

  return (
    <div className="medmind-webinar-detail min-h-screen bg-background text-foreground font-sans selection:bg-medmind-primary selection:text-white">
      {/* 1. Sticky Navigation Bar */}
      <WebinarNavbar
        institution={institution}
        hasSpeakers={speakers.length > 0}
        hasAgenda={activities.length > 0}
      />

      {/* 2. Hero Section with Live Badge, Event Info and Mascot / Art */}
      <WebinarHero
        title={event?.eventName}
        description={description}
        dateLabel={dateLabel}
        timeLabel={timeLabel}
        dayLabel={dayLabel}
        modality={modality}
        heroImage={heroImage}
        heroVideo={heroVideo}
      />

      {/* 3. Event Details Quick Bar */}
      <WebinarDetailsBar
        dateValue={dateLabel}
        dateSub={dayLabel}
        timeValue={timeLabel}
        timeSub="Hora Perú / Colombia (GMT-5)"
        modalityValue={modality}
        modalitySub="Transmisión en vivo + Q&A"
        investmentValue={form ? 'Gratuito' : 'Próximamente'}
        investmentSub={form ? 'Acceso libre con reserva previa' : 'Registro por habilitarse'}
      />

      {/* 4. Speakers Section */}
      <WebinarSpeakers speakers={speakers} />

      {/* 5. Agenda & Modules Section */}
      <WebinarAgenda activities={activities} />

      {/* 6. Target Audience Section */}
      <WebinarTarget />

      {/* 7. Registration Section with Live Form / Celebratory Success State */}
      <WebinarRegistrationForm
        formSlug={form?.slug}
        apiUrl={apiUrl}
        dateLabel={dateLabel}
        timeLabel={timeLabel}
        eventTitle={event?.eventName}
      />

      {/* 8. Frequently Asked Questions Accordion */}
      <WebinarFAQ />

      {/* 9. Minimalist Branded Footer */}
      <WebinarFooter
        institution={institution}
        eventName={event?.eventName}
        dateLabel={`${dateLabel} · ${timeLabel}`}
      />
    </div>
  );
}
