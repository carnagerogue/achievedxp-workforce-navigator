'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * One lightweight motion director for authenticated product pages. It reveals
 * page-level chapters in sequence and moves the small route marker with scroll.
 * Landing and onboarding own their more elaborate choreography already.
 */
export function AppExperience() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('#main-content .workspace-shell');
    if (!root || root.querySelector('.landing-constellation, .onboarding-experience')) return;

    const page = root.firstElementChild as HTMLElement | null;
    if (!page) return;

    document.body.classList.add('app-motion-ready');
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

    let frame = 0;
    const updateProgress = () => {
      frame = 0;
      const maximum = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      document.body.style.setProperty('--app-scroll-progress', String(Math.min(Math.max(window.scrollY / maximum, 0), 1)));
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateProgress);
    };
    updateProgress();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      chapters.forEach((chapter) => {
        delete chapter.dataset.appReveal;
        chapter.classList.remove('is-app-visible');
        chapter.style.removeProperty('--app-reveal-delay');
      });
      page.classList.remove('app-motion-page');
      document.body.classList.remove('app-motion-ready');
      document.body.style.removeProperty('--app-scroll-progress');
    };
  }, [pathname]);

  return (
    <div className="app-route-atmosphere" aria-hidden="true">
      <i />
      <span />
    </div>
  );
}
