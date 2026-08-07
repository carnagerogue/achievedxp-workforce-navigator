'use client';

import { useEffect } from 'react';

const clamp = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Adds a single, coordinated motion system to the landing page. Elements
 * reveal only after client hydration, while section and hero progress values
 * drive the route-line and constellation parallax effects.
 */
export function LandingScrollEffects() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-landing-scroll]');
    if (!root) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealItems = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    const stages = Array.from(root.querySelectorAll<HTMLElement>('[data-scroll-stage]'));
    const hero = root.querySelector<HTMLElement>('[data-scroll-hero]');

    root.classList.add('landing-scroll-ready');

    if (reducedMotion) {
      revealItems.forEach((item) => item.classList.add('is-visible'));
      root.style.setProperty('--hero-progress', '0');
      stages.forEach((stage) => stage.style.setProperty('--section-progress', '1'));
      return () => root.classList.remove('landing-scroll-ready');
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -7% 0px' },
    );

    revealItems.forEach((item) => observer.observe(item));

    let frame = 0;
    const updateProgress = () => {
      frame = 0;
      const viewportHeight = window.innerHeight;

      if (hero) {
        const rect = hero.getBoundingClientRect();
        const progress = clamp(-rect.top / Math.max(rect.height * 0.82, 1));
        root.style.setProperty('--hero-progress', progress.toFixed(4));
      }

      stages.forEach((stage) => {
        const rect = stage.getBoundingClientRect();
        const progress = clamp((viewportHeight * 0.84 - rect.top) / Math.max(rect.height + viewportHeight * 0.36, 1));
        stage.style.setProperty('--section-progress', progress.toFixed(4));
      });
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateProgress);
    };

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    updateProgress();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
      root.classList.remove('landing-scroll-ready');
    };
  }, []);

  return null;
}
