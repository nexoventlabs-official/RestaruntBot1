import { Tag } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function OffersFloat() {
  return (
    <Link
      to="/offers"
      className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white p-3 md:p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 group"
      aria-label="View Offers"
    >
      <Tag className="w-6 h-6 md:w-7 md:h-7" />
      <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
        %
      </span>
      <span className="absolute right-full mr-3 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden md:block">
        Special Offers
      </span>
    </Link>
  );
}
