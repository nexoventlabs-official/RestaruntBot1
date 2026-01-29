import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike, LogOut, User, Eye, EyeOff, Check, X, Settings, Package, MapPin, Phone, Clock, RefreshCw, Banknote, QrCode } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function DeliveryDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my');
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [stats, setStats] = useState({ todayDelivered: 0, totalDelivered: 0, activeOrders: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const navigate = useNavigate();

  const getToken = () => localStorage.getItem('deliveryToken');
  const headers = { Authorization: `Bearer ${getToken()}` };

  useEffect(() => {
    verifyToken();
    const interval = setInterval(verifyToken, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      loadOrders();
      loadStats();
      const orderInterval = setInterval(() => {
        loadOrders();
        loadStats();
      }, 10000);
      return () => clearInterval(orderInterval);
    }
  }, [user, activeTab]);


  const verifyToken = async () => {
    const token = getToken();
    if (!token) {
      navigate('/delivery/login');
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/delivery/verify`, { headers });
      setUser(res.data.user);
    } catch (err) {
      localStorage.removeItem('deliveryToken');
      localStorage.removeItem('deliveryUser');
      navigate('/delivery/login');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      if (activeTab === 'available') {
        const res = await axios.get(`${API_URL}/delivery/orders/available`, { headers });
        setAvailableOrders(res.data);
      } else if (activeTab === 'my') {
        const res = await axios.get(`${API_URL}/delivery/orders/my`, { headers });
        setMyOrders(res.data);
      } else if (activeTab === 'history') {
        const res = await axios.get(`${API_URL}/delivery/orders/history`, { headers });
        setHistoryOrders(res.data);
      }
    } catch (err) {
      console.error('Error loading orders:', err);
    }
  };

  const loadStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/delivery/orders/stats`, { headers });
      setStats(res.data);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    await loadStats();
    setRefreshing(false);
  };

  const handleClaimOrder = async (orderId) => {
    if (actionLoading) return;
    setActionLoading(orderId);
    try {
      await axios.post(`${API_URL}/delivery/orders/${orderId}/claim`, {}, { headers });
      await loadOrders();
      await loadStats();
      setActiveTab('my');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to claim order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkReady = async (orderId) => {
    if (actionLoading) return;
    setActionLoading(orderId);
    try {
      await axios.post(`${API_URL}/delivery/orders/${orderId}/mark-ready`, {}, { headers });
      await loadOrders();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to mark order as ready');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOutForDelivery = async (orderId) => {
    if (actionLoading) return;
    setActionLoading(orderId);
    try {
      await axios.post(`${API_URL}/delivery/orders/${orderId}/out-for-delivery`, {}, { headers });
      await loadOrders();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update order');
    } finally {
      setActionLoading(null);
    }
  };


  const handleDelivered = async (order) => {
    // For UPI (prepaid) orders, directly mark as delivered
    if (order.paymentMethod === 'upi') {
      if (actionLoading) return;
      setActionLoading(order.orderId);
      try {
        await axios.post(`${API_URL}/delivery/orders/${order.orderId}/delivered`, {}, { headers });
        await loadOrders();
        await loadStats();
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to mark as delivered');
      } finally {
        setActionLoading(null);
      }
    } else {
      // For COD orders, show payment collection modal
      setSelectedOrder(order);
      setShowPaymentModal(true);
      setQrData(null);
    }
  };

  const handleCollectCash = async () => {
    if (!selectedOrder || actionLoading) return;
    setActionLoading(selectedOrder.orderId);
    try {
      await axios.post(`${API_URL}/delivery/orders/${selectedOrder.orderId}/delivered`, 
        { collectionMethod: 'cash' }, 
        { headers }
      );
      setShowPaymentModal(false);
      setSelectedOrder(null);
      await loadOrders();
      await loadStats();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to mark as delivered');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateQR = async () => {
    if (!selectedOrder || loadingQr) return;
    setLoadingQr(true);
    try {
      const res = await axios.post(`${API_URL}/delivery/orders/${selectedOrder.orderId}/generate-qr`, {}, { headers });
      setQrData(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate QR');
    } finally {
      setLoadingQr(false);
    }
  };

  const handleCollectUPI = async () => {
    if (!selectedOrder || actionLoading) return;
    setActionLoading(selectedOrder.orderId);
    try {
      await axios.post(`${API_URL}/delivery/orders/${selectedOrder.orderId}/delivered`, 
        { collectionMethod: 'upi' }, 
        { headers }
      );
      setShowPaymentModal(false);
      setSelectedOrder(null);
      setQrData(null);
      await loadOrders();
      await loadStats();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to mark as delivered');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/delivery/status`, { isOnline: false }, { headers });
    } catch (err) {}
    localStorage.removeItem('deliveryToken');
    localStorage.removeItem('deliveryUser');
    navigate('/delivery/login');
  };


  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    setChangingPassword(true);
    try {
      await axios.post(`${API_URL}/delivery/change-password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      }, { headers });
      setPasswordSuccess('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const formatTime = (date) => new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const renderOrderCard = (order, type) => (
    <div key={order._id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-gray-800">#{order.orderId}</p>
          <p className="text-xs text-gray-500">{formatTime(order.createdAt)}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          order.status === 'preparing' ? 'bg-orange-100 text-orange-700' :
          order.status === 'ready' ? 'bg-blue-100 text-blue-700' :
          order.status === 'out_for_delivery' ? 'bg-purple-100 text-purple-700' :
          order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
        }`}>
          {order.status === 'preparing' ? 'Preparing' :
           order.status === 'out_for_delivery' ? 'On the Way' : 
           order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
      </div>
      
      <div className="mb-3 pb-3 border-b border-gray-100">
        {order.items.slice(0, 3).map((item, i) => (
          <p key={i} className="text-sm text-gray-600">{item.quantity}x {item.name}</p>
        ))}
        {order.items.length > 3 && <p className="text-xs text-gray-400">+{order.items.length - 3} more items</p>}
        <p className="font-semibold text-gray-800 mt-2">₹{order.totalAmount}</p>
      </div>
      
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <Phone className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">{order.customer?.phone}</span>
        </div>
        {order.deliveryAddress?.address && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
            <span className="text-gray-600">{order.deliveryAddress.address}</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          order.paymentMethod === 'cod' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
        }`}>
          {order.paymentMethod === 'cod' ? '💵 Cash on Delivery' : '✅ Paid Online'}
        </span>
      </div>

      
      {type === 'available' && (
        <button
          onClick={() => handleClaimOrder(order.orderId)}
          disabled={actionLoading === order.orderId}
          className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {actionLoading === order.orderId ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <><Check className="w-5 h-5" />Mark Ready & Claim</>
          )}
        </button>
      )}
      
      {type === 'my' && order.status === 'preparing' && (
        <button
          onClick={() => handleMarkReady(order.orderId)}
          disabled={actionLoading === order.orderId}
          className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {actionLoading === order.orderId ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <><Package className="w-5 h-5" />Mark Ready</>
          )}
        </button>
      )}
      
      {type === 'my' && order.status === 'ready' && (
        <button
          onClick={() => handleOutForDelivery(order.orderId)}
          disabled={actionLoading === order.orderId}
          className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {actionLoading === order.orderId ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <><Bike className="w-5 h-5" />Start Delivery</>
          )}
        </button>
      )}
      
      {type === 'my' && order.status === 'out_for_delivery' && (
        <button
          onClick={() => handleDelivered(order)}
          disabled={actionLoading === order.orderId}
          className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {actionLoading === order.orderId ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <><Check className="w-5 h-5" />{order.paymentMethod === 'cod' ? 'Collect Payment' : 'Mark Delivered'}</>
          )}
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-gradient-to-r from-orange-500 to-red-500 text-white sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full overflow-hidden">
                {user?.photo ? (
                  <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-orange-500">
                    <User className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="font-bold">{user?.name}</h1>
                <p className="text-orange-100 text-xs">Delivery Partner</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowPasswordModal(true)} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition">
                <Settings className="w-5 h-5" />
              </button>
              <button onClick={handleLogout} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>


      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-orange-500">{stats.activeOrders}</p>
            <p className="text-xs text-gray-500">Active</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-500">{stats.todayDelivered}</p>
            <p className="text-xs text-gray-500">Today</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-500">{stats.totalDelivered}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4">
        <div className="flex bg-white rounded-xl p-1 shadow-sm">
          {[
            { id: 'my', label: 'My Orders', count: myOrders.length },
            { id: 'history', label: 'History' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-orange-100 text-orange-600'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-3 flex justify-end">
        <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-3">
        {activeTab === 'my' && (
          myOrders.length > 0 ? myOrders.map(order => renderOrderCard(order, 'my')) : (
            <div className="text-center py-12">
              <Bike className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No active deliveries</p>
              <p className="text-xs text-gray-400 mt-1">Claim orders from Available tab</p>
            </div>
          )
        )}
        {activeTab === 'history' && (
          historyOrders.length > 0 ? historyOrders.map(order => renderOrderCard(order, 'history')) : (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No delivery history</p>
            </div>
          )
        )}
      </div>


      {/* COD Payment Collection Modal */}
      {showPaymentModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-lg">Collect Payment</h3>
              <button onClick={() => { setShowPaymentModal(false); setSelectedOrder(null); setQrData(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="bg-orange-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-600">Order #{selectedOrder.orderId}</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">₹{selectedOrder.totalAmount}</p>
                <p className="text-xs text-gray-500 mt-1">Cash on Delivery</p>
              </div>
              
              <p className="text-sm text-gray-600 mb-4 text-center">How did the customer pay?</p>
              
              {!qrData ? (
                <div className="space-y-3">
                  <button
                    onClick={handleCollectCash}
                    disabled={actionLoading}
                    className="w-full py-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {actionLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <><Banknote className="w-6 h-6" />Paid with Cash</>
                    )}
                  </button>
                  
                  <button
                    onClick={handleGenerateQR}
                    disabled={loadingQr}
                    className="w-full py-4 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {loadingQr ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <><QrCode className="w-6 h-6" />Pay via UPI (Show QR)</>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-600 mb-3">Scan to pay ₹{qrData.amount}</p>
                    <img src={qrData.qrUrl} alt="Payment QR" className="w-48 h-48 mx-auto" />
                  </div>
                  
                  <button
                    onClick={handleCollectUPI}
                    disabled={actionLoading}
                    className="w-full py-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {actionLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <><Check className="w-6 h-6" />Payment Received - Mark Delivered</>
                    )}
                  </button>
                  
                  <button onClick={() => setQrData(null)} className="w-full py-2 text-gray-500 text-sm hover:bg-gray-100 rounded-lg">
                    ← Back to options
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-lg">Change Password</h3>
              <button onClick={() => { setShowPasswordModal(false); setPasswordError(''); setPasswordSuccess(''); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="p-4 space-y-4">
              {passwordError && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{passwordError}</div>}
              {passwordSuccess && <div className="bg-green-50 text-green-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2"><Check className="w-5 h-5" />{passwordSuccess}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <div className="relative">
                  <input type={showPasswords.current ? 'text' : 'password'} value={passwordForm.currentPassword} onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500" required />
                  <button type="button" onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <input type={showPasswords.new ? 'text' : 'password'} value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500" required minLength={6} />
                  <button type="button" onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <input type={showPasswords.confirm ? 'text' : 'password'} value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500" required />
                  <button type="button" onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={changingPassword} className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition disabled:opacity-50">
                {changingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
