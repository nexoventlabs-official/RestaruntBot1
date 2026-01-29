import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function About() {
  return (
    <div>
      {/* Hero Section */}
      <section 
        className="relative text-white pt-24 sm:pt-28 pb-12 sm:pb-16 bg-cover bg-center"
        style={{ backgroundImage: "url('/ct-bc.jpg')" }}
      >
        <div className="relative max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">About Us</h1>
          <p className="text-base sm:text-lg text-gray-200 max-w-2xl mx-auto">
            Discover our story and passion for delivering delicious food to your doorstep
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-10 sm:py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div data-animate="slide-left">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Our Story</h2>
              <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
                FoodieSpot started with a simple idea: bring restaurant-quality food to people's homes without compromising on taste or freshness.
              </p>
              <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
                Founded in 2020, we've grown from a small kitchen to a beloved local food destination. Our team of passionate chefs works tirelessly to create dishes that bring joy to every meal.
              </p>
              <p className="text-gray-600 text-sm sm:text-base">
                We believe that great food should be accessible to everyone. That's why we focus on using fresh, locally-sourced ingredients while keeping our prices affordable.
              </p>
            </div>
            <div className="rounded-2xl sm:rounded-3xl overflow-hidden" data-animate="slide-right">
              <img src="/our-story.png" alt="Our Story" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Order Online Section */}
      <section className="py-10 sm:py-12 md:py-16 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden min-h-[400px] sm:min-h-[450px]">
            {/* Yellow Background */}
            <div className="absolute left-0 right-0 bottom-4 top-4 bg-[#f5c518] rounded-[40px] sm:rounded-[80px]" />
            
            {/* Black Background */}
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ 
                backgroundImage: "url('/food-delivery-bg.png')",
                filter: 'brightness(0)'
              }}
            />
            
            {/* Green Decorative Shape - positioned behind pizza on right side */}
            <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none z-10 hidden sm:block">
              <img 
                src="/order-shape-long.png" 
                alt="" 
                className="h-full w-auto object-contain object-right"
                style={{ filter: 'brightness(0) saturate(100%) invert(45%) sepia(64%) saturate(398%) hue-rotate(103deg) brightness(94%) contrast(88%)' }}
              />
            </div>

            <div className="relative z-20 flex flex-col lg:flex-row items-center py-8 sm:py-12 lg:py-16 px-4 sm:px-8 lg:px-16">
              {/* Left - Content */}
              <div className="lg:w-1/2 text-white relative z-10 text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-2 mb-3 sm:mb-4 flex-wrap">
                  <span className="text-[#ff9924] text-xs sm:text-sm font-medium tracking-wider uppercase">Order Online</span>
                  <span className="text-[#ff9924] hidden sm:inline">—</span>
                  <span className="text-[#ff9924] text-xs sm:text-sm font-medium tracking-wider uppercase">Fast Delivery</span>
                  <div className="w-8 sm:w-12 h-0.5 bg-[#ff9924] hidden sm:block"></div>
                </div>
                
                <h2 className="text-xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 leading-tight">
                  WE HAVE GOOD <span className="text-[#ff9924]">FOOD AND FAST</span> DELIVERY HERE.
                </h2>
                
                <p className="text-white/70 text-xs sm:text-sm mb-6 sm:mb-8 max-w-md mx-auto lg:mx-0">
                  Indulge in a gourmet journey with a menu that showcases a fusion of flavors. Our chefs use the finest ingredients to create dishes that are not just meals but unforgettable experiences.
                </p>

                {/* Feature Boxes */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
                  <div className="border border-white/30 rounded-lg p-2 sm:p-4 bg-black/20 backdrop-blur-sm">
                    <h4 className="font-bold text-white text-xs sm:text-sm mb-0.5 sm:mb-1">Delivery in 30 Minutes</h4>
                    <p className="text-white/60 text-[10px] sm:text-xs hidden sm:block">We start with our house-made.</p>
                  </div>
                  <div className="border border-white/30 rounded-lg p-2 sm:p-4 bg-black/20 backdrop-blur-sm">
                    <h4 className="font-bold text-white text-xs sm:text-sm mb-0.5 sm:mb-1">Free Shipping $50.00</h4>
                    <p className="text-white/60 text-[10px] sm:text-xs hidden sm:block">We start with our house-made.</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                  <div className="border border-white/30 rounded-lg p-2 sm:p-4 flex-1 bg-black/20 backdrop-blur-sm w-full sm:w-auto">
                    <h4 className="font-bold text-white text-xs sm:text-sm mb-0.5 sm:mb-1">On the Way Tracking</h4>
                    <p className="text-white/60 text-[10px] sm:text-xs hidden sm:block">We start with our house-made.</p>
                  </div>
                  <Link 
                    to="/menu" 
                    className="relative bg-[#e63946] text-white px-4 sm:px-6 py-2 sm:py-3 rounded font-semibold hover:bg-red-600 transition-colors text-xs sm:text-sm uppercase tracking-wide overflow-hidden group w-full sm:w-auto text-center"
                  >
                    <span className="relative z-10">Order Now</span>
                    {/* Glossy shine effect */}
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"></div>
                  </Link>
                </div>
              </div>

              {/* Right - Pizza Image */}
              <div className="lg:w-1/2 flex justify-center lg:justify-end mt-6 sm:mt-8 lg:mt-0">
                <img 
                  src="/order-online-1.png" 
                  alt="Delicious Pizza" 
                  className="w-48 sm:w-80 lg:w-[450px] h-auto object-contain drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Restaurant Section */}
      <section className="py-10 sm:py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            {/* Left - Image */}
            <div className="relative">
              <img 
                src="/about_1_1.png" 
                alt="Restaurant Food" 
                className="w-full h-auto object-contain"
              />
            </div>

            {/* Right - Content */}
            <div className="text-center lg:text-left">
              <span className="text-red-500 font-medium tracking-wider uppercase text-xs sm:text-sm">About Our Restaurant</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mt-2 sm:mt-3 leading-tight">
                WE INVITE YOU TO VISIT OUR FAST FOOD <span className="text-red-500">RESTAURANT</span>
              </h2>
              <p className="text-gray-500 mt-4 sm:mt-6 leading-relaxed text-sm sm:text-base">
                At the heart of our kitchen are bold flavors, high-quality ingredients, and a commitment to consistency. From juicy burgers, crispy fries, and cheesy pizzas to spicy wraps and refreshing drinks, every item on our menu is made to order and packed with taste.
              </p>
              
              <div className="mt-6 sm:mt-8">
                <h4 className="font-semibold text-gray-900 text-base sm:text-lg">Parvez Hossain Imon</h4>
                <p className="text-gray-400 text-xs sm:text-sm">Restaurant owner</p>
              </div>

              <Link 
                to="/menu"
                className="inline-block mt-6 sm:mt-8 relative group"
              >
                <div className="relative">
                  <img src="/button.png" alt="" className="h-12 sm:h-14 w-auto" style={{ filter: 'brightness(0) saturate(100%) invert(19%) sepia(97%) saturate(7043%) hue-rotate(359deg) brightness(101%) contrast(117%)' }} />
                  <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs sm:text-sm uppercase tracking-wide px-4 sm:px-6">
                    View Our Menu
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Opening Hours Section */}
      <section className="py-10 sm:py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4">
          {/* Mobile/Tablet Version - Curved blob shape */}
          <div className="lg:hidden relative">
            {/* Curved blob background shape */}
            <div 
              className="absolute inset-0 bg-[#3f9065]"
              style={{
                borderRadius: '60% 40% 50% 50% / 30% 30% 70% 70%',
              }}
            />
            
            <div className="relative flex flex-col items-center p-6 sm:p-8 md:p-10">
              {/* Restaurant Image */}
              <div className="w-full max-w-md mb-6">
                <div 
                  className="relative overflow-hidden shadow-xl"
                  style={{
                    borderRadius: '30% 70% 60% 40% / 50% 40% 60% 50%',
                  }}
                >
                  <img 
                    src="/restaurant-interior.jpg" 
                    alt="Restaurant Interior" 
                    className="w-full h-48 sm:h-56 md:h-64 object-cover"
                    onError={(e) => {
                      e.target.src = '/ct-bc.jpg';
                    }}
                  />
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/50 cursor-pointer hover:bg-white/30 transition-all">
                      <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Opening Hours Content */}
              <div className="w-full text-white text-center">
                <span className="text-[#ff9924] text-xs sm:text-sm font-medium tracking-wider uppercase">Opening Hours</span>
                <h2 className="text-xl sm:text-2xl font-bold mt-1 mb-2">OUR OPENING HOURS</h2>
                
                {/* Decorative line */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-[#ff9924] rotate-45"></div>
                  <div className="w-8 h-0.5 bg-[#ff9924]"></div>
                  <div className="w-1 h-1 rounded-full border border-[#ff9924]"></div>
                  <div className="w-8 h-0.5 bg-[#ff9924]"></div>
                  <div className="w-2 h-2 bg-[#ff9924] rotate-45"></div>
                </div>

                {/* Hours Grid */}
                <div 
                  className="grid grid-cols-2 gap-2 mb-4 border border-white/30 p-3 sm:p-4 bg-white/10 max-w-sm mx-auto"
                  style={{
                    borderRadius: '20px 40px 20px 40px',
                  }}
                >
                  <div className="text-center border-r border-white/30 pr-2">
                    <p className="text-white/70 text-xs mb-1">Monday to Tuesday</p>
                    <p className="text-sm font-bold text-[#ff9924]">10:00 AM</p>
                    <p className="text-sm font-bold text-[#ff9924]">20:00 PM</p>
                  </div>
                  <div className="text-center pl-2">
                    <p className="text-white/70 text-xs mb-1">Friday to Sunday</p>
                    <p className="text-sm font-bold text-[#ff9924]">12:00 AM</p>
                    <p className="text-sm font-bold text-[#ff9924]">23:00 PM</p>
                  </div>
                </div>

                {/* Book Table Button */}
                <Link 
                  to="/contact" 
                  className="inline-flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors shadow-md text-sm"
                >
                  Book Your Table
                </Link>
              </div>
            </div>
          </div>

          {/* Desktop Version - PNG shape background */}
          <div className="hidden lg:block relative min-h-[400px]">
            {/* Green PNG Background Shape */}
            <img 
              src="/opening-bg-mask.png" 
              alt="" 
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{ filter: 'brightness(0) saturate(100%) invert(45%) sepia(64%) saturate(398%) hue-rotate(103deg) brightness(94%) contrast(88%)' }}
            />
            
            <div className="relative flex flex-row items-center py-12 px-16">
              {/* Left - Restaurant Image */}
              <div className="w-1/2 p-6">
                <div className="relative rounded-3xl overflow-hidden shadow-xl">
                  <img 
                    src="/restaurant-interior.jpg" 
                    alt="Restaurant Interior" 
                    className="w-full h-72 object-cover"
                    onError={(e) => {
                      e.target.src = '/ct-bc.jpg';
                    }}
                  />
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/50 cursor-pointer hover:bg-white/30 transition-all">
                      <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right - Opening Hours */}
              <div className="w-1/2 p-6 text-white text-left">
                <span className="text-[#ff9924] text-sm font-medium tracking-wider uppercase">Opening Hours</span>
                <h2 className="text-3xl font-bold mt-2 mb-2">OUR OPENING HOURS</h2>
                
                {/* Decorative line */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2.5 h-2.5 bg-[#ff9924] rotate-45"></div>
                  <div className="w-10 h-0.5 bg-[#ff9924]"></div>
                  <div className="w-1.5 h-1.5 rounded-full border border-[#ff9924]"></div>
                  <div className="w-10 h-0.5 bg-[#ff9924]"></div>
                  <div className="w-2.5 h-2.5 bg-[#ff9924] rotate-45"></div>
                </div>

                {/* Hours Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6 border border-white/30 rounded-lg p-4 bg-white/10">
                  <div className="text-center border-r border-white/30 pr-4">
                    <p className="text-white/70 text-sm mb-2">Monday to Tuesday</p>
                    <p className="text-lg font-bold text-[#ff9924]">10:00 AM</p>
                    <p className="text-lg font-bold text-[#ff9924]">20:00 PM</p>
                  </div>
                  <div className="text-center pl-4">
                    <p className="text-white/70 text-sm mb-2">Friday to Sunday</p>
                    <p className="text-lg font-bold text-[#ff9924]">12:00 AM</p>
                    <p className="text-lg font-bold text-[#ff9924]">23:00 PM</p>
                  </div>
                </div>

                {/* Book Table Button */}
                <Link 
                  to="/contact" 
                  className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-md"
                >
                  Book Your Table
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
