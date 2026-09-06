import { LogoMark } from './LogoMark';
import styles from './BrandSpinner.module.css';

export interface BrandSpinnerProps {
  size?: 'sm' | 'lg';
  label?: string;
}

export function BrandSpinner({
  size = 'lg',
  label = 'Loading',
}: BrandSpinnerProps) {
  const compact = size === 'sm';

  return (
    <div
      className={`${styles.spinner}${compact ? ` ${styles.sm}` : ''}`}
      role="status"
      aria-label={label}
    >
      <span className={styles.ring} aria-hidden="true">
        <svg viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="21" />
          <circle className={styles.arc} cx="24" cy="24" r="21" />
        </svg>
      </span>
      <span className={styles.mark} aria-hidden="true">
        <LogoMark
          size={compact ? 24 : 84}
          variant={compact ? 'solid' : 'detail'}
          decorative
        />
      </span>
    </div>
  );
}
