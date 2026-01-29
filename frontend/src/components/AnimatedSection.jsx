import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Animation variants
const animations = {
  fadeUp: {
    from: { y: 60, opacity: 0 },
    to: { y: 0, opacity: 1 },
  },
  fadeDown: {
    from: { y: -60, opacity: 0 },
    to: { y: 0, opacity: 1 },
  },
  fadeLeft: {
    from: { x: -60, opacity: 0 },
    to: { x: 0, opacity: 1 },
  },
  fadeRight: {
    from: { x: 60, opacity: 0 },
    to: { x: 0, opacity: 1 },
  },
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  scaleIn: {
    from: { scale: 0.8, opacity: 0 },
    to: { scale: 1, opacity: 1 },
  },
  rotateIn: {
    from: { rotation: -10, opacity: 0, scale: 0.9 },
    to: { rotation: 0, opacity: 1, scale: 1 },
  },
};

export default function AnimatedSection({
  children,
  animation = 'fadeUp',
  duration = 1,
  delay = 0,
  ease = 'power3.out',
  start = 'top 85%',
  stagger = 0,
  className = '',
  as: Component = 'div',
  ...props
}) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const anim = animations[animation] || animations.fadeUp;
    const targets = stagger > 0 ? element.children : element;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        anim.from,
        {
          ...anim.to,
          duration,
          delay,
          ease,
          stagger: stagger > 0 ? stagger : 0,
          scrollTrigger: {
            trigger: element,
            start,
            toggleActions: 'play none none reverse',
          },
        }
      );
    });

    return () => ctx.revert();
  }, [animation, duration, delay, ease, start, stagger]);

  return (
    <Component ref={ref} className={className} {...props}>
      {children}
    </Component>
  );
}

// Parallax component for background images
export function ParallaxSection({
  children,
  speed = 0.3,
  className = '',
  as: Component = 'div',
  ...props
}) {
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

  return (
    <Component ref={ref} className={className} {...props}>
      {children}
    </Component>
  );
}

// Text reveal animation
export function TextReveal({
  children,
  duration = 1.2,
  delay = 0,
  start = 'top 85%',
  className = '',
  as: Component = 'div',
  ...props
}) {
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
          duration,
          delay,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: element,
            start,
            toggleActions: 'play none none reverse',
          },
        }
      );
    });

    return () => ctx.revert();
  }, [duration, delay, start]);

  return (
    <Component ref={ref} className={className} {...props}>
      {children}
    </Component>
  );
}

// Counter animation
export function AnimatedCounter({
  end,
  duration = 2,
  start = 'top 85%',
  suffix = '',
  prefix = '',
  className = '',
}) {
  const ref = useRef(null);
  const countRef = useRef({ value: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const ctx = gsap.context(() => {
      gsap.to(countRef.current, {
        value: end,
        duration,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: element,
          start,
          toggleActions: 'play none none reverse',
        },
        onUpdate: () => {
          element.textContent = `${prefix}${Math.round(countRef.current.value)}${suffix}`;
        },
      });
    });

    return () => ctx.revert();
  }, [end, duration, start, suffix, prefix]);

  return <span ref={ref} className={className}>{prefix}0{suffix}</span>;
}
