import { useEffect } from 'react';
import type { ThemePref } from '../data/types';

/** Applies the theme preference to <html> and mirrors it for first paint. */
export function useApplyTheme(pref: ThemePref) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = pref === 'dark' || (pref === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? '#171917' : '#f7f5f0');
    };
    apply();
    try {
      localStorage.setItem('theme', pref);
    } catch {
      /* storage unavailable: theme still applies for this session */
    }
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [pref]);
}
