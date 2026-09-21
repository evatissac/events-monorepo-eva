'use client'

export interface ActivityItem {
    id?: string;
    title: string;
    description?: string;
    startsAt?: string;
}

export interface WebinarAgendaProps {
    activities?: ActivityItem[];
}

export function WebinarAgenda({ activities }: WebinarAgendaProps) {
    const defaultModules = [
        {
            num: '1',
            title: 'El punto de partida real',
            desc: 'Qué significa hoy tener menos de 13 y qué margen de tiempo tienes realmente antes del RM 2027.'
        },
        {
            num: '2',
            title: 'Prioridades de estudio',
            desc: 'En qué enfocar tus horas de estudio para que sumen puntaje donde más importa.'
        },
        {
            num: '3',
            title: 'Errores que restan puntos',
            desc: 'Los errores más comunes de quienes postulan sin una estructura clara.'
        },
        {
            num: '4',
            title: 'Tu plan de acción',
            desc: 'Los siguientes pasos concretos para ordenar tu preparación desde esta semana.'
        }
    ];

    const modules = activities && activities.length > 0
        ? activities.map((act, index) => ({
            num: String(index + 1),
            title: act.title,
            desc: act.description || 'Sesión temática enfocada en estrategias prácticas y resolución de casos.',
        }))
        : defaultModules;

    return (
        <section id="temario" className="w-full py-16 md:py-24 bg-muted/20 border-b border-border/60">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="max-w-3xl mb-12 sm:mb-16 text-left">
                    <span className="text-medmind-cyan text-xs sm:text-sm tracking-widest uppercase font-mono font-medium block mb-2">
                        AGENDA & BENEFICIOS
                    </span>
                    <h2 className="text-2xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground uppercase leading-tight mb-4">
                        ¿QUÉ TE LLEVAS DE ESTE <span className="text-[#00b49d]">WEBINAR?</span>
                    </h2>
                    <p className="text-sm sm:text-base text-muted-foreground font-normal leading-relaxed">
                        Contenido pensado para que salgas con un plan claro, no solo con más información.
                    </p>
                </div>

                {/* Modules Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                    {modules.map((m, idx) => {
                        return (
                            <div
                                key={idx}
                                className="p-6 sm:p-8 rounded-3xl border border-sky-500/20 dark:border-sky-500/25 bg-sky-500/[0.08] dark:bg-sky-500/10 flex items-start gap-5 shadow-none group transition-colors"
                            >
                                <div className="shrink-0 w-11 h-11 rounded-2xl bg-sky-500/20 text-sky-700 dark:text-sky-300 font-bold font-mono text-base flex items-center justify-center">
                                    {m.num}
                                </div>

                                <div>
                                    <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 leading-snug">
                                        {m.title}
                                    </h3>

                                    <p className="text-sm text-muted-foreground font-light leading-relaxed">
                                        {m.desc}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>

            </div>
        </section>
    )
}
