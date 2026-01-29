import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  UtensilsCrossed, 
  LogOut, 
  ChefHat,
  BarChart3,
  Image,
  Bike,
  Tag
} from 'lucide-react';

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', description: 'Overview & stats' },
  { path: '/admin/orders', icon: ShoppingBag, label: 'Orders', description: 'Manage orders' },
  { path: '/admin/menu', icon: UtensilsCrossed, label: 'Menu', description: 'Food items' },
  { path: '/admin/offers', icon: Tag, label: 'Offers', description: 'Promotions & deals' },
  { path: '/admin/delivery-persons', icon: Bike, label: 'Delivery', description: 'Delivery partners' },
  { path: '/admin/reports', icon: BarChart3, label: 'Reports', description: 'Analytics & reports' },
  { path: '/admin/chatbot-images', icon: Image, label: 'Bot Images', description: 'WhatsApp images' },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/admin/login');
  };

  const currentPage = navItems.find(item => item.path === location.pathname);

  return (
    <div className="flex min-h-screen h-full bg-[#f8f9fb]">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-72 bg-dark-900 text-white flex-col shadow-sidebar">
        {/* Logo Section */}
        <div className="p-6 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">FoodAdmin</h1>
              <p className="text-xs text-dark-400">Restaurant Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200
                  ${isActive 
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30' 
                    : 'text-dark-300 hover:bg-dark-800 hover:text-white'
                  }
                `}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
                <div>
                  <span className="font-medium">{item.label}</span>
                  {!isActive && (
                    <p className="text-xs text-dark-500 mt-0.5">{item.description}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-dark-700">
          <div className="p-4 bg-dark-800 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold">
                A
              </div>
              <div className="flex-1">
                <p className="font-medium text-white text-sm">Admin</p>
                <p className="text-xs text-dark-400">Restaurant Owner</p>
              </div>
              <button 
                onClick={logout} 
                className="p-2 rounded-lg text-dark-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-72 pb-20 lg:pb-0">
        {/* Top Header */}
        <header className="bg-white border-b border-dark-100 px-4 lg:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile Logo */}
            <div className="lg:hidden w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg lg:text-xl font-bold text-dark-900">{currentPage?.label || 'Dashboard'}</h2>
              <p className="text-xs lg:text-sm text-dark-400 hidden sm:block">{currentPage?.description || 'Overview & stats'}</p>
            </div>
          </div>
          
          {/* Mobile Logout Button */}
          <button 
            onClick={logout}
            className="lg:hidden p-2 rounded-xl text-dark-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Bottom Navigation - Mobile & Tablet */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-dark-100 z-50">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex flex-col items-center justify-center py-2 px-3 rounded-xl min-w-[60px] transition-all duration-200
                  ${isActive ? 'text-primary-600' : 'text-dark-400'}
                `}
              >
                <div className={`p-2 rounded-xl transition-all duration-200 ${isActive ? 'bg-primary-50' : ''}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className={`text-xs mt-1 font-medium ${isActive ? 'text-primary-600' : 'text-dark-500'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
