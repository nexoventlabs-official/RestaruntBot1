import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRightIcon, ArrowLeftIcon } from './Icons';

const API_URL = 'http://localhost:5000/api/public';

export default function HeroCarousel() {
  const [heroes, setHeroes] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    loadHeroSections();
  }, []);

  const loadHeroSections = async () => {
    try {
      const res = await axios.get(`${API_URL}/hero-sections`);
      setHeroes(res.data);
    } catch (err) {
      console.error('Error loading hero sections:', err);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = useCallback(() => {
    if (heroes.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % heroes.length);
    }
  }, [heroes.length]);

  const prevSlide = useCallback(() => {
    if (heroes.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + heroes.length) % heroes.length);
    }
  }, [heroes.length]);

  // Auto-slide every 3 seconds
  useEffect(() => {
    if (heroes.length <= 1 || isPaused) return;
    
    const interval = setInterval(nextSlide, 3000);
    return () => clearInterval(interval);
  }, [heroes.length, isPaused, nextSlide]);

  if (loading) {
    return (
      <section className="relative min-h-[60vh] lg:h-screen bg-[#f7f2e2] flex items-center justify-center">
        <div className="animate-pulse text-gray-600 text-xl">Loading...</div>
      </section>
    );
  }

  // Fallback hero if no heroes from admin
  if (heroes.length === 0) {
    return (
      <section className="relative min-h-[60vh] lg:h-screen overflow-hidden w-full max-w-full">
        {/* Mobile/Tablet Background Image */}
        <div 
          className="absolute inset-0 lg:hidden bg-cover bg-center"
          style={{ backgroundImage: "url('/assorted-chinese-dishes-42WBYHV-1.jpg')" }}
        >
          <div className="absolute inset-0 bg-black/50" />
        </div>
        {/* Desktop Background */}
        <div className="absolute inset-0 hidden lg:block bg-[#f7f2e2]" />
        
        <div className="relative h-full max-w-7xl mx-auto px-4 flex items-center pt-40 md:pt-80 pb-20 lg:py-0">
          <div className="max-w-2xl text-white lg:text-gray-900 z-10">
            <h1 className="text-3xl lg:text-6xl font-bold mb-4 leading-tight">
              Delicious Food,<br />Delivered Fresh
            </h1>
            <p className="text-base lg:text-xl text-white/90 lg:text-gray-600 mb-6 lg:mb-8">
              Experience the best flavors from our kitchen to your doorstep. Fresh ingredients, amazing taste, quick delivery.
            </p>
            <div className="flex items-center gap-4 lg:gap-6">
              {/* Pizza Image above buttons */}
              <div className="absolute -top-20 left-0" id="pizza-start">
                <img 
                  src="/hero-2-1-1.png" 
                  alt="" 
                  className="w-20 h-20 object-contain opacity-0"
                />
              </div>
              {/* Book a Table Button - Green */}
              <Link 
                to="/contact" 
                className="relative flex items-center gap-2 px-8 py-3 font-semibold text-white overflow-hidden"
              >
                <img 
                  src="/button.png" 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ filter: 'brightness(0) saturate(100%) invert(48%) sepia(52%) saturate(456%) hue-rotate(93deg) brightness(95%) contrast(91%)' }}
                />
                {/* Moving shine effect */}
                <div className="absolute inset-0 w-full h-full overflow-hidden rounded-full group">
                  <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 group-hover:left-full transition-all duration-700 ease-in-out"></div>
                </div>
                <span className="relative z-10">Book a Table</span>
              </Link>
              {/* Menu Button - Red */}
              <Link 
                to="/menu" 
                className="relative flex items-center gap-2 px-8 py-3 font-semibold text-white overflow-hidden"
              >
                <img 
                  src="/button.png" 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ filter: 'brightness(0) saturate(100%) invert(19%) sepia(97%) saturate(7043%) hue-rotate(359deg) brightness(101%) contrast(117%)' }}
                />
                {/* Moving shine effect */}
                <div className="absolute inset-0 w-full h-full overflow-hidden rounded-full group">
                  <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 group-hover:left-full transition-all duration-700 ease-in-out"></div>
                </div>
                <span className="relative z-10">Menu</span>
              </Link>
            </div>
          </div>
          {/* Right Side Food Image */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-full hidden lg:flex items-center justify-end">
            <img 
              src="/hero-9-main.png" 
              alt="Delicious Food" 
              className="max-h-[80%] w-auto object-contain"
            />
          </div>
        </div>
        {/* Decorative Shape Image - Hidden on mobile/tablet */}
        <img 
          src="/hero-10-shape.png" 
          alt="" 
          className="absolute bottom-0 left-0 right-0 w-full h-auto pointer-events-none z-10 hidden lg:block"
        />
      </section>
    );
  }

  const currentHero = heroes[currentIndex];

  return (
    <section 
      className="relative min-h-[60vh] lg:h-screen overflow-hidden w-full max-w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Mobile/Tablet Background Image - Static */}
      <div 
        className="absolute inset-0 lg:hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/assorted-chinese-dishes-42WBYHV-1.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Desktop Background Images with Transition */}
      {heroes.map((hero, index) => (
        <div
          key={hero._id}
          className={`absolute inset-0 transition-opacity duration-700 hidden lg:block ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img 
            src={hero.image} 
            alt={hero.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        </div>
      ))}

      {/* Decorative Shape Image - Hidden on mobile/tablet */}
      <img 
        src="/hero-10-shape.png" 
        alt="" 
        className="absolute bottom-0 left-0 right-0 w-full h-auto pointer-events-none z-10 hidden lg:block"
      />

      {/* Content */}
      <div className="relative h-full max-w-7xl mx-auto px-4 flex items-center pt-40 md:pt-80 pb-20 lg:py-0">
        <div className="max-w-2xl text-white">
          {currentHero.subtitle && (
            <p className="text-orange-400 font-medium mb-2 tracking-wider uppercase text-xs sm:text-sm md:text-base animate-fade-in">
              {currentHero.subtitle}
            </p>
          )}
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold mb-3 sm:mb-4 leading-tight animate-slide-up">
            {currentHero.title}
          </h1>
          {currentHero.description && (
            <p className="text-sm sm:text-lg md:text-xl text-white/90 mb-6 sm:mb-8 animate-slide-up-delay line-clamp-3 sm:line-clamp-none">
              {currentHero.description}
            </p>
          )}
          <Link 
            to={currentHero.buttonLink || '/menu'} 
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 sm:px-8 sm:py-4 rounded-full font-semibold hover:bg-orange-600 transition-all shadow-lg hover:shadow-xl hover:scale-105 animate-fade-in-delay text-sm sm:text-base"
          >
            {currentHero.buttonText || 'Order Now'} <ArrowRightIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>
        </div>
      </div>

      {/* Navigation Arrows */}
      {heroes.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-2 sm:p-3 rounded-full transition-all hover:scale-110"
            aria-label="Previous slide"
          >
            <ArrowLeftIcon className="w-4 h-4 sm:w-6 sm:h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-2 sm:p-3 rounded-full transition-all hover:scale-110"
            aria-label="Next slide"
          >
            <ArrowRightIcon className="w-4 h-4 sm:w-6 sm:h-6" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {heroes.length > 1 && (
        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2">
          {heroes.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all ${
                index === currentIndex 
                  ? 'bg-orange-500 w-6 sm:w-8' 
                  : 'bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Progress Bar */}
      {heroes.length > 1 && !isPaused && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div 
            className="h-full bg-orange-500 animate-progress"
            style={{ animationDuration: '3s' }}
          />
        </div>
      )}
    </section>
  );
}
