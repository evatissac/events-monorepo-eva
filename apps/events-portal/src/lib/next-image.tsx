import React from 'react';

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  width?: number | string;
  height?: number | string;
}

export const Image: React.FC<ImageProps> = ({
  src,
  alt = '',
  fill,
  priority,
  sizes,
  width,
  height,
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
      width={width}
      height={height}
      className={className}
      style={fillStyles}
      loading={priority ? 'eager' : 'lazy'}
      {...props}
    />
  );
};

export default Image;
