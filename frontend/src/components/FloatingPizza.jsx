import { useEffect, useRef, useState } from 'react';

export default function FloatingPizza() {
  const [isReady, setIsReady] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    let currentRotation = 0;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      // Calculate scroll progress (0 to 1)
      const progress = docHeight > 0 ? Math.min(scrollY / docHeight, 1) : 0;
      setScrollProgress(progress);
      
      // Rotation based on scroll position (full rotation per page)
      currentRotation = scrollY * 0.3;
      setRotation(currentRotation);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [isReady]);

  if (!isReady) return null;

  // Calculate vertical position (from top 10% to bottom 90% of viewport)
  const topPosition = 10 + (scrollProgress * 80); // 10% to 90%

  return (
    <div 
      className="fixed right-2 sm:right-4 md:right-6 z-[50] pointer-events-auto cursor-pointer"
      style={{ 
        top: `${topPosition}%`,
        transform: 'translateY(-50%)',
      }}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <img
        src="/hero-2-1-1.png"
        alt="Scroll to top"
        className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 object-contain"
        style={{ 
          transform: `rotate(${rotation}deg)`,
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
          transition: 'transform 0.05s linear',
        }}
      />
    </div>
  );
}
