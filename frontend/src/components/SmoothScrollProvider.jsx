import { useEffect, useRef, createContext, useContext } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SmoothScrollContext = createContext(null);

export function useLenis() {
  return useContext(SmoothScrollContext);
}

export default function SmoothScrollProvider({ children }) {
  const lenisRef = useRef(null);

  useEffect(() => {
    // Custom easing function for ultra-smooth deceleration
    // This prevents sudden stops by using a more gradual ease-out curve
    const smoothEasing = (t) => {
      // Custom bezier-like easing for buttery smooth scrolling
      // Slower deceleration at the end prevents sudden stops
      return 1 - Math.pow(1 - t, 4);
    };

    // Initialize Lenis with optimized settings for faster scrolling on desktop, slower on mobile
    const lenis = new Lenis({
      duration: 1.2, // Slower duration for smoother feel
      easing: smoothEasing,
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.5, // Desktop wheel scrolling speed
      touchMultiplier: 1.2, // Slower touch sensitivity for mobile (reduced from 2)
      infinite: false,
      autoResize: true,
      lerp: 0.1, // Lower lerp = smoother, slower interpolation (reduced from 0.15)
      syncTouch: true, // Sync touch events for consistent behavior
      syncTouchLerp: 0.075, // Slower touch scrolling for smoother feel (reduced from 0.12)
      touchInertiaMultiplier: 25, // Reduced inertia for more controlled scrolling (reduced from 35)
      prevent: (node) => {
        // Don't prevent on horizontal scroll containers - let them handle their own scroll
        // Only prevent if explicitly marked and not a horizontal scroller
        if (node.hasAttribute('data-lenis-prevent')) {
          const hasHorizontalScroll = node.classList.contains('overflow-x-auto') || 
                                      getComputedStyle(node).overflowX === 'auto' ||
                                      getComputedStyle(node).overflowX === 'scroll';
          // Don't prevent Lenis on horizontal scrollers - they need vertical scroll to work
          return false;
        }
        return false;
      }
    });

    lenisRef.current = lenis;
    window.lenis = lenis;

    // Sync Lenis scrolling with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    // Use GSAP's ticker for the smoothest possible animation loop
    // Running at 60fps for consistent smooth scrolling
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    // Enable lag smoothing with gentle values for smoother experience
    gsap.ticker.lagSmoothing(500, 33);

    // Refresh ScrollTrigger on resize with debounce
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        ScrollTrigger.refresh();
        lenis.resize();
      }, 150);
    };

    window.addEventListener('resize', handleResize);

    // Handle visibility change to prevent scroll issues when tab is inactive
    const handleVisibilityChange = () => {
      if (document.hidden) {
        lenis.stop();
      } else {
        lenis.start();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      gsap.ticker.remove(lenis.raf);
      lenis.destroy();
      window.lenis = null;
      lenisRef.current = null;
    };
  }, []);

  return (
    <SmoothScrollContext.Provider value={lenisRef}>
      {children}
    </SmoothScrollContext.Provider>
  );
}
