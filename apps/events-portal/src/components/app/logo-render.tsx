import React from 'react';

interface LogoRenderProps {
  variant?: 'full' | 'icon';
  className?: string;
  classNameImg?: string;
}

export const LogoRender: React.FC<LogoRenderProps> = ({
  className = 'w-28',
  classNameImg = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src="/medmind/logo_medmind.svg"
        alt="MedMind"
        className={`h-8 w-auto object-contain ${classNameImg}`}
      />
    </div>
  );
};
