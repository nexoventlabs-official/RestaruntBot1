import { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, Mail, ShoppingBag, IndianRupee, User, MapPin, Search, X, MessageCircle, TrendingUp, Calendar, Star, ChevronRight } from 'lucide-react';
import api from '../api';

// Skeleton Components
const StatSkeleton = () => (
  <div className="bg-white rounded-2xl p-5 shadow-card animate-pulse">
    <div className="w-12 h-12 rounded-xl bg-dark-100 mb-3"></div>
    <div className="h-7 w-20 bg-dark-100 rounded mb-2"></div>
    <div className="h-4 w-24 bg-dark-100 rounded"></div>
  </div>
);

const CustomerSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-card p-5 animate-pulse">
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-dark-100 flex-shrink-0"></div>
      <div className="flex-1">
        <div className="h-5 w-32 bg-dark-100 rounded mb-2"></div>
        <div className="h-4 w-24 bg-dark-100 rounded"></div>
      </div>
      <div className="text-right">
        <div className="h-6 w-16 bg-dark-100 rounded mb-2"></div>
        <div className="h-4 w-12 bg-dark-100 rounded"></div>
      </div>
    </div>
  </div>
);

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const customersRef = useRef([]);
  const cacheRef = useRef({});

  const fetchCustomers = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await api.get('/customers');
      const newCustomers = Array.isArray(res.data) ? res.data : (res.data?.customers || []);
      if (JSON.stringify(newCustomers) !== JSON.stringify(customersRef.current)) {
        customersRef.current = newCustomers;
        setCustomers(newCustomers);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      if (!isBackground) setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const viewCustomer = async (customer) => {
    // Immediately show basic info from list
    setSelected({ ...customer, orderHistory: cacheRef.current[customer._id]?.orderHistory || [] });
    
    // Check cache first
    if (cacheRef.current[customer._id]) {
      setSelected(cacheRef.current[customer._id]);
      return;
    }

    setDetailLoading(true);
    try {
      const res = await api.get(`/customers/${customer._id}`);
      cacheRef.current[customer._id] = res.data;
      setSelected(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = customers.filter(c => 
    c.phone?.includes(searchTerm) || c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
  const totalOrders = customers.reduce((sum, c) => sum + (c.totalOrders || 0), 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const getStatusStyle = (status) => {
    const styles = {
      delivered: { bg: 'bg-green-100', text: 'text-green-700', icon: '✓' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '●' },
      preparing: { bg: 'bg-orange-100', text: 'text-orange-700', icon: '◐' },
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '○' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', icon: '✕' },
      refunded: { bg: 'bg-green-100', text: 'text-green-600', icon: '↩' },
      refund_failed: { bg: 'bg-red-100', text: 'text-red-700', icon: '✕' }
    };
    return styles[status] || styles.pending;
  };

  const stats = [
    { label: 'Total Customers', value: totalCustomers, icon: User, color: 'blue', bg: 'bg-blue-500' },
    { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: IndianRupee, color: 'green', bg: 'bg-green-500' },
    { label: 'Total Orders', value: totalOrders, icon: ShoppingBag, color: 'purple', bg: 'bg-purple-500' },
    { label: 'Avg Order Value', value: `₹${avgOrderValue}`, icon: TrendingUp, color: 'orange', bg: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          stats.map((stat, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl font-bold text-dark-900">{stat.value}</p>
              <p className="text-dark-400 text-sm mt-1">{stat.label}</p>
            </div>
          ))
        )}
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input type="text" placeholder="Search by phone or name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 bg-white border border-dark-200 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all shadow-card" />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-dark-400 hover:text-dark-600 hover:bg-dark-100 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="text-sm text-dark-400">
          {filteredCustomers.length} {filteredCustomers.length === 1 ? 'customer' : 'customers'}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Customer List */}
        <div className="xl:col-span-3 space-y-3">
          {loading ? (
            <>
              <CustomerSkeleton />
              <CustomerSkeleton />
              <CustomerSkeleton />
              <CustomerSkeleton />
            </>
          ) : filteredCustomers.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-card p-12 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-dark-100 to-dark-200 rounded-full flex items-center justify-center mx-auto mb-5">
                <User className="w-12 h-12 text-dark-400" />
              </div>
              <h3 className="text-xl font-bold text-dark-800">No customers found</h3>
              <p className="text-dark-400 mt-2 max-w-sm mx-auto">
                {searchTerm ? 'Try a different search term' : 'Customers will appear here when they place orders'}
              </p>
            </div>
          ) : (
            filteredCustomers.map(customer => (
              <div key={customer._id} onClick={() => viewCustomer(customer)}
                className={`bg-white rounded-2xl shadow-card p-5 cursor-pointer transition-all duration-200 hover:shadow-card-hover hover:translate-x-1 group ${selected?._id === customer._id ? 'ring-2 ring-primary-500 bg-primary-50/30' : ''}`}>
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary-500/30">
                      {customer.name ? customer.name.charAt(0).toUpperCase() : customer.phone?.slice(-2)}
                    </div>
                    {customer.totalOrders >= 5 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
                        <Star className="w-3 h-3 text-white fill-white" />
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-dark-900 truncate">{customer.name || 'Unknown Customer'}</h3>
                      {customer.totalOrders >= 10 && (
                        <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[10px] font-bold rounded-full uppercase tracking-wide">
                          VIP
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-dark-400 text-sm">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {customer.phone}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-dark-300"></span>
                      <span>{customer.totalOrders || 0} orders</span>
                    </div>
                  </div>
                  
                  {/* Stats & Arrow */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xl font-bold text-dark-900">₹{customer.totalSpent?.toLocaleString() || 0}</p>
                      <p className="text-xs text-dark-400">lifetime value</p>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-dark-300 transition-transform group-hover:translate-x-1 ${selected?._id === customer._id ? 'text-primary-500' : ''}`} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Customer Details Panel */}
        <div className="xl:col-span-2">
          <div className="sticky top-4">
            {selected ? (
              <div className="bg-white rounded-2xl shadow-card overflow-hidden">
                {/* Header */}
                <div className="gradient-primary p-6 text-white relative overflow-hidden">
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                  
                  <div className="relative">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-18 h-18 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-3xl font-bold p-4">
                        {selected.name ? selected.name.charAt(0).toUpperCase() : selected.phone?.slice(-2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-2xl font-bold truncate">{selected.name || 'Unknown'}</h2>
                        <div className="flex items-center gap-2 text-white/80 text-sm mt-1">
                          <Calendar className="w-4 h-4" />
                          <span>Customer since {new Date(selected.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/15 backdrop-blur rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold">{selected.totalOrders || 0}</p>
                        <p className="text-white/70 text-sm mt-1">Total Orders</p>
                      </div>
                      <div className="bg-white/15 backdrop-blur rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold">₹{(selected.totalSpent || 0).toLocaleString()}</p>
                        <p className="text-white/70 text-sm mt-1">Total Spent</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Contact Info */}
                <div className="p-5 border-b border-dark-100">
                  <h3 className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-4">Contact Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-3 bg-dark-50 rounded-xl hover:bg-dark-100 transition-colors">
                      <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Phone className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-dark-400 font-medium">Phone Number</p>
                        <p className="font-semibold text-dark-900">{selected.phone}</p>
                      </div>
                    </div>
                    
                    {selected.email && (
                      <div className="flex items-center gap-4 p-3 bg-dark-50 rounded-xl hover:bg-dark-100 transition-colors">
                        <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Mail className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-dark-400 font-medium">Email Address</p>
                          <p className="font-semibold text-dark-900 truncate">{selected.email}</p>
                        </div>
                      </div>
                    )}
                    
                    {selected.deliveryAddress?.address && (
                      <div className="flex items-start gap-4 p-3 bg-dark-50 rounded-xl hover:bg-dark-100 transition-colors">
                        <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-dark-400 font-medium">Last Delivery Address</p>
                          <p className="font-semibold text-dark-900 text-sm leading-relaxed">{selected.deliveryAddress.address}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order History */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-dark-400 uppercase tracking-wider">Order History</h3>
                    <span className="text-xs font-medium text-dark-500 bg-dark-100 px-2 py-1 rounded-full">
                      {selected.orderHistory?.length || 0} orders
                    </span>
                  </div>
                  
                  {detailLoading ? (
                    <div className="space-y-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="p-4 bg-dark-50 rounded-xl animate-pulse">
                          <div className="flex justify-between mb-2">
                            <div className="h-4 w-20 bg-dark-200 rounded"></div>
                            <div className="h-4 w-16 bg-dark-200 rounded"></div>
                          </div>
                          <div className="flex justify-between">
                            <div className="h-3 w-24 bg-dark-200 rounded"></div>
                            <div className="h-4 w-12 bg-dark-200 rounded"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : selected.orderHistory?.length > 0 ? (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                      {selected.orderHistory.map(order => {
                        const style = getStatusStyle(order.status);
                        return (
                          <div key={order._id} className="p-4 bg-dark-50 rounded-xl hover:bg-dark-100 transition-colors group">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono text-sm font-bold text-dark-800">{order.orderId}</span>
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${style.bg} ${style.text}`}>
                                {order.status}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-dark-400 text-sm">
                                {new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                              </span>
                              <span className="font-bold text-primary-600">₹{order.totalAmount}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-dark-50 rounded-xl">
                      <ShoppingBag className="w-12 h-12 text-dark-300 mx-auto mb-3" />
                      <p className="text-dark-500 font-medium">No orders yet</p>
                      <p className="text-dark-400 text-sm mt-1">Orders will appear here</p>
                    </div>
                  )}
                </div>

                {/* WhatsApp Button */}
                <div className="p-5 bg-dark-50 border-t border-dark-100">
                  <a href={`https://wa.me/${selected.phone?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full py-4 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-xl font-semibold transition-all shadow-lg shadow-green-500/30 hover:shadow-green-500/40 hover:scale-[1.02] active:scale-[0.98]">
                    <MessageCircle className="w-5 h-5" />
                    Message on WhatsApp
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-card p-10 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-dark-100 to-dark-200 rounded-full flex items-center justify-center mx-auto mb-5">
                  <User className="w-12 h-12 text-dark-400" />
                </div>
                <h3 className="text-xl font-bold text-dark-800">Select a Customer</h3>
                <p className="text-dark-400 mt-2 max-w-xs mx-auto">Click on any customer from the list to view their details and order history</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
