import { memo, useId } from 'react';

const FEATHER_PATH =
  'M88 10 C101 34 98 60 72 82 C60 92 38 95 28 96 C30 82 38 64 52 48 C62 37 76 20 88 10 Z';
const SPINE_PATH =
  'M29.68 92.1 L69.64 33.78 L73.14 29.03 L76.87 24.44 L80.63 19.88 L83.07 16.79 L84.82 14.42 L85.67 13.22 L84.85 14.44 L83.27 16.93 L81.27 20.32 L78.37 25.48 L75.44 30.61 L72.28 35.58 L32.32 93.9 Z';
const QUILL_PATH = 'M28 96 L20 106';
const BARB_PATHS = [
  'M41 78 L56 75',
  'M48 68 L63 65',
  'M55 58 L70 55',
  'M62 48 L75 45',
  'M69 37 L81 34',
] as const;

export type LogoMarkVariant = 'detail' | 'solid' | 'glyph';

export interface LogoMarkProps {
  size?: number;
  variant?: LogoMarkVariant;
  decorative?: boolean;
  title?: string;
  className?: string;
}

function variantForSize(size: number): LogoMarkVariant {
  if (size >= 40) return 'detail';
  if (size >= 20) return 'solid';
  return 'glyph';
}

export const LogoMark = memo(function LogoMark({
  size = 64,
  variant,
  decorative = false,
  title = 'Litetify',
  className,
}: LogoMarkProps) {
  const reactId = useId();
  const clipId = `litetify-feather-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const resolved = variant ?? variantForSize(size);
  const showSpine = resolved !== 'glyph';
  const showBarbs = resolved === 'detail';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      className={className}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
    >
      {showSpine && (
        <defs>
          <clipPath id={clipId}>
            <path d={FEATHER_PATH} />
          </clipPath>
        </defs>
      )}
      <path d={FEATHER_PATH} fill="#FFFFFF" />
      {showSpine && (
        <g clipPath={`url(#${clipId})`}>
          <g fill="#56606D">
            <circle cx="31" cy="93" r="1.6" />
            <path d={SPINE_PATH} />
          </g>
          {showBarbs && (
            <g stroke="#000000" strokeWidth={2} strokeLinecap="round">
              {BARB_PATHS.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
          )}
        </g>
      )}
      {showBarbs && (
        <path
          d={QUILL_PATH}
          stroke="#FFFFFF"
          strokeWidth={5}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
});
