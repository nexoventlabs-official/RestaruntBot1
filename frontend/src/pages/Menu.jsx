import { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Sparkles, X, Image, FolderPlus, Search, Clock, ChevronDown, Check, Pause, Play, Upload } from 'lucide-react';
import api from '../api';

// Custom Dropdown Component
const CustomDropdown = ({ value, onChange, options, placeholder, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-xl focus:border-primary-500 focus:bg-white transition-all text-left flex items-center justify-between ${!value ? 'text-dark-400' : 'text-dark-900'}`}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <ChevronDown className={`w-5 h-5 text-dark-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {required && <input type="text" value={value} onChange={() => {}} required className="sr-only" tabIndex={-1} />}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-dark-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {placeholder && (
              <div
                onClick={() => { onChange(''); setIsOpen(false); }}
                className={`px-4 py-3 cursor-pointer transition-colors flex items-center justify-between hover:bg-dark-50 ${!value ? 'bg-primary-50 text-primary-600' : 'text-dark-400'}`}
              >
                <span>{placeholder}</span>
                {!value && <Check className="w-4 h-4" />}
              </div>
            )}
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => { onChange(option.value); setIsOpen(false); }}
                className={`px-4 py-3 cursor-pointer transition-colors flex items-center justify-between ${value === option.value ? 'bg-primary-500 text-white' : 'text-dark-700 hover:bg-dark-50'}`}
              >
                <span>{option.label}</span>
                {value === option.value && <Check className="w-4 h-4" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Multi-Select Dropdown Component
const MultiSelectDropdown = ({ value = [], onChange, options, placeholder, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);

  const toggleOption = (optionValue) => {
    if (selectedValues.includes(optionValue)) {
      onChange(selectedValues.filter(v => v !== optionValue));
    } else {
      onChange([...selectedValues, optionValue]);
    }
  };

  const removeTag = (e, optionValue) => {
    e.stopPropagation();
    onChange(selectedValues.filter(v => v !== optionValue));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-xl focus:border-primary-500 focus:bg-white transition-all text-left flex items-center justify-between min-h-[50px] ${selectedValues.length === 0 ? 'text-dark-400' : 'text-dark-900'}`}
      >
        <div className="flex flex-wrap gap-1.5 flex-1 pr-2">
          {selectedValues.length === 0 ? (
            <span>{placeholder}</span>
          ) : (
            selectedValues.map(val => (
              <span key={val} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-500 text-white text-sm rounded-lg">
                {val}
                <X className="w-3.5 h-3.5 cursor-pointer hover:opacity-80" onClick={(e) => removeTag(e, val)} />
              </span>
            ))
          )}
        </div>
        <ChevronDown className={`w-5 h-5 text-dark-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {required && <input type="text" value={selectedValues.length > 0 ? 'valid' : ''} onChange={() => {}} required className="sr-only" tabIndex={-1} />}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-dark-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {options.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <div
                  key={option.value}
                  onClick={() => toggleOption(option.value)}
                  className={`px-4 py-3 cursor-pointer transition-colors flex items-center gap-3 ${isSelected ? 'bg-primary-50' : 'hover:bg-dark-50'}`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-primary-500 border-primary-500' : 'border-dark-300'}`}>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className={`${isSelected ? 'text-primary-600 font-medium' : 'text-dark-700'}`}>{option.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Skeleton Components
const StatSkeleton = () => (
  <div className="bg-white rounded-xl p-4 shadow-card animate-pulse">
    <div className="h-4 w-16 bg-dark-100 rounded mb-2"></div>
    <div className="h-7 w-12 bg-dark-100 rounded"></div>
  </div>
);

const MenuItemSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-card overflow-hidden animate-pulse">
    <div className="h-44 bg-dark-100"></div>
    <div className="p-4">
      <div className="flex justify-between mb-2">
        <div className="h-5 w-24 bg-dark-100 rounded"></div>
        <div className="h-5 w-12 bg-dark-100 rounded"></div>
      </div>
      <div className="h-3 w-16 bg-dark-100 rounded mb-3"></div>
      <div className="h-4 w-full bg-dark-100 rounded mb-2"></div>
      <div className="h-4 w-3/4 bg-dark-100 rounded mb-4"></div>
      <div className="flex gap-2">
        <div className="h-9 flex-1 bg-dark-100 rounded-xl"></div>
        <div className="h-9 w-10 bg-dark-100 rounded-xl"></div>
      </div>
    </div>
  </div>
);

export default function Menu() {
  const [items, setItems] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ name: '', description: '', price: '', category: [], unit: 'piece', quantity: 1, foodType: 'veg', available: true, preparationTime: 15, tags: '', image: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', image: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all, available, unavailable
  const [foodTypeFilter, setFoodTypeFilter] = useState('all'); // all, veg, nonveg, egg
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: null });
  const units = ['piece', 'kg', 'gram', 'liter', 'ml', 'plate', 'bowl', 'cup', 'slice', 'inch', 'full', 'half', 'small'];
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const initialLoadDone = useRef(false);
  const lastTapRef = useRef({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [categoryImageFile, setCategoryImageFile] = useState(null);
  const [categoryImagePreview, setCategoryImagePreview] = useState('');
  const imageInputRef = useRef(null);
  const categoryImageInputRef = useRef(null);

  // Handle image file selection for menu items
  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle image file selection for categories
  const handleCategoryImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCategoryImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCategoryImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove image for menu items
  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setForm({ ...form, image: '' });
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  // Remove image for categories
  const removeCategoryImage = () => {
    setCategoryImageFile(null);
    setCategoryImagePreview('');
    setCategoryForm({ ...categoryForm, image: '' });
    if (categoryImageInputRef.current) {
      categoryImageInputRef.current.value = '';
    }
  };

  // Double tap handler for pause/resume category
  const handleCategoryDoubleTap = async (cat) => {
    const now = Date.now();
    const lastTap = lastTapRef.current[cat._id] || 0;
    
    if (now - lastTap < 300) {
      // Double tap detected - toggle pause
      try {
        // Optimistic update
        setCategoryList(prev => prev.map(c => 
          c._id === cat._id ? { ...c, isPaused: !c.isPaused } : c
        ));
        await api.patch(`/categories/${cat._id}/toggle-pause`);
        fetchCategories();
      } catch (err) {
        // Revert on error
        setCategoryList(prev => prev.map(c => 
          c._id === cat._id ? { ...c, isPaused: cat.isPaused } : c
        ));
        alert('Failed to toggle pause status');
      }
      lastTapRef.current[cat._id] = 0;
    } else {
      // Single tap - select category
      lastTapRef.current[cat._id] = now;
      setSelectedCategory(cat.name);
    }
  };

  const fetchItems = async () => {
    try {
      if (!initialLoadDone.current) setLoading(true);
      const res = await api.get('/menu');
      setItems(res.data || []);
      initialLoadDone.current = true;
    } catch (err) {
      console.error('Failed to fetch menu:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategoryList(res.data || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  useEffect(() => { fetchItems(); fetchCategories(); }, []);

  const openModal = (item = null) => {
    if (item) {
      setEditing(item);
      const categoryArray = Array.isArray(item.category) ? item.category : (item.category ? [item.category] : []);
      setForm({ name: item.name, description: item.description || '', price: item.price, category: categoryArray, unit: item.unit || 'piece', quantity: item.quantity || 1, foodType: item.foodType || 'veg', available: item.available, preparationTime: item.preparationTime || 15, tags: item.tags?.join(', ') || '', image: item.image || '' });
      setImagePreview(item.image || '');
      setImageFile(null);
    } else {
      setEditing(null);
      setForm({ name: '', description: '', price: '', category: [], unit: 'piece', quantity: 1, foodType: 'veg', available: true, preparationTime: 15, tags: '', image: '' });
      setImagePreview('');
      setImageFile(null);
    }
    setShowModal(true);
  };

  const generateDescription = async () => {
    if (!form.name || form.category.length === 0) return alert('Enter name and category first');
    setAiLoading(true);
    try {
      const res = await api.post('/ai/generate-description', { name: form.name, category: form.category });
      setForm({ ...form, description: res.data.description });
    } catch (err) {
      alert('Failed to generate description');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return; // Prevent double submission
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('description', form.description);
      formData.append('price', form.price);
      formData.append('category', JSON.stringify(form.category));
      formData.append('unit', form.unit);
      formData.append('quantity', form.quantity);
      formData.append('foodType', form.foodType);
      formData.append('available', form.available);
      formData.append('preparationTime', form.preparationTime);
      formData.append('tags', form.tags);
      
      // Handle image
      if (imageFile) {
        formData.append('image', imageFile);
      } else if (!imagePreview && editing?.image) {
        // Image was removed
        formData.append('removeImage', 'true');
      }
      
      if (editing) {
        await api.put(`/menu/${editing._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/menu', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      setShowModal(false);
      setImageFile(null);
      setImagePreview('');
      fetchItems();
    } catch (err) {
      alert('Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = (id, itemName) => {
    setConfirmDialog({
      show: true,
      title: 'Delete Item',
      message: `Are you sure you want to delete "${itemName}"?`,
      onConfirm: async () => {
        setDeleting(true);
        try {
          await api.delete(`/menu/${id}`);
          fetchItems();
        } catch (err) {
          alert('Failed to delete');
        } finally {
          setDeleting(false);
          setConfirmDialog({ show: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  const toggleAvailability = async (item) => {
    // Optimistic update
    setItems(prev => prev.map(i => i._id === item._id ? { ...i, available: !i.available } : i));
    try {
      const tags = Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || '');
      await api.put(`/menu/${item._id}`, { ...item, available: !item.available, tags });
    } catch (err) {
      // Revert on error
      setItems(prev => prev.map(i => i._id === item._id ? { ...i, available: item.available } : i));
      alert('Failed to update availability');
    }
  };

  const categories = [...new Set(items.flatMap(i => Array.isArray(i.category) ? i.category : [i.category]))];
  
  // Get paused category names
  const pausedCategoryNames = categoryList.filter(c => c.isPaused).map(c => c.name);
  
  // Helper function to check if item is paused (either item itself or all its categories are paused)
  const isItemPaused = (item) => {
    // Check if item itself is paused
    if (item.isPaused) return true;
    
    // Check if all categories of this item are paused
    const itemCategories = Array.isArray(item.category) ? item.category : [item.category];
    return itemCategories.every(cat => pausedCategoryNames.includes(cat));
  };

  const filteredItems = items.filter(item => {
    const itemCategories = Array.isArray(item.category) ? item.category : [item.category];
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      itemCategories.some(cat => cat?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || itemCategories.includes(selectedCategory);
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'available' && item.available) || 
      (statusFilter === 'unavailable' && !item.available);
    const matchesFoodType = foodTypeFilter === 'all' || item.foodType === foodTypeFilter;
    return matchesSearch && matchesCategory && matchesStatus && matchesFoodType;
  });
  const filteredCategories = [...new Set(filteredItems.flatMap(i => Array.isArray(i.category) ? i.category : [i.category]))];
  const showSkeleton = loading && items.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input type="text" placeholder="Search menu items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2.5 bg-white border border-dark-200 rounded-xl w-full focus:border-primary-500 transition-colors" />
        </div>
        <button onClick={() => setShowCategoryModal(true)} className="flex items-center justify-center bg-dark-800 text-white p-2.5 rounded-xl hover:bg-dark-900 transition-colors">
          <FolderPlus className="w-5 h-5" />
        </button>
        <button onClick={() => openModal()} className="flex items-center justify-center gradient-primary text-white p-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-primary-500/30">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Status Filter */}
        <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-card">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${statusFilter === 'all' ? 'bg-dark-800 text-white' : 'text-dark-600 hover:bg-dark-50'}`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('available')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${statusFilter === 'available' ? 'bg-green-500 text-white' : 'text-dark-600 hover:bg-dark-50'}`}
          >
            Available
          </button>
          <button
            onClick={() => setStatusFilter('unavailable')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${statusFilter === 'unavailable' ? 'bg-red-500 text-white' : 'text-dark-600 hover:bg-dark-50'}`}
          >
            Unavailable
          </button>
        </div>

        {/* Food Type Filter */}
        <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-card">
          <button
            onClick={() => setFoodTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${foodTypeFilter === 'all' ? 'bg-dark-800 text-white' : 'text-dark-600 hover:bg-dark-50'}`}
          >
            All
          </button>
          <button
            onClick={() => setFoodTypeFilter('veg')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${foodTypeFilter === 'veg' ? 'bg-green-500 text-white' : 'text-dark-600 hover:bg-dark-50'}`}
          >
            <span className={`w-3 h-3 rounded border-2 ${foodTypeFilter === 'veg' ? 'border-white bg-white' : 'border-green-600'}`}>
              <span className={`block w-1.5 h-1.5 rounded-full mx-auto mt-0.5 ${foodTypeFilter === 'veg' ? 'bg-green-500' : 'bg-green-600'}`}></span>
            </span>
            Veg
          </button>
          <button
            onClick={() => setFoodTypeFilter('nonveg')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${foodTypeFilter === 'nonveg' ? 'bg-red-500 text-white' : 'text-dark-600 hover:bg-dark-50'}`}
          >
            <span className={`w-3 h-3 rounded border-2 ${foodTypeFilter === 'nonveg' ? 'border-white bg-white' : 'border-red-600'}`}>
              <span className={`block w-1.5 h-1.5 rounded-full mx-auto mt-0.5 ${foodTypeFilter === 'nonveg' ? 'bg-red-500' : 'bg-red-600'}`}></span>
            </span>
            Non-Veg
          </button>
          <button
            onClick={() => setFoodTypeFilter('egg')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${foodTypeFilter === 'egg' ? 'bg-yellow-500 text-white' : 'text-dark-600 hover:bg-dark-50'}`}
          >
            <span className={`w-3 h-3 rounded border-2 ${foodTypeFilter === 'egg' ? 'border-white bg-white' : 'border-yellow-500'}`}>
              <span className={`block w-1.5 h-1.5 rounded-full mx-auto mt-0.5 ${foodTypeFilter === 'egg' ? 'bg-yellow-500' : 'bg-yellow-500'}`}></span>
            </span>
            Egg
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {showSkeleton ? (
          <><StatSkeleton /><StatSkeleton /><StatSkeleton /><StatSkeleton /></>
        ) : (
          <>
            <div className="bg-white rounded-xl p-4 shadow-card">
              <p className="text-dark-400 text-sm">Total Items</p>
              <p className="text-2xl font-bold text-dark-900 mt-1">{items.length}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-card">
              <p className="text-dark-400 text-sm">Categories</p>
              <p className="text-2xl font-bold text-dark-900 mt-1">{categories.length}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-card">
              <p className="text-dark-400 text-sm">Available</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{items.filter(i => i.available).length}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-card">
              <p className="text-dark-400 text-sm">Unavailable</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{items.filter(i => !i.available).length}</p>
            </div>
          </>
        )}
      </div>

      {/* Horizontal Category Filter */}
      {categoryList.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-card">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className="flex flex-col items-center min-w-[80px] transition-all"
            >
              <div className="w-16 h-16 rounded-full overflow-hidden mb-2">
                <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                  <span className="text-white text-xl font-bold">All</span>
                </div>
              </div>
              <span className={`text-sm font-medium ${selectedCategory === 'all' ? 'text-primary-600' : 'text-dark-600'}`}>All</span>
              {selectedCategory === 'all' && <div className="w-8 h-1 bg-primary-500 rounded-full mt-1"></div>}
            </button>
            {categoryList.map(cat => (
              <button
                key={cat._id}
                onClick={() => handleCategoryDoubleTap(cat)}
                className={`flex flex-col items-center min-w-[80px] transition-all relative ${cat.isPaused ? 'opacity-60' : ''}`}
                title="Double tap to pause/resume"
              >
                <div className={`w-16 h-16 rounded-full overflow-hidden mb-2 bg-dark-100 ${cat.isPaused ? 'ring-2 ring-yellow-400' : ''}`}>
                  {cat.image ? (
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-dark-200 flex items-center justify-center">
                      <Image className="w-6 h-6 text-dark-400" />
                    </div>
                  )}
                </div>
                <span className={`text-sm font-medium ${selectedCategory === cat.name ? 'text-primary-600' : cat.isPaused ? 'text-yellow-600' : 'text-dark-600'}`}>{cat.name}</span>
                {cat.isPaused && <span className="text-xs text-yellow-500">Paused</span>}
                {selectedCategory === cat.name && <div className="w-8 h-1 bg-primary-500 rounded-full mt-1"></div>}
              </button>
            ))}
            {/* Add New Category Button */}
            <button
              onClick={() => {
                setEditingCategory(null);
                setCategoryForm({ name: '', description: '', image: '' });
                setShowCategoryModal(true);
              }}
              className="flex flex-col items-center min-w-[80px] transition-all"
            >
              <div className="w-16 h-16 rounded-full overflow-hidden mb-2 bg-dark-100 hover:bg-dark-200 border-2 border-dashed border-dark-300 flex items-center justify-center transition-colors">
                <Plus className="w-6 h-6 text-dark-400" />
              </div>
              <span className="text-sm font-medium text-dark-500">Add New</span>
            </button>
          </div>
        </div>
      )}

      {showSkeleton ? (
        <div className="space-y-8">
          <div>
            <div className="h-6 w-32 bg-dark-100 rounded mb-4 animate-pulse"></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              <MenuItemSkeleton /><MenuItemSkeleton /><MenuItemSkeleton /><MenuItemSkeleton />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {(selectedCategory !== 'all' ? [selectedCategory] : filteredCategories).map(cat => {
            const itemsInCategory = filteredItems.filter(i => {
              const itemCats = Array.isArray(i.category) ? i.category : [i.category];
              return itemCats.includes(cat);
            });
            if (itemsInCategory.length === 0) return null;
            return (
            <div key={cat}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-bold text-dark-900">{cat}</h2>
                <span className="px-2.5 py-1 bg-dark-100 rounded-full text-xs font-medium text-dark-500">
                  {itemsInCategory.length} items
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {itemsInCategory.map(item => {
                  const isPaused = isItemPaused(item);
                  return (
                  <div key={item._id} className={`bg-white rounded-2xl shadow-card overflow-hidden card-hover group ${isPaused ? 'ring-2 ring-yellow-300 bg-gray-50' : ''}`}>
                    <div className={`h-44 bg-dark-100 relative overflow-hidden ${isPaused ? 'grayscale opacity-60' : ''}`}>
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-12 h-12 text-dark-300" />
                        </div>
                      )}
                      {item.foodType && (
                        <div className="absolute top-3 left-3">
                          <span className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isPaused ? 'border-gray-400 bg-white' : item.foodType === 'veg' ? 'border-green-600 bg-white' : item.foodType === 'egg' ? 'border-yellow-500 bg-white' : 'border-red-600 bg-white'}`}>
                            <span className={`w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-gray-400' : item.foodType === 'veg' ? 'bg-green-600' : item.foodType === 'egg' ? 'bg-yellow-500' : 'bg-red-600'}`}></span>
                          </span>
                        </div>
                      )}
                      {isPaused ? (
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-400 text-yellow-900 flex items-center gap-1">
                          <Pause className="w-3 h-3" /> Paused
                        </div>
                      ) : (
                        <button onClick={() => toggleAvailability(item)}
                          className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${item.available ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                          {item.available ? 'Available' : 'Unavailable'}
                        </button>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className={`font-semibold line-clamp-1 ${isPaused ? 'text-gray-400' : 'text-dark-900'}`}>{item.name}</h3>
                        <span className={`font-bold whitespace-nowrap ${isPaused ? 'text-gray-400' : 'text-primary-600'}`}>₹{item.price}</span>
                      </div>
                      <p className={`text-xs mb-2 ${isPaused ? 'text-gray-400' : 'text-dark-400'}`}>{item.quantity || 1} {item.unit || 'piece'}</p>
                      {item.description && <p className={`text-sm line-clamp-2 mb-3 ${isPaused ? 'text-gray-400' : 'text-dark-500'}`}>{item.description}</p>}
                      {item.preparationTime && (
                        <div className={`flex items-center gap-1 text-xs mb-3 ${isPaused ? 'text-gray-400' : 'text-dark-400'}`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{item.preparationTime} min</span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => openModal(item)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-dark-50 text-dark-700 rounded-xl text-sm font-medium hover:bg-dark-100 transition-colors">
                          <Edit className="w-4 h-4" /> Edit
                        </button>
                        <button onClick={() => deleteItem(item._id, item.name)} className="flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 rounded-xl text-sm hover:bg-red-100 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );})}
              </div>
            </div>
          );
          })}
          {filteredCategories.length === 0 && (
            <div className="bg-white rounded-2xl shadow-card p-12 text-center">
              <Image className="w-16 h-16 text-dark-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-dark-700">No items found</h3>
              <p className="text-dark-400 mt-1">{searchTerm ? 'Try a different search' : 'Add your first menu item'}</p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-backdrop !mt-0" onClick={() => setShowModal(false)}>
          <div className="modal-content w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-dark-100">
              <h2 className="text-xl font-bold text-dark-900">{editing ? 'Edit Item' : 'Add New Item'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-dark-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-dark-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-xl focus:border-primary-500 focus:bg-white transition-all" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">Category</label>
                <MultiSelectDropdown
                  value={form.category}
                  onChange={(val) => setForm({ ...form, category: val })}
                  options={categoryList.map(cat => ({ value: cat.name, label: cat.name }))}
                  placeholder="Select Categories"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">Description</label>
                <div className="relative">
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-xl focus:border-primary-500 focus:bg-white transition-all pr-12" rows={3} />
                  <button type="button" onClick={generateDescription} disabled={aiLoading}
                    className="absolute right-3 top-3 p-2 text-accent-500 hover:bg-accent-50 rounded-lg transition-colors" title="Generate with AI">
                    <Sparkles className={`w-5 h-5 ${aiLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-dark-700 mb-2">Price (₹)</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-xl focus:border-primary-500 focus:bg-white transition-all" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-dark-700 mb-2">Prep Time (min)</label>
                  <input type="number" value={form.preparationTime} onChange={(e) => setForm({ ...form, preparationTime: e.target.value })}
                    className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-xl focus:border-primary-500 focus:bg-white transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-dark-700 mb-2">Quantity</label>
                  <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-xl focus:border-primary-500 focus:bg-white transition-all" min="1" step="0.5" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-dark-700 mb-2">Unit</label>
                  <CustomDropdown
                    value={form.unit}
                    onChange={(val) => setForm({ ...form, unit: val })}
                    options={units.map(u => ({ value: u, label: u }))}
                    placeholder=""
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">Image</label>
                <div className="space-y-3">
                  {/* Image Preview */}
                  {(imagePreview || form.image) && (
                    <div className="relative rounded-xl overflow-hidden border border-dark-200 h-40 bg-dark-100">
                      <img src={imagePreview || form.image} alt="Preview" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {/* Upload Button */}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    ref={imageInputRef}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-dark-50 border border-dark-200 border-dashed rounded-xl hover:bg-dark-100 transition-colors text-dark-600"
                  >
                    <Upload className="w-5 h-5" />
                    {imagePreview || form.image ? 'Change Image' : 'Upload Image'}
                  </button>
                  <p className="text-dark-400 text-xs">Images are automatically optimized for WhatsApp</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">Tags (comma separated)</label>
                <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-xl focus:border-primary-500 focus:bg-white transition-all" placeholder="spicy, popular, bestseller" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-3">Food Type</label>
                <div className="flex gap-3">
                  {[{ value: 'veg', label: 'Veg', color: 'green' }, { value: 'nonveg', label: 'Non-Veg', color: 'red' }, { value: 'egg', label: 'Egg', color: 'yellow' }].map(type => (
                    <label key={type.value} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${form.foodType === type.value ? (type.color === 'green' ? 'border-green-500 bg-green-50' : type.color === 'red' ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50') : 'border-dark-200 hover:border-dark-300'}`}>
                      <input type="radio" name="foodType" value={type.value} checked={form.foodType === type.value} onChange={(e) => setForm({ ...form, foodType: e.target.value })} className="hidden" />
                      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ${type.color === 'green' ? 'border-green-600' : type.color === 'red' ? 'border-red-600' : 'border-yellow-500'}`}>
                        <span className={`w-2 h-2 rounded-full ${type.color === 'green' ? 'bg-green-600' : type.color === 'red' ? 'bg-red-600' : 'bg-yellow-500'}`}></span>
                      </span>
                      <span className="font-medium text-sm">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-3">Availability</label>
                <div className="flex gap-4">
                  <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${form.available ? 'border-green-500 bg-green-50' : 'border-dark-200 hover:border-dark-300'}`}>
                    <input type="radio" name="availability" checked={form.available === true} onChange={() => setForm({ ...form, available: true })} className="hidden" />
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="font-medium text-sm">Available</span>
                  </label>
                  <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${!form.available ? 'border-red-500 bg-red-50' : 'border-dark-200 hover:border-dark-300'}`}>
                    <input type="radio" name="availability" checked={form.available === false} onChange={() => setForm({ ...form, available: false })} className="hidden" />
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="font-medium text-sm">Unavailable</span>
                  </label>
                </div>
              </div>
              <button 
                type="submit" 
                disabled={saving}
                className={`w-full gradient-primary text-white py-3.5 rounded-xl font-semibold transition-opacity shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2 ${saving ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {editing ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  editing ? 'Update Item' : 'Add Item'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="modal-backdrop !mt-0" onClick={() => { setShowCategoryModal(false); setEditingCategory(null); setCategoryForm({ name: '', description: '', image: '' }); setCategoryImageFile(null); setCategoryImagePreview(''); }}>
          <div className="modal-content w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-dark-100">
              <h2 className="text-xl font-bold text-dark-900">{editingCategory ? 'Edit Category' : 'Manage Categories'}</h2>
              <button onClick={() => { setShowCategoryModal(false); setEditingCategory(null); setCategoryForm({ name: '', description: '', image: '' }); setCategoryImageFile(null); setCategoryImagePreview(''); }} className="p-2 hover:bg-dark-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-dark-500" />
              </button>
            </div>
            <div className="p-5">
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!categoryForm.name.trim()) return;
                if (savingCategory) return; // Prevent double submission
                setSavingCategory(true);
                try {
                  const formData = new FormData();
                  formData.append('name', categoryForm.name);
                  formData.append('description', categoryForm.description || '');
                  
                  // Handle image
                  if (categoryImageFile) {
                    formData.append('image', categoryImageFile);
                  } else if (!categoryImagePreview && editingCategory?.image) {
                    // Image was removed
                    formData.append('removeImage', 'true');
                  }
                  
                  if (editingCategory) {
                    await api.put(`/categories/${editingCategory._id}`, formData, {
                      headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    setEditingCategory(null);
                  } else {
                    await api.post('/categories', formData, {
                      headers: { 'Content-Type': 'multipart/form-data' }
                    });
                  }
                  setCategoryForm({ name: '', description: '', image: '' });
                  setCategoryImageFile(null);
                  setCategoryImagePreview('');
                  fetchCategories();
                } catch (err) {
                  alert(err.response?.data?.error || 'Failed to save category');
                } finally {
                  setSavingCategory(false);
                }
              }} className="space-y-3 mb-5">
                <input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="Category name" className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-xl focus:border-primary-500 focus:bg-white transition-all" required />
                {/* Category Image Upload */}
                <div className="space-y-2">
                  {(categoryImagePreview || categoryForm.image) && (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-dark-200 bg-dark-100 mx-auto">
                      <img src={categoryImagePreview || categoryForm.image} alt="Preview" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                      <button
                        type="button"
                        onClick={removeCategoryImage}
                        className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCategoryImageFileChange}
                    ref={categoryImageInputRef}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => categoryImageInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-dark-50 border border-dark-200 border-dashed rounded-xl hover:bg-dark-100 transition-colors text-dark-600 text-sm"
                  >
                    <Upload className="w-4 h-4" />
                    {categoryImagePreview || categoryForm.image ? 'Change Image' : 'Upload Image (optional)'}
                  </button>
                </div>
                <div className="flex gap-2">
                  {editingCategory && (
                    <button type="button" onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '', image: '' }); setCategoryImageFile(null); setCategoryImagePreview(''); }}
                      className="flex-1 bg-dark-100 text-dark-700 px-5 py-3 rounded-xl font-medium hover:bg-dark-200 transition-colors">Cancel</button>
                  )}
                  <button 
                    type="submit" 
                    disabled={savingCategory}
                    className={`flex-1 gradient-primary text-white px-5 py-3 rounded-xl font-medium transition-opacity flex items-center justify-center gap-2 ${savingCategory ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`}
                  >
                    {savingCategory ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {editingCategory ? 'Updating...' : 'Adding...'}
                      </>
                    ) : (
                      editingCategory ? 'Update Category' : 'Add Category'
                    )}
                  </button>
                </div>
              </form>
              <div className="flex flex-wrap gap-3 max-h-64 overflow-y-auto">
                {categoryList.length === 0 ? (
                  <p className="text-dark-400 text-center py-8 w-full">No categories yet</p>
                ) : (
                  categoryList.map(cat => (
                    <div key={cat._id} className={`flex flex-col items-center p-3 rounded-xl relative group ${cat.isPaused ? 'bg-yellow-50 border-2 border-yellow-300' : 'bg-dark-50'}`}>
                      <div className={`w-16 h-16 rounded-full overflow-hidden bg-dark-200 mb-2 ${cat.isPaused ? 'opacity-50' : ''}`}>
                        {cat.image ? (
                          <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-6 h-6 text-dark-400" />
                          </div>
                        )}
                      </div>
                      <span className={`font-medium text-sm text-center ${cat.isPaused ? 'text-yellow-700' : 'text-dark-800'}`}>{cat.name}</span>
                      {cat.isPaused && <span className="text-xs text-yellow-600 font-medium">Paused</span>}
                      {/* Pause/Resume button */}
                      <button onClick={async () => {
                        try {
                          await api.patch(`/categories/${cat._id}/toggle-pause`);
                          fetchCategories();
                        } catch (err) {
                          alert('Failed to toggle pause status');
                        }
                      }} className={`absolute -top-1 left-1/2 -translate-x-1/2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${cat.isPaused ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}`} title={cat.isPaused ? 'Resume category' : 'Pause category'}>
                        {cat.isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                      </button>
                      {/* Edit button */}
                      <button onClick={() => {
                        setEditingCategory(cat);
                        setCategoryForm({ name: cat.name, description: cat.description || '', image: cat.image || '' });
                        setCategoryImagePreview(cat.image || '');
                        setCategoryImageFile(null);
                      }} className="absolute -top-1 -left-1 p-1.5 bg-primary-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit className="w-3 h-3" />
                      </button>
                      {/* Delete button */}
                      <button onClick={() => {
                        // Count items that will be affected
                        const itemsInCategory = items.filter(item => {
                          const itemCats = Array.isArray(item.category) ? item.category : [item.category];
                          return itemCats.includes(cat.name);
                        });
                        const itemsToDelete = itemsInCategory.filter(item => {
                          const itemCats = Array.isArray(item.category) ? item.category : [item.category];
                          return itemCats.length === 1;
                        });
                        const itemsToUpdate = itemsInCategory.filter(item => {
                          const itemCats = Array.isArray(item.category) ? item.category : [item.category];
                          return itemCats.length > 1;
                        });
                        
                        let warningMessage = `Are you sure you want to delete "${cat.name}" category?\n\n`;
                        if (itemsToDelete.length > 0) {
                          warningMessage += `⚠️ ${itemsToDelete.length} item(s) will be PERMANENTLY DELETED (they only belong to this category)\n`;
                        }
                        if (itemsToUpdate.length > 0) {
                          warningMessage += `📝 ${itemsToUpdate.length} item(s) will have this category removed\n`;
                        }
                        if (itemsInCategory.length === 0) {
                          warningMessage += `No items are linked to this category.`;
                        }
                        
                        setConfirmDialog({
                          show: true,
                          title: 'Delete Category',
                          message: warningMessage,
                          itemsToDelete: itemsToDelete.length,
                          itemsToUpdate: itemsToUpdate.length,
                          onConfirm: async () => {
                            setDeleting(true);
                            try {
                              await api.delete(`/categories/${cat._id}`);
                              fetchCategories();
                              fetchItems();
                            } catch (err) {
                              alert('Failed to delete category');
                            } finally {
                              setDeleting(false);
                              setConfirmDialog({ show: false, title: '', message: '', onConfirm: null });
                            }
                          }
                        });
                      }} className="absolute -top-1 -right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog.show && (
        <div className="modal-backdrop !mt-0" onClick={() => !deleting && setConfirmDialog({ show: false, title: '', message: '', onConfirm: null })}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-dark-900 mb-2">{confirmDialog.title}</h3>
              <div className="text-dark-500 text-left whitespace-pre-line">{confirmDialog.message}</div>
              {(confirmDialog.itemsToDelete > 0) && (
                <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-200">
                  <p className="text-red-600 text-sm font-medium">
                    ⚠️ {confirmDialog.itemsToDelete} item(s) will be permanently deleted!
                  </p>
                </div>
              )}
            </div>
            <div className="flex border-t border-dark-100">
              <button
                onClick={() => setConfirmDialog({ show: false, title: '', message: '', onConfirm: null })}
                disabled={deleting}
                className={`flex-1 px-6 py-4 text-dark-600 font-medium transition-colors ${deleting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-dark-50'}`}
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                disabled={deleting}
                className={`flex-1 px-6 py-4 bg-red-500 text-white font-medium transition-colors flex items-center justify-center gap-2 ${deleting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-red-600'}`}
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
