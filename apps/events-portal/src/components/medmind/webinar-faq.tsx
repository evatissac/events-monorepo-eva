'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

export function WebinarFAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(0)

    const faqs = [
        {
            q: '¿Tiene algún costo participar en este webinar?',
            a: 'No, el acceso al webinar es 100% gratuito. Solo requieres registrarte con tus datos para recibir el enlace exclusivo de la sala de Zoom y el material descargable.'
        },
        {
            q: '¿Quedará grabada la sesión si estoy de guardia o en turno hospitalario?',
            a: 'Sí, enviaremos la grabación temporalmente a todos los inscritos. Sin embargo, recomendamos asistir en vivo para participar en la ronda de preguntas y acceder a los bonos especiales que solo se compartirán en directo.'
        },
        {
            q: '¿Cómo y cuándo recibiré el enlace de acceso a Zoom?',
            a: 'El enlace te llegará automáticamente a tu correo electrónico y a través del canal VIP de WhatsApp 24 horas y 1 hora antes del inicio del evento.'
        },
        {
            q: '¿Puedo hacer preguntas sobre mi método de estudio o mis puntajes actuales?',
            a: '¡Por supuesto! Hemos reservado 20 minutos dedicados a analizar dudas reales y casos de estudio de los asistentes en vivo.'
        },
        {
            q: '¿Qué necesito tener a la mano para aprovechar la clase al máximo?',
            a: 'Te recomendamos estar en un lugar tranquilo con buena conexión a internet y tener libreta de notas o tu tablet para registrar los esquemas prácticos que compartiremos.'
        }
    ]

    const toggle = (idx: number) => {
        setOpenIndex(openIndex === idx ? null : idx)
    }

    return (
        <section id="faqs" className="w-full py-16 md:py-24 bg-muted/20 border-b border-border/60">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                
                <div className="max-w-3xl mb-12 sm:mb-16">
                    <span className="text-medmind-cyan text-xs sm:text-sm tracking-widest uppercase font-mono font-medium block mb-2">
                        DUDAS COMUNES
                    </span>
                    <h2 className="text-2xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground uppercase leading-tight mb-4">
                        PREGUNTAS <span className="text-[#00b49d]">FRECUENTES</span>
                    </h2>
                    <p className="text-sm sm:text-base text-muted-foreground font-normal leading-relaxed">
                        Todo lo que necesitas saber antes de la transmisión en vivo.
                    </p>
                </div>

                <div className="max-w-3xl space-y-4">
                    {faqs.map((item, idx) => {
                        const isOpen = openIndex === idx
                        return (
                            <div
                                key={idx}
                                className="rounded-xl border border-border bg-background overflow-hidden shadow-none transition-colors"
                            >
                                <button
                                    onClick={() => toggle(idx)}
                                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                                >
                                    <span className="text-base sm:text-lg font-medium text-foreground">
                                        {item.q}
                                    </span>
                                    <motion.span
                                        animate={{ rotate: isOpen ? 180 : 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="text-muted-foreground shrink-0"
                                    >
                                        <ChevronDown className="w-5 h-5" />
                                    </motion.span>
                                </button>

                                <AnimatePresence initial={false}>
                                    {isOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.25 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-5 pb-6 sm:px-6 sm:pb-6 text-sm sm:text-base text-muted-foreground font-light leading-relaxed border-t border-border/40 pt-4">
                                                {item.a}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )
                    })}
                </div>

            </div>
        </section>
    )
}
