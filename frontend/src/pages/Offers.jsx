import { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, EyeOff, X, Upload, Tag } from 'lucide-react';
import api from '../api';

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      const res = await api.get('/offers');
      setOffers(res.data);
    } catch (err) {
      console.error('Error loading offers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile) return alert('Please select an image');

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('image', imageFile);
      data.append('isActive', true);

      await api.post('/offers', data);
      
      loadOffers();
      closeModal();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to upload offer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this offer?')) return;
    try {
      await api.delete(`/offers/${id}`);
      loadOffers();
    } catch (err) {
      alert('Failed to delete offer');
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.patch(`/offers/${id}/toggle`);
      loadOffers();
    } catch (err) {
      alert('Failed to toggle status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">Offer Cards</h1>
          <p className="text-dark-500 mt-1">Upload promotional offer images</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Upload Offer
        </button>
      </div>

      {/* Offers Grid */}
      {offers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center">
          <Tag className="w-16 h-16 text-dark-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-dark-900 mb-2">No Offers</h3>
          <p className="text-dark-500 mb-6">Upload your first offer card</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Upload Offer
          </button>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {offers.map((offer) => (
            <div 
              key={offer._id} 
              className={`bg-white rounded-2xl overflow-hidden shadow-sm border relative group break-inside-avoid ${
                offer.isActive ? 'border-green-200' : 'border-dark-100 opacity-60'
              }`}
            >
              {/* Image - Original Size */}
              <div className="relative">
                <img 
                  src={offer.image} 
                  alt="Offer"
                  className="w-full h-auto"
                />
                
                {/* Status Badge */}
                <div className="absolute top-3 left-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    offer.isActive
                      ? 'bg-green-500 text-white' 
                      : 'bg-dark-500 text-white'
                  }`}>
                    {offer.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Actions Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    onClick={() => handleToggle(offer._id)}
                    className={`p-3 rounded-full transition-colors ${
                      offer.isActive 
                        ? 'bg-white text-green-600 hover:bg-green-50' 
                        : 'bg-white text-dark-400 hover:bg-dark-50'
                    }`}
                    title={offer.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {offer.isActive ? <Eye className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
                  </button>
                  <button
                    onClick={() => handleDelete(offer._id)}
                    className="p-3 rounded-full bg-white text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="border-b border-dark-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-dark-900">Upload Offer Card</h2>
              <button onClick={closeModal} className="p-2 hover:bg-dark-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Image Upload */}
              <div>
                <div className="border-2 border-dashed border-dark-200 rounded-xl overflow-hidden hover:border-primary-400 transition-colors">
                  {imagePreview ? (
                    <div className="relative max-h-[60vh] overflow-y-auto">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-auto object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => { setImageFile(null); setImagePreview(''); }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg sticky"
                        style={{ position: 'sticky', top: '8px', float: 'right', marginTop: '-36px', marginRight: '8px' }}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block py-16 text-center">
                      <Upload className="w-12 h-12 text-dark-300 mx-auto mb-3" />
                      <p className="text-dark-600 font-medium">Click to upload offer card</p>
                      <p className="text-dark-400 text-sm mt-1">PNG, JPG up to 5MB</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-dark-400 text-xs mt-2 text-center">
                  Upload a pre-designed offer card image
                </p>
              </div>

              {/* Submit */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 border border-dark-200 rounded-xl font-medium text-dark-700 hover:bg-dark-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !imageFile}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
