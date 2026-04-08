import type { CSSProperties } from 'react';

type SeventyLogoProps = {
  size?: number;
  className?: string;
  style?: CSSProperties;
};

export function SeventyLogo({
  size = 32,
  className,
  style,
}: SeventyLogoProps) {
  return (
    <svg
      width={size}
      height={size * (104 / 85)}
      viewBox="3 1 88 104"
      fill="none"
      className={className}
      style={style}
      aria-label="Seventy"
    >
      <defs>
        <clipPath id="seventy-clip">
          <rect x="0" y="0" width="91" height="105" />
        </clipPath>
      </defs>
      <circle cx="56" cy="36" r="30" stroke="var(--octa-text)" strokeWidth="9" fill="none" />
      <path
        d="M 8,36 L 56,36 L 20,105"
        stroke="var(--octa-text)"
        strokeWidth="9"
        strokeLinejoin="miter"
        strokeLinecap="square"
        fill="none"
        clipPath="url(#seventy-clip)"
      />
    </svg>
  );
}
