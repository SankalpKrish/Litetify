import { useState, useCallback } from 'react';
import { getAutoQueueEnabled, setAutoQueueEnabled } from './autoQueue';

export function AutoQueueToggle() {
  const [enabled, setEnabled] = useState(getAutoQueueEnabled);

  const handleToggle = useCallback(() => {
    const newValue = !enabled;
    setEnabled(newValue);
    setAutoQueueEnabled(newValue);
  }, [enabled]);

  return (
    <button
      className={`ctrl-btn${enabled ? ' ctrl-btn-active' : ''}`}
      onClick={handleToggle}
      title={enabled ? 'Auto-queue: ON' : 'Auto-queue: OFF'}
      aria-label={enabled ? 'Disable auto-queue' : 'Enable auto-queue'}
      style={{
        color: enabled ? 'var(--lt-accent)' : 'var(--lt-fg-tertiary)',
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Lightning bolt icon for auto-queue */}
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    </button>
  );
}
