import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { prepareApp } from './boot';
import { initMods } from './mods';
import './styles/global.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function hideSpinner(): Promise<void> {
  const spinner = document.querySelector('#boot .spinner');
  if (!(spinner instanceof HTMLElement)) return Promise.resolve();
  if (reduceMotion.matches) {
    spinner.style.opacity = '0';
    return Promise.resolve();
  }
  spinner.style.transition = 'opacity 200ms ease';
  void spinner.offsetWidth;
  spinner.style.opacity = '0';
  return new Promise((resolve) => {
    let settled = false;
    const done = (): void => {
      if (settled) return;
      settled = true;
      resolve();
    };
    spinner.addEventListener('transitionend', done, { once: true });
    window.setTimeout(done, 250);
  });
}

function dismissBoot(): void {
  const boot = document.getElementById('boot');
  if (!boot) return;
  const remove = (): void => boot.remove();
  if (reduceMotion.matches) {
    remove();
    return;
  }
  boot.style.transition = 'opacity 400ms ease';
  boot.style.opacity = '0';
  boot.addEventListener('transitionend', (event) => {
    if (event.target === boot) remove();
  });
  window.setTimeout(remove, 500);
}

prepareApp()
  .catch(() => 'unauthenticated' as const)
  .then(async (auth) => {
    await hideSpinner();
    if (auth === 'authenticated') {
      await Promise.allSettled([
        initMods(),
        import('./features/browse/HomeView'),
      ]);
    }
    createRoot(rootEl).render(
      <StrictMode>
        <App initialAuth={auth} />
      </StrictMode>,
    );
    requestAnimationFrame(() => requestAnimationFrame(dismissBoot));
  });
