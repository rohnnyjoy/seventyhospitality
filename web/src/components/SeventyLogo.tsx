import type { CSSProperties } from 'react';

type SeventyLogoProps = {
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
};

export function SeventyLogo({
  size = 32,
  color = 'rgb(61, 83, 65)',
  className,
  style,
}: SeventyLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 396 492"
      fill="none"
      className={className}
      style={style}
      aria-label="Seventy"
    >
      <path
        d="M240.489 156H260L72.5106 492H53L240.489 156Z"
        fill={color}
      />
      <path
        d="M0 156V171.896H247.599V156H0Z"
        fill={color}
      />
      <path
        d="M378.806 155.5C378.806 78.8393 316.661 16.6936 240 16.6936C163.339 16.6937 101.194 78.8394 101.194 155.5C101.194 232.161 163.339 294.306 240 294.306V311L238.995 310.997C153.912 310.458 85.0421 241.589 84.5031 156.506L84.5 155.5C84.5001 69.6198 154.12 8.52434e-05 240 0L241.006 0.0031052C326.423 0.544215 395.5 69.9553 395.5 155.5L395.497 156.506C394.956 241.924 325.545 311 240 311V294.306C316.661 294.306 378.806 232.161 378.806 155.5Z"
        fill={color}
      />
    </svg>
  );
}
