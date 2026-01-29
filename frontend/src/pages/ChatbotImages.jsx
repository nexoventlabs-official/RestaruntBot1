import { useState, useEffect, useRef } from 'react';
import { Upload, RefreshCw, Image as ImageIcon, Check, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../api';

export default function ChatbotImages() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({
    welcome: true,
    orders: true,
    cart: false,
    menu: false,
    orderType: false,
    payment: false,
    status: false,
    tracking: false,
    pickup: false,
    cartManagement: false,
    help: false
  });
  const fileInputRefs = useRef({});

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const res = await api.get('/chatbot-images');
      setImages(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (key, file) => {
    if (!file) return;
    
    setUploading(key);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const res = await api.put(`/chatbot-images/${key}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setImages(prev => prev.map(img => 
        img.key === key ? res.data : img
      ));
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const handleReset = async (key) => {
    if (!confirm('Reset this image to default?')) return;
    
    setUploading(key);
    setError(null);
    
    try {
      const res = await api.post(`/chatbot-images/${key}/reset`);
      setImages(prev => prev.map(img => 
        img.key === key ? res.data : img
      ));
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
    } finally {
      setUploading(null);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Categorize images based on the new flow
  const categorizeImages = () => {
    const categories = {
      welcome: {
        title: '👋 Welcome & Main Flow',
        description: 'Images shown at the start of customer interaction',
        keys: ['welcome', 'quick_picks', 'no_specials_today', 'contact_restaurant']
      },
      orders: {
        title: '🧾 My Orders',
        description: 'Images for order history and reordering',
        keys: ['my_orders', 'no_orders_found', 'your_orders', 'reorder_success']
      },
      cart: {
        title: '🛒 Cart & Ordering',
        description: 'Images for cart management and item selection',
        keys: ['cart_empty', 'view_cart', 'added_to_cart', 'cart_cleared', 'select_quantity']
      },
      menu: {
        title: '📋 Menu Browsing',
        description: 'Images for menu navigation',
        keys: ['browse_menu', 'item_not_available']
      },
      orderType: {
        title: '🚚 Order Type & Summary',
        description: 'Images for order type selection and review',
        keys: ['order_type_selection', 'order_summary', 'order_details']
      },
      payment: {
        title: '💳 Payment',
        description: 'Images for payment process',
        keys: ['payment_methods', 'payment_success', 'payment_timeout_cancelled']
      },
      status: {
        title: '✅ Order Status',
        description: 'Images for order confirmation and status updates',
        keys: ['order_confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']
      },
      tracking: {
        title: '📍 Order Tracking & Cancellation',
        description: 'Images for tracking and cancelling orders',
        keys: ['order_tracking', 'no_active_orders', 'order_cancelled']
      },
      pickup: {
        title: '🏪 Pickup Specific',
        description: 'Images specific to pickup orders',
        keys: ['pickup_confirmed', 'pickup_ready', 'pickup_completed', 'pickup_tracking', 'pickup_cancelled', 'pickup_cancel_restricted']
      },
      cartManagement: {
        title: '⏰ Cart Management',
        description: 'Images for cart expiry and cleanup',
        keys: ['cart_expiry_warning', 'cart_items_removed']
      },
      help: {
        title: '❓ Help & Support',
        description: 'Images for help and external links',
        keys: ['help_support', 'open_website']
      }
    };

    const categorized = {};
    Object.entries(categories).forEach(([key, category]) => {
      categorized[key] = {
        ...category,
        images: images.filter(img => category.keys.includes(img.key))
      };
    });

    return categorized;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const categorizedImages = categorizeImages();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">Chatbot Images</h1>
          <p className="text-dark-500 mt-1">Manage WhatsApp bot message images (2:1 landscape format)</p>
        </div>
        <button
          onClick={fetchImages}
          className="flex items-center gap-2 px-4 py-2 bg-dark-100 hover:bg-dark-200 rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
          <X className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* New Flow Badge */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="bg-blue-500 text-white px-2 py-1 rounded-lg text-xs font-semibold">NEW FLOW</div>
          <div>
            <h4 className="font-medium text-blue-900">Updated Chatbot Flow</h4>
            <p className="text-sm text-blue-700 mt-1">
              The chatbot flow has been updated with Quick Picks, streamlined cart actions, and order type selection. 
              Upload images for the new flow steps marked with "NEW FLOW" in their descriptions.
            </p>
          </div>
        </div>
      </div>

      {/* Categorized Images */}
      {Object.entries(categorizedImages).map(([categoryKey, category]) => (
        <div key={categoryKey} className="bg-white rounded-2xl shadow-card overflow-hidden">
          {/* Category Header */}
          <button
            onClick={() => toggleCategory(categoryKey)}
            className="w-full flex items-center justify-between p-4 hover:bg-dark-50 transition-colors"
          >
            <div className="text-left">
              <h2 className="text-lg font-semibold text-dark-900">{category.title}</h2>
              <p className="text-sm text-dark-500 mt-0.5">{category.description}</p>
              <p className="text-xs text-dark-400 mt-1">{category.images.length} images</p>
            </div>
            {expandedCategories[categoryKey] ? (
              <ChevronUp className="w-5 h-5 text-dark-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-dark-400" />
            )}
          </button>

          {/* Category Images */}
          {expandedCategories[categoryKey] && (
            <div className="border-t border-dark-100 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {category.images.map(image => (
                  <div key={image.key} className="bg-dark-50 rounded-xl overflow-hidden">
                    {/* Image Preview - 2:1 aspect ratio */}
                    <div className="relative aspect-[2/1] bg-dark-100">
                      <img
                        src={image.imageUrl || 'https://via.placeholder.com/1200x600?text=No+Image'}
                        alt={image.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/1200x600?text=Image+Not+Found';
                        }}
                      />
                      {uploading === image.key && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 animate-spin text-white" />
                        </div>
                      )}
                      {image.cloudinaryPublicId && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Custom
                        </div>
                      )}
                      {image.description.includes('NEW FLOW') && (
                        <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-lg text-xs font-semibold">
                          NEW FLOW
                        </div>
                      )}
                    </div>

                    {/* Image Info */}
                    <div className="p-3">
                      <h3 className="font-semibold text-dark-900 text-sm">{image.name}</h3>
                      <p className="text-xs text-dark-500 mt-1 line-clamp-2">{image.description}</p>
                      <p className="text-xs text-dark-400 mt-1">Key: {image.key}</p>

                      {/* Actions */}
                      <div className="flex gap-2 mt-3">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={el => fileInputRefs.current[image.key] = el}
                          onChange={(e) => handleUpload(image.key, e.target.files[0])}
                        />
                        <button
                          onClick={() => fileInputRefs.current[image.key]?.click()}
                          disabled={uploading === image.key}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload
                        </button>
                        {image.cloudinaryPublicId && (
                          <button
                            onClick={() => handleReset(image.key)}
                            disabled={uploading === image.key}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-dark-100 hover:bg-dark-200 text-dark-700 rounded-lg transition-colors disabled:opacity-50 text-sm"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <ImageIcon className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Image Guidelines</h4>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• Recommended size: 1200 x 600 pixels (2:1 aspect ratio)</li>
              <li>• Images are automatically cropped to 2:1 landscape format</li>
              <li>• Supported formats: JPG, PNG, WebP</li>
              <li>• Max file size: 10MB</li>
              <li>• Images are optimized via Cloudinary for fast delivery</li>
              <li>• Focus on the new flow images marked with "NEW FLOW" badge</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
