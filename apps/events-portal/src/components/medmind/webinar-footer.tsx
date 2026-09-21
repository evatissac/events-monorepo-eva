'use client'

import Link from 'next/link'
import { LogoRender } from '@/components/app/logo-render'

export interface WebinarFooterProps {
    institution?: string;
    eventName?: string;
    dateLabel?: string;
}

export function WebinarFooter({
    institution = 'medmind',
    eventName,
    dateLabel = '7 de setiembre de 2026 · 8:00 PM (Perú)',
}: WebinarFooterProps) {
    return (
        <footer className="w-full py-12 bg-background border-t border-border">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center">
                <Link href={`/${institution}`} className="inline-flex items-center mb-3">
                    <LogoRender
                        variant="full"
                        className="w-28 text-foreground"
                        classNameImg="text-foreground"
                    />
                </Link>
                <p className="text-xs sm:text-sm text-muted-foreground font-light">
                    {eventName ? `${eventName} · ` : 'Webinar gratuito · '}{dateLabel}
                </p>
            </div>
        </footer>
    )
}
