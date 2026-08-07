'use client';

import { useEffect } from 'react';

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const PHASES = ['Start', 'Plan', 'Prepare', 'Work'] as const;

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
    const chapters = Array.from(root.querySelectorAll<HTMLElement>('[data-motion-phase]'));
    const phaseItems = Array.from(root.querySelectorAll<HTMLElement>('[data-motion-phase-item]'));
    const rideScenes = Array.from(root.querySelectorAll<HTMLElement>('[data-ride-scene]'));
    const rideNodes = Array.from(root.querySelectorAll<HTMLElement>('[data-ride-node]'));
    const hero = root.querySelector<HTMLElement>('[data-scroll-hero]');
    const routePath = root.querySelector<SVGPathElement>('[data-route-master]');
    const traveler = root.querySelector<SVGGElement>('[data-route-traveler]');
    const routeLength = routePath?.getTotalLength() ?? 0;

    root.classList.add('landing-scroll-ready');

    let activeRideStep = -1;
    const updateRideStep = (nextStep: number) => {
      if (nextStep === activeRideStep) return;
      activeRideStep = nextStep;
      root.dataset.rideStep = String(nextStep + 1);
      rideScenes.forEach((scene, index) => scene.classList.toggle('is-current', index === nextStep));
      rideNodes.forEach((node, index) => {
        node.classList.toggle('is-current', index === nextStep);
        node.classList.toggle('is-reached', index <= nextStep);
        node.classList.toggle('is-past', index < nextStep);
      });
    };

    if (reducedMotion) {
      revealItems.forEach((item) => item.classList.add('is-visible'));
      updateRideStep(0);
      root.style.setProperty('--hero-progress', '0');
      root.style.setProperty('--page-progress', '.35');
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
    let targetPage = 0;
    let currentPage = 0;
    let targetHero = 0;
    let currentHero = 0;
    let direction = 1;
    const stageTargets = stages.map(() => 0);
    const stageCurrent = stages.map(() => 0);

    const renderProgress = () => {
      currentPage += (targetPage - currentPage) * 0.1;
      currentHero += (targetHero - currentHero) * 0.13;

      root.style.setProperty('--page-progress', currentPage.toFixed(4));
      root.style.setProperty('--hero-progress', currentHero.toFixed(4));
      root.style.setProperty('--scroll-direction', String(direction));
      root.style.setProperty('--scroll-energy', Math.min(1, Math.abs(targetPage - currentPage) * 22).toFixed(4));

      if (rideScenes.length) {
        const ridePosition = currentHero * (rideScenes.length - 1);
        const nextRideStep = Math.min(rideScenes.length - 1, Math.max(0, Math.round(ridePosition)));
        updateRideStep(nextRideStep);

        rideScenes.forEach((scene, index) => {
          const delta = index - ridePosition;
          const depth = Math.min(1, Math.abs(delta));
          const isPast = delta < 0;
          scene.style.setProperty('--ride-x', `${(delta * (isPast ? 30 : 38)).toFixed(2)}vw`);
          scene.style.setProperty('--ride-y', `${(depth * (isPast ? -8 : 12)).toFixed(2)}vh`);
          scene.style.setProperty('--ride-z', `${(-depth * 460).toFixed(2)}px`);
          scene.style.setProperty('--ride-scale', `${(isPast ? 1 + depth * 0.28 : 1 - depth * 0.18).toFixed(4)}`);
          scene.style.setProperty('--ride-tilt', `${(delta * -7).toFixed(2)}deg`);
          scene.style.setProperty('--ride-opacity', clamp(1 - Math.abs(delta) * 1.08).toFixed(4));
          scene.style.setProperty('--ride-blur', `${(depth * 8).toFixed(2)}px`);
        });
      }

      stages.forEach((stage, index) => {
        stageCurrent[index] += (stageTargets[index] - stageCurrent[index]) * 0.12;
        stage.style.setProperty('--section-progress', stageCurrent[index].toFixed(4));
      });

      if (routePath && traveler && routeLength) {
        const point = routePath.getPointAtLength(routeLength * currentPage);
        traveler.setAttribute('transform', `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`);
      }

      const unsettled = Math.abs(targetPage - currentPage) > 0.0004 ||
        Math.abs(targetHero - currentHero) > 0.0004 ||
        stageCurrent.some((value, index) => Math.abs(stageTargets[index] - value) > 0.0004);

      if (unsettled) frame = window.requestAnimationFrame(renderProgress);
      else frame = 0;
    };

    const requestRender = () => {
      if (!frame) frame = window.requestAnimationFrame(renderProgress);
    };

    const measureProgress = () => {
      const viewportHeight = window.innerHeight;
      const rootRect = root.getBoundingClientRect();
      const scrollableDistance = Math.max(rootRect.height - viewportHeight, 1);
      const nextPage = clamp(-rootRect.top / scrollableDistance);
      direction = nextPage >= targetPage ? 1 : -1;
      targetPage = nextPage;

      if (hero) {
        const rect = hero.getBoundingClientRect();
        targetHero = clamp(-rect.top / Math.max(rect.height - viewportHeight, 1));
      }

      stages.forEach((stage, index) => {
        const rect = stage.getBoundingClientRect();
        stageTargets[index] = clamp((viewportHeight * 0.84 - rect.top) / Math.max(rect.height + viewportHeight * 0.36, 1));
      });

      let activePhase = 0;
      let closestDistance = Number.POSITIVE_INFINITY;
      chapters.forEach((chapter, index) => {
        const rect = chapter.getBoundingClientRect();
        const distance = Math.abs(rect.top + Math.min(rect.height, viewportHeight) * 0.5 - viewportHeight * 0.5);
        if (distance < closestDistance) {
          closestDistance = distance;
          activePhase = index;
        }
      });
      root.dataset.activePhase = String(activePhase + 1);
      const progressIndex = targetHero < 0.995 && rideScenes.length
        ? Math.min(rideScenes.length - 1, Math.round(targetHero * (rideScenes.length - 1)))
        : activePhase;
      phaseItems.forEach((item, index) => item.classList.toggle('is-current', index === progressIndex));
      requestRender();
    };

    window.addEventListener('scroll', measureProgress, { passive: true });
    window.addEventListener('resize', measureProgress);
    measureProgress();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', measureProgress);
      window.removeEventListener('resize', measureProgress);
      if (frame) window.cancelAnimationFrame(frame);
      root.classList.remove('landing-scroll-ready');
    };
  }, []);

  return (
    <aside className="motion-progress" aria-hidden="true">
      <span className="motion-progress__eyebrow">Your route</span>
      <span className="motion-progress__line"><i /></span>
      <ol>
        {PHASES.map((phase, index) => (
          <li key={phase} data-motion-phase-item className={index === 0 ? 'is-current' : undefined}>
            <span>{String(index + 1).padStart(2, '0')}</span>{phase}
          </li>
        ))}
      </ol>
    </aside>
  );
}
