import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, User, Mail, Phone, Calendar, Camera, X, Key, Star } from 'lucide-react';
import api from '../api';

export default function DeliveryPersons() {
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', dob: '' });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const eventSourceRef = useRef(null);

  const loadDeliveryBoys = useCallback(async () => {
    try {
      const res = await api.get('/delivery');
      setDeliveryBoys(res.data);
    } catch (err) {
      console.error('Error loading delivery boys:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeliveryBoys();
    
    // Setup SSE for real-time updates
    const baseUrl = api.defaults.baseURL?.replace('/api', '') || '';
    eventSourceRef.current = new EventSource(`${baseUrl}/api/events`);
    
    eventSourceRef.current.onmessage = (event) => {
      try {
        const { type } = JSON.parse(event.data);
        if (type === 'deliveryboys') {
          loadDeliveryBoys();
        }
      } catch (e) {}
    };
    
    eventSourceRef.current.onerror = () => {
      eventSourceRef.current?.close();
      setTimeout(() => {
        const baseUrl = api.defaults.baseURL?.replace('/api', '') || '';
        eventSourceRef.current = new EventSource(`${baseUrl}/api/events`);
      }, 3000);
    };
    
    return () => {
      eventSourceRef.current?.close();
    };
  }, [loadDeliveryBoys]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return '';
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('email', form.email);
      formData.append('phone', form.phone);
      formData.append('dob', form.dob);
      if (photo) formData.append('photo', photo);
      
      await api.post('/delivery', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', dob: '' });
      setPhoto(null);
      setPhotoPreview(null);
      loadDeliveryBoys();
      alert('Delivery person added! Password sent to their email.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add delivery person');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete ${name}? They will be logged out immediately.`)) return;
    
    try {
      await api.delete(`/delivery/${id}`);
      loadDeliveryBoys();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const handleResetPassword = async (id, name) => {
    if (!confirm(`Reset password for ${name}? New password will be sent to their email.`)) return;
    
    try {
      await api.post(`/delivery/${id}/reset-password`);
      alert('New password sent to email');
    } catch (err) {
      alert('Failed to reset password');
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      await api.put(`/delivery/${id}`, { isActive: !currentStatus });
      loadDeliveryBoys();
    } catch (err) {
      alert('Failed to update status');
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
          <h2 className="text-xl font-bold text-dark-900">Delivery Persons</h2>
          <p className="text-dark-500 text-sm">{deliveryBoys.length} delivery partners</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition"
        >
          <Plus className="w-5 h-5" />
          Add New
        </button>
      </div>

      {/* Delivery Boys Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deliveryBoys.map(boy => (
          <div key={boy._id} className="bg-white rounded-xl p-4 shadow-sm border border-dark-100">
            <div className="flex items-start gap-4">
              {/* Photo */}
              <div className="w-16 h-16 rounded-full bg-dark-100 overflow-hidden flex-shrink-0">
                {boy.photo ? (
                  <img src={boy.photo} alt={boy.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-dark-400">
                    <User className="w-8 h-8" />
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-dark-900 truncate">{boy.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    boy.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {boy.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="mt-2 space-y-1 text-sm text-dark-500">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{boy.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{boy.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{boy.age} years old</span>
                  </div>
                  {/* Rating Display */}
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-yellow-600 font-medium">
                      {boy.avgRating > 0 ? `${boy.avgRating} ★` : 'No ratings'}
                    </span>
                    {boy.totalRatings > 0 && (
                      <span className="text-dark-400 text-xs">({boy.totalRatings} reviews)</span>
                    )}
                  </div>
                </div>
                
                {/* Online Status */}
                <div className="mt-2 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${boy.isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span className="text-xs text-dark-400">{boy.isOnline ? 'Online' : 'Offline'}</span>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="mt-4 pt-4 border-t border-dark-100 flex items-center gap-2">
              <button
                onClick={() => toggleActive(boy._id, boy.isActive)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  boy.isActive 
                    ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                }`}
              >
                {boy.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => handleResetPassword(boy._id, boy.name)}
                className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                title="Reset Password"
              >
                <Key className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(boy._id, boy.name)}
                className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        
        {deliveryBoys.length === 0 && (
          <div className="col-span-full text-center py-12 text-dark-400">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No delivery persons added yet</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-dark-100 flex items-center justify-between">
              <h3 className="font-semibold text-lg">Add Delivery Person</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-dark-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Photo Upload */}
              <div className="flex justify-center">
                <label className="relative cursor-pointer">
                  <div className="w-24 h-24 rounded-full bg-dark-100 overflow-hidden flex items-center justify-center">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-8 h-8 text-dark-400" />
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white">
                    <Plus className="w-4 h-4" />
                  </div>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
              </div>
              
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border border-dark-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
              
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2 border border-dark-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-dark-400 mt-1">Password will be sent to this email</p>
              </div>
              
              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-dark-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
              
              {/* DOB */}
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  value={form.dob}
                  onChange={e => setForm({ ...form, dob: e.target.value })}
                  className="w-full px-4 py-2 border border-dark-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                {form.dob && (
                  <p className="text-sm text-dark-500 mt-1">Age: {calculateAge(form.dob)} years</p>
                )}
              </div>
              
              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add & Send Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
