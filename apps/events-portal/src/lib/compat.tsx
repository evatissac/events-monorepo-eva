import React, { useState, useEffect } from 'react';

export const Link = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>(
  ({ href, children, className, ...props }, ref) => {
    return (
      <a href={href} ref={ref} className={className} {...props}>
        {children}
      </a>
    );
  }
);
Link.displayName = 'Link';

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
}

export const Image: React.FC<ImageProps> = ({
  src,
  alt = '',
  fill,
  priority,
  sizes,
  className = '',
  style,
  ...props
}) => {
  const fillStyles: React.CSSProperties = fill
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        ...style,
      }
    : style || {};

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={fillStyles}
      loading={priority ? 'eager' : 'lazy'}
      {...props}
    />
  );
};

export function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setThemeState(isDark ? 'dark' : 'light');
  }, []);

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    const root = document.documentElement;
    root.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('events-portal-theme', newTheme);
  };

  return { theme, setTheme };
}
