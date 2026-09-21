import React from 'react';

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

export default Link;
