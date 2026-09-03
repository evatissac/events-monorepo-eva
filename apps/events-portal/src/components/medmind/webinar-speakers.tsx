'use client'

import Image from 'next/image'

export interface SpeakerItem {
    id?: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
    avatarUrl?: string;
}

export interface WebinarSpeakersProps {
    speakers?: SpeakerItem[];
}

export function WebinarSpeakers({ speakers }: WebinarSpeakersProps) {
    const hasDynamicSpeakers = speakers && speakers.length > 0;

    return (
        <section id="mentores" className="w-full py-16 md:py-24 bg-background border-b border-border/60 relative overflow-hidden">
            {/* Ambient subtle glow behind speakers */}
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[300px] bg-[#00b49d]/5 blur-[140px] pointer-events-none rounded-full" />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                
                {/* Section Title & Subtitle - Left Aligned */}
                <div className="max-w-3xl mb-12 sm:mb-16 text-left">
                    <span className="text-[#00a2b6] text-xs sm:text-sm tracking-widest uppercase font-mono font-medium block mb-2">
                        EXPOSITORES
                    </span>
                    <h2 className="text-2xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground uppercase leading-tight mb-4">
                        ¿QUIÉNES TE ACOMPAÑARÁN EN ESTE <span className="text-[#00b49d]">WEBINAR?</span>
                    </h2>
                    <p className="text-sm sm:text-base text-muted-foreground font-normal leading-relaxed">
                        Especialistas médicos con experiencia real y resultados comprobados, listos para compartir su estrategia y resolver tus dudas en vivo.
                    </p>
                </div>

                {/* Speakers Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
                    {hasDynamicSpeakers ? (
                        speakers.map((speaker, idx) => {
                            const name = [speaker.firstName, speaker.lastName].filter(Boolean).join(' ') || 'Ponente invitado';
                            const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
                            return (
                                <div key={speaker.id || idx} className="flex flex-row items-start justify-between gap-5 sm:gap-6 text-left p-6 rounded-2xl border border-border/60 bg-card/40">
                                    <div className="flex-1 space-y-2">
                                        <div>
                                            <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                                                {name}
                                            </h3>
                                            <p className="text-xs sm:text-sm font-mono font-medium text-[#00b49d] tracking-wide uppercase mt-1">
                                                Médico/a · MedMind
                                            </p>
                                        </div>

                                        <div className="space-y-1.5 text-xs sm:text-sm text-muted-foreground font-light leading-relaxed pt-1">
                                            <p className="font-medium text-foreground">
                                                {speaker.bio || 'Expositor/a invitado para compartir metodología práctica y resolución de casos.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-[#00b49d]/30 shrink-0 bg-muted flex items-center justify-center">
                                        {speaker.avatarUrl ? (
                                            <img
                                                src={speaker.avatarUrl}
                                                alt={name}
                                                className="w-full h-full object-cover object-top"
                                            />
                                        ) : (
                                            <span className="font-mono text-xl font-bold text-[#00b49d]">{initials}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <>
                            {/* Speaker 1: Dra. María Reneé Montesinos */}
                            <div className="flex flex-row items-start justify-between gap-5 sm:gap-6 text-left">
                                <div className="flex-1 space-y-2">
                                    <div>
                                        <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                                            Dra. Maria Reneé Montesinos
                                        </h3>
                                        <p className="text-xs sm:text-sm font-mono font-medium text-[#00b49d] tracking-wide uppercase mt-1">
                                            Médica · Cofundadora de MedMind
                                        </p>
                                    </div>

                                    <div className="space-y-1.5 text-xs sm:text-sm text-muted-foreground font-light leading-relaxed pt-1">
                                        <p className="font-medium text-foreground">
                                            Ingresó al Residentado en su primera postulación mientras trabajaba.
                                        </p>
                                        <p className="text-xs text-foreground/80 font-mono">
                                            2.º puesto ENAM · Internado Rebagliati · Cardiología INCOR
                                        </p>
                                    </div>
                                </div>

                                <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden border-2 border-[#00b49d]/30 shadow-md shrink-0 bg-muted flex items-center justify-center">
                                    <Image
                                        src="/media/maria_rene.jpg"
                                        alt="Dra. Maria Reneé Montesinos"
                                        fill
                                        sizes="(max-width: 768px) 112px, 128px"
                                        className="object-cover object-top"
                                        priority
                                    />
                                </div>
                            </div>

                            {/* Speaker 2: Diego */}
                            <div className="flex flex-row items-start justify-between gap-5 sm:gap-6 text-left">
                                <div className="flex-1 space-y-2">
                                    <div>
                                        <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                                            Diego
                                        </h3>
                                        <p className="text-xs sm:text-sm font-mono font-medium text-[#00a2b6] tracking-wide uppercase mt-1">
                                            Médico · Cofundador de MedMind
                                        </p>
                                    </div>

                                    <div className="space-y-1.5 text-xs sm:text-sm text-muted-foreground font-light leading-relaxed pt-1">
                                        <p className="font-medium text-foreground">
                                            Pasó de no ingresar a alcanzar el 1.er puesto nacional.
                                        </p>
                                        <p className="text-xs text-foreground/80 font-mono">
                                            1.er puesto nacional · Internado Rebagliati · Cardiología INCOR
                                        </p>
                                    </div>
                                </div>

                                <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden border-2 border-[#00a2b6]/30 shadow-md shrink-0 bg-muted flex items-center justify-center">
                                    <Image
                                        src="/media/diego.jpg"
                                        alt="Diego"
                                        fill
                                        sizes="(max-width: 768px) 112px, 128px"
                                        className="object-cover object-top"
                                        priority
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>

            </div>
        </section>
    )
}
