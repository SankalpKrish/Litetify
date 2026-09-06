import { useEffect, useRef } from 'react';
import type { FC } from 'react';

interface MountProps {
  mount: (el: HTMLElement) => void;
  unmount?: () => void;
}

export const MountContainer: FC<MountProps> = ({ mount, unmount }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (ref.current) mount(ref.current);
    return () => unmount?.();
  }, [mount, unmount]);
  return <div ref={ref} className="mod-app-container" />;
};

export const HtmlContainer: FC<{ html: string }> = ({ html }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = html;
  }, [html]);
  return <div ref={ref} className="mod-app-container" />;
};
