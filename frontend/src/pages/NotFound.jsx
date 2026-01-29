import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <img 
          src="https://kutralamsunchips.com/wp-content/themes/freshen/images/error-top.png" 
          alt="404 Error" 
          className="w-64 h-auto mx-auto mb-8"
        />
        
        <h2 className="text-2xl font-bold text-dark-900 mb-2">Page Not Found</h2>
        <p className="text-dark-400 mb-8">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link 
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl gradient-primary text-white font-medium shadow-lg shadow-primary-600/30 hover:shadow-xl transition-all duration-200"
          >
            <Home className="w-5 h-5" />
            Go to Dashboard
          </Link>
          <button 
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-dark-100 text-dark-700 font-medium hover:bg-dark-200 transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
