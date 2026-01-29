import { useState, useEffect } from 'react';
import { 
  Calendar, TrendingUp, TrendingDown, Minus, Package, DollarSign, 
  ShoppingBag, BarChart3, RefreshCw, Mail, FileDown, X, CheckCircle, AlertCircle, Star
} from 'lucide-react';
import api from '../api';

const REPORT_TYPES = [
  { id: 'today', label: 'Today', icon: Calendar },
  { id: 'weekly', label: 'This Week', icon: Calendar },
  { id: 'monthly', label: 'This Month', icon: Calendar },
  { id: 'yearly', label: 'This Year', icon: Calendar },
  { id: 'custom', label: 'Custom Range', icon: Calendar }
];

// Dialog Component
const Dialog = ({ isOpen, onClose, title, message, type = 'info', onConfirm, confirmText = 'OK', showCancel = false }) => {
  if (!isOpen) return null;
  
  const icons = {
    success: <CheckCircle className="w-12 h-12 text-green-500" />,
    error: <AlertCircle className="w-12 h-12 text-red-500" />,
    confirm: <Mail className="w-12 h-12 text-blue-500" />,
    info: <AlertCircle className="w-12 h-12 text-blue-500" />
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-dark-400 hover:text-dark-600">
          <X className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="flex justify-center mb-4">{icons[type]}</div>
          <h3 className="text-lg font-semibold text-dark-900 mb-2">{title}</h3>
          <p className="text-dark-500 mb-6">{message}</p>
          <div className="flex gap-3 justify-center">
            {showCancel && (
              <button
                onClick={onClose}
                className="px-6 py-2 bg-dark-100 text-dark-700 rounded-xl font-medium hover:bg-dark-200 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={onConfirm || onClose}
              className={`px-6 py-2 rounded-xl font-medium transition-colors ${
                type === 'error' ? 'bg-red-500 hover:bg-red-600 text-white' :
                type === 'success' ? 'bg-green-500 hover:bg-green-600 text-white' :
                'bg-primary-500 hover:bg-primary-600 text-white'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'primary' }) => {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600'
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-card">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {trendValue}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-dark-900">{value}</p>
      <p className="text-sm text-dark-400 mt-1">{title}</p>
      {subtitle && <p className="text-xs text-dark-300 mt-0.5">{subtitle}</p>}
    </div>
  );
};

// Revenue Chart Component
const RevenueChart = ({ data, title }) => {
  const maxValue = Math.max(...data.map(d => d.revenue || 0), 1);
  
  return (
    <div className="bg-white rounded-xl p-4 shadow-card">
      <h3 className="font-semibold text-dark-900 mb-4">{title}</h3>
      <div className="flex items-end gap-2 h-48">
        {data.map((item, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-dark-100 rounded-t-lg relative" style={{ height: '160px' }}>
              <div 
                className="absolute bottom-0 w-full bg-gradient-to-t from-primary-600 to-primary-400 rounded-t-lg transition-all duration-500"
                style={{ height: `${(item.revenue / maxValue) * 100}%` }}
              />
            </div>
            <span className="text-xs text-dark-400 truncate w-full text-center">{item.label}</span>
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-dark-400 text-center py-4 w-full">No data available</p>
        )}
      </div>
    </div>
  );
};

export default function Reports() {
  const [reportType, setReportType] = useState('today');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null, showCancel: false });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const fetchReport = async (type, startDate = null, endDate = null) => {
    setLoading(true);
    try {
      let url = `/analytics/report?type=${type}`;
      if (type === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await api.get(url);
      setReportData(res.data);
    } catch (err) {
      console.error('Failed to fetch report:', err);
      // Set empty report data on error so UI shows zeros instead of "No Report Data"
      setReportData({
        totalRevenue: 0,
        totalOrders: 0,
        totalItemsSold: 0,
        avgOrderValue: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        refundedOrders: 0,
        codOrders: 0,
        upiOrders: 0,
        topSellingItems: [],
        leastSellingItems: [],
        allItemsSold: [],
        revenueByCategory: [],
        revenueTrend: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(reportType);
  }, [reportType]);

  const handleCustomRange = () => {
    if (customRange.start && customRange.end) {
      fetchReport('custom', customRange.start, customRange.end);
      setShowCustomPicker(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!reportData || generatingPdf) return;
    setGeneratingPdf(true);
    try {
      const response = await api.post('/analytics/report/download-pdf', 
        { reportData, reportType },
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `FoodAdmin_${reportType}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download error:', err);
      setDialog({ isOpen: true, title: 'Download Failed', message: 'Failed to download PDF report', type: 'error', showCancel: false });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleSendEmail = () => {
    if (!reportData) return;
    setDialog({
      isOpen: true,
      title: 'Send Report',
      message: 'Send this report to the configured email address?',
      type: 'confirm',
      showCancel: true,
      confirmText: 'Send',
      onConfirm: async () => {
        setDialog({ isOpen: false });
        setSendingEmail(true);
        try {
          const res = await api.post('/analytics/report/send-email', { reportData, reportType });
          setDialog({ isOpen: true, title: 'Success', message: res.data.message || 'Report sent successfully!', type: 'success', showCancel: false });
        } catch (err) {
          console.error('Email send error:', err);
          setDialog({ isOpen: true, title: 'Failed', message: err.response?.data?.error || 'Failed to send email', type: 'error', showCancel: false });
        } finally {
          setSendingEmail(false);
        }
      }
    });
  };

  const formatCurrency = (val) => `₹${(val || 0).toLocaleString('en-IN')}`;

  // Helper to determine interest level based on quantity sold
  const getInterestLevel = (quantity, allItems) => {
    if (!allItems || allItems.length === 0) return 'low';
    const quantities = allItems.map(i => i.quantity || 0);
    const maxQty = Math.max(...quantities);
    const avgQty = quantities.reduce((a, b) => a + b, 0) / quantities.length;
    
    if (quantity >= avgQty * 1.5) return 'high';
    if (quantity >= avgQty * 0.5) return 'constant';
    return 'low';
  };

  const InterestBadge = ({ level }) => {
    const config = {
      high: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', label: 'High' },
      constant: { icon: Minus, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Stable' },
      low: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50', label: 'Low' }
    };
    const { icon: Icon, color, bg, label } = config[level] || config.low;
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${bg}`}>
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className={`text-xs font-medium ${color}`}>{label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-dark-900">Reports & Analytics</h1>
          <p className="text-sm text-dark-400">Detailed insights about your business</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDownloadPdf}
            disabled={!reportData || loading || generatingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download PDF Report"
          >
            {generatingPdf ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{generatingPdf ? 'Generating...' : 'PDF'}</span>
          </button>
          <button 
            onClick={handleSendEmail}
            disabled={!reportData || loading || sendingEmail}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send Report via Email"
          >
            {sendingEmail ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{sendingEmail ? 'Sending...' : 'Email'}</span>
          </button>
          <button 
            onClick={() => fetchReport(reportType, customRange.start, customRange.end)}
            className="flex items-center gap-2 px-4 py-2 bg-dark-100 rounded-xl text-dark-700 hover:bg-dark-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex flex-wrap gap-2">
        {REPORT_TYPES.map(type => (
          <button
            key={type.id}
            onClick={() => {
              setReportType(type.id);
              if (type.id === 'custom') setShowCustomPicker(true);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              reportType === type.id 
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' 
                : 'bg-white text-dark-600 hover:bg-dark-50 shadow-card'
            }`}
          >
            <type.icon className="w-4 h-4" />
            {type.label}
          </button>
        ))}
      </div>

      {/* Custom Date Range Picker */}
      {showCustomPicker && (
        <div className="bg-white rounded-xl p-4 shadow-card flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">Start Date</label>
            <input
              type="date"
              value={customRange.start}
              onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
              className="px-3 py-2 border border-dark-200 rounded-lg focus:border-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">End Date</label>
            <input
              type="date"
              value={customRange.end}
              onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
              className="px-3 py-2 border border-dark-200 rounded-lg focus:border-primary-500 outline-none"
            />
          </div>
          <button
            onClick={handleCustomRange}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
          >
            Generate Report
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-card animate-pulse">
              <div className="w-10 h-10 bg-dark-100 rounded-lg mb-3" />
              <div className="h-6 w-20 bg-dark-100 rounded mb-2" />
              <div className="h-4 w-16 bg-dark-100 rounded" />
            </div>
          ))}
        </div>
      ) : reportData ? (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Total Revenue"
              value={formatCurrency(reportData.totalRevenue)}
              icon={DollarSign}
              color="green"
            />
            <StatCard
              title="Total Orders"
              value={reportData.totalOrders || 0}
              icon={ShoppingBag}
              color="blue"
            />
            <StatCard
              title="Items Sold"
              value={reportData.totalItemsSold || 0}
              icon={Package}
              color="orange"
            />
            <StatCard
              title="Avg Order Value"
              value={formatCurrency(reportData.avgOrderValue)}
              icon={TrendingUp}
              color="primary"
            />
          </div>

          {/* Order Status Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard title="Delivered" value={reportData.deliveredOrders || 0} icon={Package} color="green" />
            <StatCard title="Cancelled" value={reportData.cancelledOrders || 0} icon={Package} color="red" />
            <StatCard title="Refunded" value={reportData.refundedOrders || 0} icon={Package} color="orange" />
            <StatCard title="COD Orders" value={reportData.codOrders || 0} icon={DollarSign} color="blue" />
            <StatCard title="UPI Orders" value={reportData.upiOrders || 0} icon={DollarSign} color="primary" />
          </div>

          {/* Top Selling Items Table */}
          <div className="bg-white rounded-xl shadow-card overflow-hidden">
            <div className="p-4 border-b border-dark-100">
              <h3 className="font-semibold text-dark-900">🔥 Top Selling Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-dark-600 w-12">S.No</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-dark-600 w-16">Image</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-dark-600">Item Name</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-dark-600">Rating</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-dark-600">Interest</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-dark-600">Qty Sold</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-dark-600">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100">
                  {(reportData.topSellingItems || []).slice(0, 5).map((item, idx) => (
                    <tr key={idx} className="hover:bg-dark-50">
                      <td className="px-4 py-3 text-sm text-dark-500">{idx + 1}</td>
                      <td className="px-4 py-2">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-dark-100 flex items-center justify-center">
                            <Package className="w-5 h-5 text-dark-300" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-dark-900">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        {item.totalRatings > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-dark-900">{item.avgRating?.toFixed(1)}</span>
                            <span className="text-dark-400 text-xs">({item.totalRatings})</span>
                          </div>
                        ) : (
                          <span className="text-dark-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <InterestBadge level={getInterestLevel(item.quantity, reportData.allItemsSold)} />
                      </td>
                      <td className="px-4 py-3 text-sm text-dark-900 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-dark-900 text-right">{formatCurrency(item.revenue)}</td>
                    </tr>
                  ))}
                  {(!reportData.topSellingItems || reportData.topSellingItems.length === 0) && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-dark-400">No data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Least Selling Items Table */}
          <div className="bg-white rounded-xl shadow-card overflow-hidden">
            <div className="p-4 border-b border-dark-100">
              <h3 className="font-semibold text-dark-900">📉 Least Selling Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-dark-600 w-12">S.No</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-dark-600 w-16">Image</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-dark-600">Item Name</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-dark-600">Rating</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-dark-600">Interest</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-dark-600">Qty Sold</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-dark-600">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100">
                  {(reportData.leastSellingItems || []).slice(0, 5).map((item, idx) => (
                    <tr key={idx} className="hover:bg-dark-50">
                      <td className="px-4 py-3 text-sm text-dark-500">{idx + 1}</td>
                      <td className="px-4 py-2">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-dark-100 flex items-center justify-center">
                            <Package className="w-5 h-5 text-dark-300" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-dark-900">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        {item.totalRatings > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-dark-900">{item.avgRating?.toFixed(1)}</span>
                            <span className="text-dark-400 text-xs">({item.totalRatings})</span>
                          </div>
                        ) : (
                          <span className="text-dark-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <InterestBadge level={getInterestLevel(item.quantity, reportData.allItemsSold)} />
                      </td>
                      <td className="px-4 py-3 text-sm text-dark-900 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-dark-900 text-right">{formatCurrency(item.revenue)}</td>
                    </tr>
                  ))}
                  {(!reportData.leastSellingItems || reportData.leastSellingItems.length === 0) && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-dark-400">No data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Revenue Trend */}
          {reportData.revenueTrend && reportData.revenueTrend.length > 0 && (
            <RevenueChart data={reportData.revenueTrend} title="📈 Revenue Trend" />
          )}

          {/* Items Breakdown Table */}
          <div className="bg-white rounded-xl shadow-card overflow-hidden">
            <div className="p-4 border-b border-dark-100">
              <h3 className="font-semibold text-dark-900">📦 All Items Sold</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-dark-600 w-12">S.No</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-dark-600 w-16">Image</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-dark-600">Item Name</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-dark-600">Rating</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-dark-600">Interest</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-dark-600">Qty Sold</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-dark-600">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100">
                  {(reportData.allItemsSold || []).map((item, idx) => (
                    <tr key={idx} className="hover:bg-dark-50">
                      <td className="px-4 py-3 text-sm text-dark-500">{idx + 1}</td>
                      <td className="px-4 py-2">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-dark-100 flex items-center justify-center">
                            <Package className="w-5 h-5 text-dark-300" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-dark-900">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        {item.totalRatings > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-dark-900">{item.avgRating?.toFixed(1)}</span>
                            <span className="text-dark-400 text-xs">({item.totalRatings})</span>
                          </div>
                        ) : (
                          <span className="text-dark-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <InterestBadge level={getInterestLevel(item.quantity, reportData.allItemsSold)} />
                      </td>
                      <td className="px-4 py-3 text-sm text-dark-900 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-dark-900 text-right">{formatCurrency(item.revenue)}</td>
                    </tr>
                  ))}
                  {(!reportData.allItemsSold || reportData.allItemsSold.length === 0) && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-dark-400">No items sold in this period</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl p-12 shadow-card text-center">
          <BarChart3 className="w-16 h-16 text-dark-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-dark-700">No Report Data</h3>
          <p className="text-dark-400 mt-1">Select a report type to view analytics</p>
        </div>
      )}

      {/* Dialog */}
      <Dialog
        isOpen={dialog.isOpen}
        onClose={() => setDialog({ ...dialog, isOpen: false })}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        onConfirm={dialog.onConfirm}
        confirmText={dialog.confirmText || 'OK'}
        showCancel={dialog.showCancel}
      />
    </div>
  );
}
