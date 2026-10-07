'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * One lightweight motion director for product pages: the top-level sections
 * of each page arrive in a short sequence as they scroll into view. Landing
 * and onboarding own their more elaborate choreography already.
 */
export function AppExperience() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('#main-content .workspace-shell');
    if (!root || root.querySelector('.landing-constellation, .onboarding-experience')) return;

    const page = root.firstElementChild as HTMLElement | null;
    if (!page) return;

    page.classList.add('app-motion-page');
    const chapters = Array.from(page.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
    chapters.forEach((chapter, index) => {
      chapter.dataset.appReveal = '';
      chapter.style.setProperty('--app-reveal-delay', `${Math.min(index, 5) * 55}ms`);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).classList.add('is-app-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.06, rootMargin: '0px 0px -7% 0px' },
    );
    chapters.forEach((chapter) => observer.observe(chapter));

    return () => {
      observer.disconnect();
      chapters.forEach((chapter) => {
        delete chapter.dataset.appReveal;
        chapter.classList.remove('is-app-visible');
        chapter.style.removeProperty('--app-reveal-delay');
      });
      page.classList.remove('app-motion-page');
    };
  }, [pathname]);

  return null;
}
