import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Menu from './pages/Menu';
import Reports from './pages/Reports';
import NotFound from './pages/NotFound';
import Layout from './components/Layout';
import UserLayout from './components/UserLayout';
import Home from './pages/Home';
import UserMenuPage from './pages/UserMenuPage';
import TodaySpecial from './pages/TodaySpecial';
import OffersPage from './pages/OffersPage';
import About from './pages/About';
import Contact from './pages/Contact';
import Review from './pages/Review';
import Track from './pages/Track';
import Payment from './pages/Payment';
import PaymentSuccess from './pages/PaymentSuccess';
import ChatbotImages from './pages/ChatbotImages';
import DeliveryPersons from './pages/DeliveryPersons';
import DeliveryLogin from './pages/DeliveryLogin';
import DeliveryDashboard from './pages/DeliveryDashboard';
import Offers from './pages/Offers';
import api from './api';
import { useImagePreloader } from './hooks/useImagePreloader';

function App() {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isPreloading, progress } = useImagePreloader();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/verify')
        .then(res => setAuth(res.data.user))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading || isPreloading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f8f9fb]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-dark-900">FoodAdmin</h2>
            <p className="text-dark-400 text-sm mt-1">
              {isPreloading ? `Loading images... ${progress}%` : 'Loading...'}
            </p>
            {isPreloading && (
              <div className="w-48 h-1.5 bg-gray-200 rounded-full mt-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public User Routes with UserLayout */}
        <Route element={<UserLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<UserMenuPage />} />
          <Route path="/today-special" element={<TodaySpecial />} />
          <Route path="/offers" element={<OffersPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Route>
        
        {/* Other Public Routes */}
        <Route path="/review/:phone/:orderId" element={<Review />} />
        <Route path="/track/:orderId" element={<Track />} />
        <Route path="/pay/:orderId" element={<Payment />} />
        <Route path="/payment-success/:orderId" element={<PaymentSuccess />} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={auth ? <Navigate to="/admin" /> : <Login setAuth={setAuth} />} />
        <Route path="/admin" element={auth ? <Layout /> : <Navigate to="/admin/login" />}>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="menu" element={<Menu />} />
          <Route path="offers" element={<Offers />} />
          <Route path="reports" element={<Reports />} />
          <Route path="chatbot-images" element={<ChatbotImages />} />
          <Route path="delivery-persons" element={<DeliveryPersons />} />
        </Route>
        
        {/* Delivery Boy Routes */}
        <Route path="/delivery/login" element={<DeliveryLogin />} />
        <Route path="/delivery" element={<DeliveryDashboard />} />
        
        {/* Legacy redirect - old login to new admin login */}
        <Route path="/login" element={<Navigate to="/admin/login" />} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
