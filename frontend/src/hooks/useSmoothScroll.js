import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useSmoothScroll() {
  const lenisRef = useRef(null);

  useEffect(() => {
    // Detect device type for optimized settings
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Initialize Lenis with device-specific optimized settings
    const lenis = new Lenis({
      // Smoother, longer duration for mobile and tablet
      duration: isMobile ? 1.5 : isTablet ? 1.4 : 1.2,
      // Smoother easing for mobile/tablet
      easing: (t) => {
        if (isMobile || isTablet) {
          // Smoother, more gradual easing for touch devices
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }
        return Math.min(1, 1.001 - Math.pow(2, -10 * t));
      },
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      // Adjusted multipliers for better mobile/tablet experience
      wheelMultiplier: isMobile ? 0.8 : isTablet ? 0.9 : 1,
      touchMultiplier: isMobile ? 2.5 : isTablet ? 2.2 : 2,
      infinite: false,
      autoResize: true,
      // Smoother lerp (linear interpolation) for mobile/tablet
      lerp: isMobile ? 0.08 : isTablet ? 0.09 : 0.1,
      // Prevent scroll on specific elements
      prevent: (node) => {
        // Allow horizontal scrolling on elements with data-lenis-prevent
        return node.hasAttribute('data-lenis-prevent');
      },
    });

    lenisRef.current = lenis;
    // Make lenis globally available
    window.lenis = lenis;

    // Sync Lenis with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    // Use GSAP ticker for smooth RAF loop
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    // Disable GSAP's default lag smoothing for instant response
    gsap.ticker.lagSmoothing(0);

    // Update ScrollTrigger on resize
    const handleResize = () => {
      ScrollTrigger.refresh();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      gsap.ticker.remove(lenis.raf);
      lenis.destroy();
      lenisRef.current = null;
      window.lenis = null;
    };
  }, []);

  return lenisRef;
}

// Utility function to scroll to element
export function scrollTo(target, options = {}) {
  if (window.lenis) {
    window.lenis.scrollTo(target, {
      offset: 0,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      ...options,
    });
  }
}

export default useSmoothScroll;
