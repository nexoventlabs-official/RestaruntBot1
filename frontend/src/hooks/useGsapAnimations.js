import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Fade in from bottom animation
export function useFadeInUp(options = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        element,
        {
          y: 60,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: options.duration || 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: element,
            start: options.start || 'top 85%',
            end: options.end || 'bottom 20%',
            toggleActions: 'play none none reverse',
            ...options.scrollTrigger,
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return ref;
}

// Fade in from left animation
export function useFadeInLeft(options = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        element,
        {
          x: -60,
          opacity: 0,
        },
        {
          x: 0,
          opacity: 1,
          duration: options.duration || 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: element,
            start: options.start || 'top 85%',
            toggleActions: 'play none none reverse',
            ...options.scrollTrigger,
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return ref;
}

// Fade in from right animation
export function useFadeInRight(options = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        element,
        {
          x: 60,
          opacity: 0,
        },
        {
          x: 0,
          opacity: 1,
          duration: options.duration || 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: element,
            start: options.start || 'top 85%',
            toggleActions: 'play none none reverse',
            ...options.scrollTrigger,
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return ref;
}

// Scale up animation
export function useScaleIn(options = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        element,
        {
          scale: 0.8,
          opacity: 0,
        },
        {
          scale: 1,
          opacity: 1,
          duration: options.duration || 0.8,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: element,
            start: options.start || 'top 85%',
            toggleActions: 'play none none reverse',
            ...options.scrollTrigger,
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return ref;
}

// Stagger children animation
export function useStaggerChildren(options = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const children = element.children;
    if (!children.length) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        children,
        {
          y: 40,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: options.duration || 0.6,
          stagger: options.stagger || 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: element,
            start: options.start || 'top 85%',
            toggleActions: 'play none none reverse',
            ...options.scrollTrigger,
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return ref;
}

// Parallax effect
export function useParallax(speed = 0.5) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const ctx = gsap.context(() => {
      gsap.to(element, {
        y: () => window.innerHeight * speed * -1,
        ease: 'none',
        scrollTrigger: {
          trigger: element,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    });

    return () => ctx.revert();
  }, [speed]);

  return ref;
}

// Text reveal animation
export function useTextReveal(options = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        element,
        {
          clipPath: 'inset(0 100% 0 0)',
          opacity: 0,
        },
        {
          clipPath: 'inset(0 0% 0 0)',
          opacity: 1,
          duration: options.duration || 1.2,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: element,
            start: options.start || 'top 85%',
            toggleActions: 'play none none reverse',
            ...options.scrollTrigger,
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return ref;
}

export default {
  useFadeInUp,
  useFadeInLeft,
  useFadeInRight,
  useScaleIn,
  useStaggerChildren,
  useParallax,
  useTextReveal,
};
