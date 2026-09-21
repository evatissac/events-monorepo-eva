'use client'

import { Calendar, Clock, Video, Award } from 'lucide-react'

export interface WebinarDetailsBarProps {
    dateValue?: string;
    dateSub?: string;
    timeValue?: string;
    timeSub?: string;
    modalityValue?: string;
    modalitySub?: string;
    investmentValue?: string;
    investmentSub?: string;
}

export function WebinarDetailsBar({
    dateValue = 'Lunes 7 de Setiembre',
    dateSub = '2026',
    timeValue = '8:00 PM',
    timeSub = 'Hora Perú / Colombia (GMT-5)',
    modalityValue = 'En Vivo',
    modalitySub = 'Zoom Privado + Q&A',
    investmentValue = 'Gratuito',
    investmentSub = 'Acceso libre con registro',
}: WebinarDetailsBarProps) {
    const details = [
        {
            icon: Calendar,
            label: 'Fecha',
            value: dateValue,
            sub: dateSub
        },
        {
            icon: Clock,
            label: 'Hora',
            value: timeValue,
            sub: timeSub
        },
        {
            icon: Video,
            label: 'Modalidad',
            value: modalityValue,
            sub: modalitySub
        },
        {
            icon: Award,
            label: 'Inversión',
            value: investmentValue,
            sub: investmentSub
        }
    ]

    return (
        <section id="detalles" className="w-full py-10 bg-muted/40 border-y border-border/60">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                    {details.map((item, idx) => {
                        const Icon = item.icon
                        return (
                            <div
                                key={idx}
                                className="flex flex-col items-start p-4 rounded-xl border border-border/60 bg-background shadow-none"
                            >
                                <div className="p-2.5 rounded-lg bg-medmind-cyan/10 text-medmind-cyan mb-3">
                                    <Icon className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                    {item.label}
                                </span>
                                <span className="text-base sm:text-lg font-semibold text-foreground mt-0.5">
                                    {item.value}
                                </span>
                                <span className="text-xs text-muted-foreground font-light mt-0.5">
                                    {item.sub}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
