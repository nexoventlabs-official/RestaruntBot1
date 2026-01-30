import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView,
  RefreshControl, TouchableOpacity, Image, Alert, ActivityIndicator,
  TextInput, Modal, Animated, Platform, StatusBar, ImageBackground, KeyboardAvoidingView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../config/api';
import CategoryScheduleModal from '../../components/CategoryScheduleModal';

// Zomato Theme Colors
const ZOMATO_RED = '#E23744';
const ZOMATO_DARK_RED = '#CB1A27';

// Day names for schedule display
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Format time from 24-hour to 12-hour with AM/PM
const formatTime12Hour = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Get next schedule time for a category (handles custom days)
const getNextScheduleTime = (schedule) => {
  if (!schedule || !schedule.enabled) return null;
  
  // For custom schedules with custom days
  if (schedule.type === 'custom' && schedule.customDays && schedule.customDays.length > 0) {
    const now = new Date();
    const currentDay = now.getDay();
    const currentHours = now.getHours();
    const currentMins = now.getMinutes();
    const currentMinutes = currentHours * 60 + currentMins;
    
    // Find today's schedule
    const todaySchedule = schedule.customDays.find(d => d.day === currentDay && d.enabled);
    
    if (todaySchedule) {
      const [startH, startM] = todaySchedule.startTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      
      // If we're before today's start time, show today's schedule
      if (currentMinutes < startMinutes) {
        return {
          day: DAY_NAMES[currentDay],
          startTime: todaySchedule.startTime,
          endTime: todaySchedule.endTime,
          isToday: true
        };
      }
      
      // If we're within today's schedule
      const [endH, endM] = todaySchedule.endTime.split(':').map(Number);
      const endMinutes = endH * 60 + endM;
      if (currentMinutes < endMinutes || endMinutes < startMinutes) {
        return {
          day: DAY_NAMES[currentDay],
          startTime: todaySchedule.startTime,
          endTime: todaySchedule.endTime,
          isToday: true,
          isActive: true
        };
      }
    }
    
    // Find next enabled day
    for (let i = 1; i <= 7; i++) {
      const nextDay = (currentDay + i) % 7;
      const nextSchedule = schedule.customDays.find(d => d.day === nextDay && d.enabled);
      if (nextSchedule) {
        return {
          day: DAY_NAMES[nextDay],
          startTime: nextSchedule.startTime,
          endTime: nextSchedule.endTime,
          isToday: false
        };
      }
    }
    
    return null;
  }
  
  // For daily schedule or custom with same time for all days
  if (schedule.startTime && schedule.endTime) {
    return {
      day: null,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      isDaily: true
    };
  }
  
  return null;
};

// Format schedule display text
const formatScheduleDisplay = (schedule) => {
  const nextSchedule = getNextScheduleTime(schedule);
  if (!nextSchedule) return '';
  
  const startFormatted = formatTime12Hour(nextSchedule.startTime);
  const endFormatted = formatTime12Hour(nextSchedule.endTime);
  
  if (nextSchedule.isDaily) {
    return `${startFormatted} - ${endFormatted}`;
  }
  
  if (nextSchedule.isToday) {
    return `Today ${startFormatted} - ${endFormatted}`;
  }
  
  return `${nextSchedule.day} ${startFormatted} - ${endFormatted}`;
};

export default function AdminMenuScreen({ navigation, route }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [foodTypeFilter, setFoodTypeFilter] = useState(route?.params?.foodTypeFilter || 'all');
  const [togglingId, setTogglingId] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const shineAnim = useRef(new Animated.Value(-1)).current;

  // Category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryImage, setCategoryImage] = useState(null);
  const [categoryImagePreview, setCategoryImagePreview] = useState('');
  const [pickingCategoryImage, setPickingCategoryImage] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState(null);

  // Schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleCategory, setScheduleCategory] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    enabled: false,
    type: 'daily',
    startTime: '09:00',
    endTime: '22:00',
    days: []
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Glass shine effect
    setTimeout(() => {
      Animated.timing(shineAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 300);
  }, []);

  const fetchMenu = useCallback(async () => {
    try {
      const response = await api.get('/menu');
      const menuData = response.data || [];
      setItems(menuData);
      
      // Prefetch images for faster loading
      menuData.forEach(item => {
        if (item.image) {
          Image.prefetch(item.image).catch(() => {});
        }
      });
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('/categories');
      const categoryData = response.data || [];
      setCategories(categoryData);
      
      // Prefetch category images for faster loading
      categoryData.forEach(cat => {
        if (cat.image) {
          Image.prefetch(cat.image).catch(() => {});
        }
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
    fetchCategories();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchMenu();
      fetchCategories();
    });
    return unsubscribe;
  }, [navigation]);

  // Update food type filter when route params change
  useEffect(() => {
    if (route?.params?.resetFilters) {
      // Reset all filters when coming from tab bar
      setFoodTypeFilter('all');
      setStatusFilter('all');
      setSelectedCategory('all');
      setSearchTerm('');
    } else if (route?.params?.foodTypeFilter !== undefined) {
      setFoodTypeFilter(route.params.foodTypeFilter);
    }
  }, [route?.params?.foodTypeFilter, route?.params?.resetFilters]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchMenu(), fetchCategories()]);
  }, []);

  const toggleAvailability = async (item) => {
    setTogglingId(item._id);
    setItems(prev => prev.map(i => i._id === item._id ? { ...i, available: !i.available } : i));
    try {
      const tags = Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || '');
      await api.put(`/menu/${item._id}`, { ...item, available: !item.available, tags });
    } catch (error) {
      setItems(prev => prev.map(i => i._id === item._id ? { ...i, available: item.available } : i));
      Alert.alert('Error', 'Failed to update availability');
    } finally {
      setTogglingId(null);
    }
  };

  const deleteItem = (item) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setTogglingId(item._id);
              await api.delete(`/menu/${item._id}`);
              setItems(items.filter(i => i._id !== item._id));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item');
            } finally {
              setTogglingId(null);
            }
          },
        },
      ]
    );
  };

  // Category functions
  const openCategoryModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ name: category.name });
      setCategoryImagePreview(category.image || '');
      setCategoryImage(null);
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '' });
      setCategoryImagePreview('');
      setCategoryImage(null);
    }
    setShowCategoryModal(true);
  };

  const pickCategoryImage = async () => {
    setPickingCategoryImage(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled) {
        setCategoryImage(result.assets[0]);
        setCategoryImagePreview(result.assets[0].uri);
      }
    } finally {
      setPickingCategoryImage(false);
    }
  };

  const removeCategoryImage = () => {
    setCategoryImage(null);
    setCategoryImagePreview('');
  };

  const saveCategory = async () => {
    if (!categoryForm.name.trim()) {
      Alert.alert('Error', 'Category name is required');
      return;
    }
    setSavingCategory(true);
    try {
      const formData = new FormData();
      formData.append('name', categoryForm.name);
      formData.append('description', '');

      if (categoryImage) {
        const filename = categoryImage.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('image', { uri: categoryImage.uri, name: filename, type });
      } else if (!categoryImagePreview && editingCategory?.image) {
        formData.append('removeImage', 'true');
      }

      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/categories', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setShowCategoryModal(false);
      setCategoryImage(null);
      setCategoryImagePreview('');
      fetchCategories();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to save category');
    } finally {
      setSavingCategory(false);
    }
  };

  const deleteCategory = (category) => {
    Alert.alert(
      'Delete Category',
      `Delete "${category.name}"? Items in this category won't be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingCategoryId(category._id);
              await api.delete(`/categories/${category._id}`);
              fetchCategories();
              if (selectedCategory === category.name) {
                setSelectedCategory('all');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete category');
            } finally {
              setDeletingCategoryId(null);
            }
          },
        },
      ]
    );
  };

  // Schedule functions
  const openScheduleModal = (category) => {
    setScheduleCategory(category);
    setScheduleForm({
      enabled: category.schedule?.enabled || false,
      type: category.schedule?.type || 'daily',
      startTime: category.schedule?.startTime || '09:00',
      endTime: category.schedule?.endTime || '22:00',
      days: category.schedule?.days || [],
      customDays: category.schedule?.customDays || []
    });
    setShowScheduleModal(true);
  };

  const saveSchedule = async () => {
    try {
      setSavingCategory(true);
      console.log('Saving schedule:', scheduleForm);
      
      const response = await api.patch(`/categories/${scheduleCategory._id}/schedule`, scheduleForm);
      console.log('Schedule save response:', response.data);
      console.log('Response isPaused:', response.data.isPaused);
      
      // Update the category in state immediately with the response
      setCategories(prev => prev.map(cat => 
        cat._id === scheduleCategory._id ? response.data : cat
      ));
      
      // Also fetch all categories after a delay to ensure consistency
      setTimeout(() => fetchCategories(), 500);
      
      setShowScheduleModal(false);
      Alert.alert('Success', `Schedule saved. Category is now ${response.data.isPaused ? 'paused' : 'active'}.`);
    } catch (error) {
      console.error('Schedule save error:', error);
      console.error('Error response:', error.response?.data);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save schedule');
    } finally {
      setSavingCategory(false);
    }
  };

  const toggleDay = (day) => {
    setScheduleForm(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day].sort()
    }));
  };

  // Toggle sold out status for category
  const toggleCategorySoldOut = async (category) => {
    try {
      setCategories(prev => prev.map(c =>
        c._id === category._id ? { ...c, isSoldOut: !c.isSoldOut } : c
      ));
      await api.patch(`/categories/${category._id}/toggle-soldout`);
      fetchCategories();
      fetchMenu(); // Refresh menu items too
    } catch (error) {
      setCategories(prev => prev.map(c =>
        c._id === category._id ? { ...c, isSoldOut: category.isSoldOut } : c
      ));
      Alert.alert('Error', 'Failed to toggle sold out status');
    }
  };

  // Show sold out options for category
  const showSoldOutOptions = (category) => {
    const isSoldOut = category.isSoldOut;
    
    Alert.alert(
      isSoldOut ? 'Resume Category' : 'Mark as Sold Out',
      isSoldOut 
        ? `"${category.name}" is currently sold out. Do you want to mark it as available again?`
        : `How would you like to mark "${category.name}" as sold out?`,
      isSoldOut ? [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark Available', onPress: () => toggleCategorySoldOut(category) },
      ] : [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sold Out Now', onPress: () => toggleCategorySoldOut(category) },
        { text: 'Schedule Time', onPress: () => showSoldOutScheduleModal(category) },
      ]
    );
  };

  // Sold out schedule modal state
  const [showSoldOutModal, setShowSoldOutModal] = useState(false);
  const [soldOutCategory, setSoldOutCategory] = useState(null);
  const [soldOutEndTime, setSoldOutEndTime] = useState('17:00');

  const showSoldOutScheduleModal = (category) => {
    setSoldOutCategory(category);
    // Default to 1 hour from now
    const now = new Date();
    const hours = (now.getHours() + 1) % 24;
    setSoldOutEndTime(`${hours.toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    setShowSoldOutModal(true);
  };

  const saveSoldOutSchedule = async () => {
    if (!soldOutCategory) return;
    
    try {
      setSavingCategory(true);
      await api.patch(`/categories/${soldOutCategory._id}/schedule-soldout`, {
        enabled: true,
        endTime: soldOutEndTime
      });
      
      fetchCategories();
      fetchMenu();
      setShowSoldOutModal(false);
      
      // Format time for display
      const [hours, mins] = soldOutEndTime.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours % 12 || 12;
      Alert.alert('Success', `"${soldOutCategory.name}" marked sold out until ${hours12}:${mins.toString().padStart(2, '0')} ${period}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to schedule sold out');
    } finally {
      setSavingCategory(false);
    }
  };

  // Helper to format time remaining for sold out
  const getSoldOutTimeRemaining = (category) => {
    if (!category.soldOutSchedule?.enabled || !category.soldOutSchedule?.endTime) {
      return null;
    }
    
    const [endHour, endMin] = category.soldOutSchedule.endTime.split(':').map(Number);
    const [hours, mins] = soldOutEndTime.split(':').map(Number);
    const period = endHour >= 12 ? 'PM' : 'AM';
    const hours12 = endHour % 12 || 12;
    
    return `Until ${hours12}:${endMin.toString().padStart(2, '0')} ${period}`;
  };

  const toggleCategoryPause = async (category) => {
    try {
      setCategories(prev => prev.map(c =>
        c._id === category._id ? { ...c, isPaused: !c.isPaused } : c
      ));
      await api.patch(`/categories/${category._id}/toggle-pause`);
      fetchCategories();
    } catch (error) {
      setCategories(prev => prev.map(c =>
        c._id === category._id ? { ...c, isPaused: category.isPaused } : c
      ));
      Alert.alert('Error', 'Failed to toggle pause status');
    }
  };

  const completePauseCategory = async (category) => {
    const itemsInCategory = items.filter(item => {
      const itemCategories = Array.isArray(item.category) ? item.category : [item.category];
      return itemCategories.includes(category.name);
    });

    if (itemsInCategory.length === 0) {
      Alert.alert('Info', 'No items in this category');
      return;
    }

    const pausedItems = itemsInCategory.filter(item => item.isPaused);
    const unpausedItems = itemsInCategory.filter(item => !item.isPaused);
    const allPaused = unpausedItems.length === 0;

    Alert.alert(
      allPaused ? 'Resume All' : 'Complete Pause',
      allPaused
        ? `This will resume ${pausedItems.length} item(s) in "${category.name}". Continue?`
        : `This will pause ${unpausedItems.length} item(s) in "${category.name}". Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: allPaused ? 'Resume All' : 'Pause All',
          onPress: async () => {
            try {
              await api.patch('/menu/bulk-pause', {
                categoryName: category.name,
                isPaused: !allPaused
              });
              setItems(prev => prev.map(item => {
                const itemCategories = Array.isArray(item.category) ? item.category : [item.category];
                if (itemCategories.includes(category.name)) {
                  return { ...item, isPaused: !allPaused };
                }
                return item;
              }));
              Alert.alert('Success', allPaused
                ? `${pausedItems.length} item(s) resumed`
                : `${unpausedItems.length} item(s) paused`
              );
              fetchMenu();
            } catch (error) {
              Alert.alert('Error', allPaused ? 'Failed to resume items' : 'Failed to pause items');
              fetchMenu();
            }
          },
        },
      ]
    );
  };

  // Get unavailable category names (paused or sold out) - memoized
  // Non-scheduled categories are "available" unless manually paused or sold out
  const unavailableCategoryNames = useMemo(() => 
    categories.filter(c => c.isPaused || c.isSoldOut).map(c => c.name),
    [categories]
  );

  // Get scheduled locked category names (has schedule enabled AND currently paused due to schedule)
  const scheduledLockedCategoryNames = useMemo(() => 
    categories.filter(c => c.schedule?.enabled && c.isPaused && !c.isSoldOut).map(c => c.name),
    [categories]
  );

  // Get manually paused category names (paused but NOT scheduled, or sold out)
  const manuallyPausedCategoryNames = useMemo(() => 
    categories.filter(c => (c.isPaused && !c.schedule?.enabled) || c.isSoldOut).map(c => c.name),
    [categories]
  );

  // Check if item has at least one ACTIVE category (not locked/paused)
  // This includes non-scheduled categories that are not manually paused
  // Example: Item in "Dinner"(locked) + "Tiffin"(locked) + "South Indian"(active) → has active category
  const hasItemActiveCategory = useCallback((item) => {
    const itemCategories = Array.isArray(item.category) ? item.category : [item.category];
    // Item has active category if ANY category is NOT in unavailable list
    // Non-scheduled categories are always active unless manually paused/sold out
    return itemCategories.some(cat => !unavailableCategoryNames.includes(cat));
  }, [unavailableCategoryNames]);

  // Check if item is unavailable due to category status (ALL categories unavailable)
  const isItemCategoryUnavailable = useCallback((item) => {
    const itemCategories = Array.isArray(item.category) ? item.category : [item.category];
    // Item is unavailable if ALL its categories are unavailable
    return itemCategories.every(cat => unavailableCategoryNames.includes(cat));
  }, [unavailableCategoryNames]);

  // Check if currently viewing category is locked (scheduled or manual)
  const isSelectedCategoryLocked = useMemo(() => {
    if (selectedCategory === 'all') return false;
    return unavailableCategoryNames.includes(selectedCategory);
  }, [selectedCategory, unavailableCategoryNames]);

  // Check if currently viewing a scheduled category that is ACTIVE (within time)
  const isSelectedCategoryScheduledActive = useMemo(() => {
    if (selectedCategory === 'all') return false;
    const category = categories.find(c => c.name === selectedCategory);
    // Category is scheduled active if it has schedule enabled AND is NOT paused (within active time)
    return category?.schedule?.enabled && !category?.isPaused && !category?.isSoldOut;
  }, [selectedCategory, categories]);

  // Get scheduled categories that are currently ACTIVE (within time, not paused)
  const scheduledActiveCategoryNames = useMemo(() => 
    categories.filter(c => c.schedule?.enabled && !c.isPaused && !c.isSoldOut).map(c => c.name),
    [categories]
  );

  // Check if item has at least one scheduled category that is currently ACTIVE
  const hasItemScheduledActiveCategory = useCallback((item) => {
    const itemCategories = Array.isArray(item.category) ? item.category : [item.category];
    return itemCategories.some(cat => scheduledActiveCategoryNames.includes(cat));
  }, [scheduledActiveCategoryNames]);

  // Check if item should show scheduled lock icon
  // Show lock if item has ANY scheduled locked category
  // BUT don't show lock if:
  // 1. Viewing a scheduled category that is currently ACTIVE, OR
  // 2. Item has ANY scheduled category that is currently ACTIVE
  const isItemScheduledLocked = useCallback((item) => {
    // If viewing a scheduled category that is ACTIVE, don't show any locks
    if (isSelectedCategoryScheduledActive) {
      return false;
    }
    
    // If item has any scheduled category that is ACTIVE, don't show locks
    if (hasItemScheduledActiveCategory(item)) {
      return false;
    }
    
    const itemCategories = Array.isArray(item.category) ? item.category : [item.category];
    
    // Show lock if ANY of item's categories is scheduled locked
    return itemCategories.some(cat => scheduledLockedCategoryNames.includes(cat));
  }, [scheduledLockedCategoryNames, isSelectedCategoryScheduledActive, hasItemScheduledActiveCategory]);
  
  // Check if item should show manually paused lock icon
  // Show lock if item has ANY manually paused category (but not if already showing scheduled lock)
  // BUT don't show lock if item has ANY scheduled category that is currently ACTIVE
  const isItemManuallyPaused = useCallback((item) => {
    // If viewing a scheduled category that is ACTIVE, don't show any locks
    if (isSelectedCategoryScheduledActive) {
      return false;
    }
    
    // If item has any scheduled category that is ACTIVE, don't show locks
    if (hasItemScheduledActiveCategory(item)) {
      return false;
    }
    
    const itemCategories = Array.isArray(item.category) ? item.category : [item.category];
    
    // Don't show manual pause if already showing scheduled lock
    const hasScheduledLock = itemCategories.some(cat => scheduledLockedCategoryNames.includes(cat));
    if (hasScheduledLock) return false;
    
    // Show lock if ANY of item's categories is manually paused
    return itemCategories.some(cat => manuallyPausedCategoryNames.includes(cat));
  }, [manuallyPausedCategoryNames, scheduledLockedCategoryNames, isSelectedCategoryScheduledActive, hasItemScheduledActiveCategory]);
  
  // Get which categories are causing the item to be scheduled locked (for display)
  const getItemLockedCategories = useCallback((item) => {
    const itemCategories = Array.isArray(item.category) ? item.category : [item.category];
    return itemCategories.filter(cat => scheduledLockedCategoryNames.includes(cat));
  }, [scheduledLockedCategoryNames]);
  
  // Get which categories are causing the item to be manually paused (for display)
  const getItemManuallyPausedCategories = useCallback((item) => {
    const itemCategories = Array.isArray(item.category) ? item.category : [item.category];
    return itemCategories.filter(cat => manuallyPausedCategoryNames.includes(cat));
  }, [manuallyPausedCategoryNames]);

  // Filter items - memoized
  const filteredItems = useMemo(() => {
    return items.filter(item => {
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
  }, [items, searchTerm, selectedCategory, statusFilter, foodTypeFilter]);

  // Stats - memoized
  const stats = useMemo(() => {
    const totalItems = items.length;
    const availableCount = items.filter(i => i.available).length;
    const unavailableCount = items.filter(i => !i.available).length;
    const uniqueCategories = [...new Set(items.flatMap(i => Array.isArray(i.category) ? i.category : [i.category]))];
    return { totalItems, availableCount, unavailableCount, uniqueCategories };
  }, [items]);

  const renderItem = useCallback(({ item, index }) => {
    const isCategoryUnavailable = isItemCategoryUnavailable(item);
    const isScheduledLocked = isItemScheduledLocked(item);
    const isManuallyPaused = isItemManuallyPaused(item);
    const lockedCategories = getItemLockedCategories(item);
    const manuallyPausedCategories = getItemManuallyPausedCategories(item);
    
    // Item has some lock if it's scheduled locked OR manually paused
    const hasAnyLock = isScheduledLocked || isManuallyPaused;

    return (
      <Animated.View style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }}>
        <TouchableOpacity
          style={[
            styles.itemCard, 
            isScheduledLocked && styles.itemCardScheduled,
            isManuallyPaused && !isScheduledLocked && styles.itemCardPaused,
            !item.available && styles.itemCardOutOfStock
          ]}
          onPress={() => navigation.navigate('MenuItemForm', { item })}
          activeOpacity={0.7}
        >
          <View style={styles.itemImageContainer}>
            {item.image ? (
              <Image
                source={{ uri: item.image, cache: 'force-cache' }}
                style={[styles.itemImage, hasAnyLock && styles.itemImagePaused]}
                defaultSource={require('../../../assets/icon.png')}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.itemImage, styles.placeholderImage, hasAnyLock && styles.placeholderImagePaused]}>
                <Ionicons name="restaurant-outline" size={32} color={hasAnyLock ? '#9ca3af' : '#d1d5db'} />
              </View>
            )}
            {/* Lock Icon for Scheduled or Paused Items */}
            {hasAnyLock && (
              <View style={styles.itemLockOverlay}>
                <View style={[styles.itemLockBadge, isManuallyPaused && !isScheduledLocked && { backgroundColor: '#ef4444' }]}>
                  <Ionicons name="lock-closed" size={16} color="#fff" />
                </View>
              </View>
            )}
            {/* Discount Badge */}
            {item.offerPrice && item.offerPrice < item.price && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  {Math.round(((item.price - item.offerPrice) / item.price) * 100)}% OFF
                </Text>
              </View>
            )}
            {item.foodType && item.foodType !== 'none' && (
              <View style={[styles.foodTypeBadge, {
                borderColor: hasAnyLock ? '#9ca3af' : (item.foodType === 'veg' ? '#22c55e' : item.foodType === 'egg' ? '#f59e0b' : '#ef4444')
              }]}>
                <View style={[styles.foodTypeDot, {
                  backgroundColor: hasAnyLock ? '#9ca3af' : (item.foodType === 'veg' ? '#22c55e' : item.foodType === 'egg' ? '#f59e0b' : '#ef4444')
                }]} />
              </View>
            )}
          </View>

          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, hasAnyLock && styles.textPaused]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.itemCategory, hasAnyLock && styles.textPaused]} numberOfLines={1}>
              {Array.isArray(item.category) ? item.category.join(', ') : item.category}
            </Text>
            {item.preparationTime > 0 && (
              <View style={styles.prepTimeRow}>
                <Ionicons name="time-outline" size={12} color="#9ca3af" />
                <Text style={styles.prepTimeText}>{item.preparationTime} min</Text>
              </View>
            )}
            <View style={styles.itemFooter}>
              <View style={styles.priceContainer}>
                {item.offerPrice && item.offerPrice < item.price ? (
                  <View style={styles.priceRow}>
                    <Text style={[styles.originalPrice, hasAnyLock && styles.pricePaused]}>₹{item.price}</Text>
                    <Text style={[styles.offerPrice, hasAnyLock && styles.pricePaused]}>₹{item.offerPrice}</Text>
                  </View>
                ) : (
                  <Text style={[styles.itemPrice, hasAnyLock && styles.pricePaused]}>₹{item.price}</Text>
                )}
              </View>
              {isScheduledLocked ? (
                <View style={styles.scheduledStatusBadge}>
                  <Ionicons name="lock-closed" size={10} color="#6366f1" />
                  <Text style={styles.scheduledStatusText} numberOfLines={1}>
                    {lockedCategories.length === 1 ? lockedCategories[0] : `${lockedCategories.length} Cat.`}
                  </Text>
                </View>
              ) : isManuallyPaused ? (
                <View style={styles.pausedStatusBadge}>
                  <Ionicons name="lock-closed" size={10} color="#ef4444" />
                  <Text style={styles.pausedStatusText} numberOfLines={1}>
                    {manuallyPausedCategories.length === 1 ? manuallyPausedCategories[0] : `${manuallyPausedCategories.length} Cat.`}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.availabilityToggle, { backgroundColor: item.available ? '#DCFCE7' : '#FEE2E2' }]}
                  onPress={() => toggleAvailability(item)}
                  disabled={togglingId === item._id}
                >
                  {togglingId === item._id ? (
                    <ActivityIndicator size="small" color={item.available ? '#22c55e' : '#ef4444'} />
                  ) : (
                    <Text style={[styles.availabilityText, { color: item.available ? '#16A34A' : '#DC2626' }]}>
                      {item.available ? 'In Stock' : 'Out'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={() => deleteItem(item)}
            disabled={togglingId === item._id}
          >
            {togglingId === item._id ? (
              <ActivityIndicator size="small" color={ZOMATO_RED} />
            ) : (
              <Ionicons name="trash-outline" size={20} color={ZOMATO_RED} />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [fadeAnim, scaleAnim, isItemCategoryUnavailable, isItemScheduledLocked, isItemManuallyPaused, getItemLockedCategories, getItemManuallyPausedCategories, navigation, togglingId]);

  const keyExtractor = useCallback((item) => item._id, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {/* Premium Zomato Header */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <ImageBackground
          source={require('../../../assets/backgrounds/menu.jpg')}
          style={styles.header}
          imageStyle={styles.headerBackgroundImage}
        >
          <View style={styles.headerOverlay}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View>
                  <Text style={styles.title}>Menu</Text>
                  <Text style={styles.subtitle}>{stats.totalItems} items • {stats.uniqueCategories.length} categories</Text>
                </View>
              </View>
              <View style={styles.headerButtons}>
                <TouchableOpacity style={styles.headerButton} onPress={() => openCategoryModal()}>
                  <Ionicons name="folder-outline" size={20} color={ZOMATO_RED} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('MenuItemForm', {})}>
                  <Ionicons name="add" size={24} color={ZOMATO_RED} />
                </TouchableOpacity>
              </View>
            </View>
            {/* Glass Shine Effect */}
            <Animated.View
              style={[
                styles.glassShine,
                {
                  transform: [
                    {
                      translateX: shineAnim.interpolate({
                        inputRange: [-1, 1],
                        outputRange: [-200, 400],
                      }),
                    },
                  ],
                  opacity: shineAnim.interpolate({
                    inputRange: [-1, 0, 0.5, 1],
                    outputRange: [0, 0.6, 0.6, 0],
                  }),
                },
              ]}
            />
          </View>
        </ImageBackground>
      </Animated.View>

      {/* Premium Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search menu items..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#9ca3af"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <LinearGradient
          colors={['#3B82F6', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCardGradient}
        >
          <View style={styles.statCardDecor}>
            <Ionicons name="restaurant" size={40} color="rgba(255,255,255,0.15)" />
          </View>
          <Text style={styles.statValueWhite}>{stats.totalItems}</Text>
          <Text style={styles.statLabelWhite}>TOTAL</Text>
        </LinearGradient>

        <LinearGradient
          colors={['#8B5CF6', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCardGradient}
        >
          <View style={styles.statCardDecor}>
            <Ionicons name="folder" size={40} color="rgba(255,255,255,0.15)" />
          </View>
          <Text style={styles.statValueWhite}>{stats.uniqueCategories.length}</Text>
          <Text style={styles.statLabelWhite}>CATEGORIES</Text>
        </LinearGradient>

        <LinearGradient
          colors={['#22C55E', '#16A34A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCardGradient}
        >
          <View style={styles.statCardDecor}>
            <Ionicons name="checkmark-circle" size={40} color="rgba(255,255,255,0.15)" />
          </View>
          <Text style={styles.statValueWhite}>{stats.availableCount}</Text>
          <Text style={styles.statLabelWhite}>IN STOCK</Text>
        </LinearGradient>

        <LinearGradient
          colors={['#EF4444', '#DC2626']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCardGradient}
        >
          <View style={styles.statCardDecor}>
            <Ionicons name="close-circle" size={40} color="rgba(255,255,255,0.15)" />
          </View>
          <Text style={styles.statValueWhite}>{stats.unavailableCount}</Text>
          <Text style={styles.statLabelWhite}>OUT</Text>
        </LinearGradient>
      </View>

      {/* Filter Chips */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
            onPress={() => setStatusFilter('all')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'all' && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'available' && styles.filterChipAvailable]}
            onPress={() => setStatusFilter('available')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'available' && styles.filterChipTextActive]}>In Stock</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'unavailable' && styles.filterChipUnavailable]}
            onPress={() => setStatusFilter('unavailable')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'unavailable' && styles.filterChipTextActive]}>Out of Stock</Text>
          </TouchableOpacity>
          <View style={styles.filterDivider} />
          <TouchableOpacity
            style={[styles.filterChip, foodTypeFilter === 'veg' && { backgroundColor: '#22c55e', borderColor: '#22c55e' }]}
            onPress={() => setFoodTypeFilter(foodTypeFilter === 'veg' ? 'all' : 'veg')}
          >
            <View style={[styles.foodTypeIcon, { borderColor: foodTypeFilter === 'veg' ? '#fff' : '#22c55e' }]}>
              <View style={[styles.foodTypeIconDot, { backgroundColor: foodTypeFilter === 'veg' ? '#fff' : '#22c55e' }]} />
            </View>
            <Text style={[styles.filterChipText, foodTypeFilter === 'veg' && styles.filterChipTextActive]}>Veg</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, foodTypeFilter === 'nonveg' && { backgroundColor: '#ef4444', borderColor: '#ef4444' }]}
            onPress={() => setFoodTypeFilter(foodTypeFilter === 'nonveg' ? 'all' : 'nonveg')}
          >
            <View style={[styles.foodTypeIcon, { borderColor: foodTypeFilter === 'nonveg' ? '#fff' : '#ef4444' }]}>
              <View style={[styles.foodTypeIconDot, { backgroundColor: foodTypeFilter === 'nonveg' ? '#fff' : '#ef4444' }]} />
            </View>
            <Text style={[styles.filterChipText, foodTypeFilter === 'nonveg' && styles.filterChipTextActive]}>Non-Veg</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, foodTypeFilter === 'egg' && { backgroundColor: '#f59e0b', borderColor: '#f59e0b' }]}
            onPress={() => setFoodTypeFilter(foodTypeFilter === 'egg' ? 'all' : 'egg')}
          >
            <View style={[styles.foodTypeIcon, { borderColor: foodTypeFilter === 'egg' ? '#fff' : '#f59e0b' }]}>
              <View style={[styles.foodTypeIconDot, { backgroundColor: foodTypeFilter === 'egg' ? '#fff' : '#f59e0b' }]} />
            </View>
            <Text style={[styles.filterChipText, foodTypeFilter === 'egg' && styles.filterChipTextActive]}>Egg</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Category Filter */}
      {categories.length > 0 && (
        <View style={styles.categoryFilterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryFilterList}>
            <TouchableOpacity
              style={styles.categoryItem}
              onPress={() => setSelectedCategory('all')}
            >
              <View style={[styles.categoryImageWrapper, selectedCategory === 'all' && styles.categoryImageWrapperActive]}>
                <View style={styles.categoryAllIcon}>
                  <Text style={styles.categoryAllText}>All</Text>
                </View>
              </View>
              <Text style={[styles.categoryName, selectedCategory === 'all' && styles.categoryNameActive]}>All</Text>
              {selectedCategory === 'all' && <View style={styles.categoryUnderline} />}
            </TouchableOpacity>
            {categories.map(cat => {
              const itemsInCat = items.filter(item => {
                const itemCategories = Array.isArray(item.category) ? item.category : [item.category];
                return itemCategories.includes(cat.name);
              });
              const allItemsPaused = itemsInCat.length > 0 && itemsInCat.every(item => item.isPaused);
              const isDeleting = deletingCategoryId === cat._id;
              const isScheduledLocked = cat.schedule?.enabled && cat.isPaused && !cat.isSoldOut;

              // Double-tap handler for Android
              let lastTap = 0;
              const handleCategoryPress = () => {
                if (Platform.OS === 'android') {
                  const now = Date.now();
                  const DOUBLE_TAP_DELAY = 300;
                  
                  if (now - lastTap < DOUBLE_TAP_DELAY) {
                    // Double tap - toggle sold out
                    showSoldOutOptions(cat);
                    lastTap = 0;
                  } else {
                    // Single tap - select category
                    lastTap = now;
                    setSelectedCategory(cat.name);
                  }
                } else {
                  // iOS - normal behavior
                  setSelectedCategory(cat.name);
                }
              };

              const handleCategoryLongPress = () => {
                const scheduleTimeText = isScheduledLocked && cat.schedule?.enabled
                  ? ` (${formatScheduleDisplay(cat.schedule)})`
                  : '';
                
                if (Platform.OS === 'android') {
                  // Android - show only Schedule, Edit, Delete
                  Alert.alert(
                    cat.name + (isScheduledLocked ? ' - SCHEDULED' + scheduleTimeText : ''),
                    'What would you like to do?',
                    [
                      { text: 'Schedule', onPress: () => openScheduleModal(cat) },
                      { text: 'Edit', onPress: () => openCategoryModal(cat) },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteCategory(cat) },
                      { text: 'Cancel', style: 'cancel' },
                    ],
                    { cancelable: true }
                  );
                } else {
                  // iOS - show all options
                  const soldOutText = cat.isSoldOut ? 'Mark Available' : 'Sold Out';
                  const soldOutTimeText = cat.soldOutSchedule?.enabled && cat.soldOutSchedule?.endTime
                    ? (() => {
                        const [h, m] = cat.soldOutSchedule.endTime.split(':').map(Number);
                        const p = h >= 12 ? 'PM' : 'AM';
                        const h12 = h % 12 || 12;
                        return ` (Until ${h12}:${m.toString().padStart(2, '0')} ${p})`;
                      })()
                    : '';
                  
                  Alert.alert(
                    cat.name + (cat.isSoldOut ? ' - SOLD OUT' + soldOutTimeText : (isScheduledLocked ? ' - SCHEDULED' + scheduleTimeText : '')),
                    'What would you like to do?',
                    [
                      { text: soldOutText, onPress: () => showSoldOutOptions(cat), style: cat.isSoldOut ? 'default' : 'destructive' },
                      { text: 'Schedule', onPress: () => openScheduleModal(cat) },
                      { text: 'Edit', onPress: () => openCategoryModal(cat) },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteCategory(cat) },
                      { text: 'Cancel', style: 'cancel' },
                    ],
                    { cancelable: true }
                  );
                }
              };

              return (
                <TouchableOpacity
                  key={cat._id}
                  style={styles.categoryItem}
                  onPress={handleCategoryPress}
                  onLongPress={handleCategoryLongPress}
                  disabled={isDeleting}
                >
                  <View style={[
                    styles.categoryImageWrapper, 
                    selectedCategory === cat.name && styles.categoryImageWrapperActive, 
                    cat.isSoldOut && styles.categoryImageWrapperSoldOut,
                    isScheduledLocked && styles.categoryImageWrapperScheduled
                  ]}>
                    {cat.image ? (
                      <Image 
                        source={{ uri: cat.image, cache: 'force-cache' }} 
                        style={[styles.categoryImage, isDeleting && styles.categoryImageDeleting, (cat.isSoldOut || isScheduledLocked) && styles.categoryImageSoldOut]}
                        defaultSource={require('../../../assets/icon.png')}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.categoryPlaceholder, isDeleting && styles.categoryImageDeleting]}>
                        <Ionicons name="restaurant-outline" size={24} color={cat.isSoldOut ? '#ef4444' : (isScheduledLocked ? '#6366f1' : '#9ca3af')} />
                      </View>
                    )}
                    {cat.isSoldOut && !isDeleting && (
                      <View style={styles.categorySoldOutOverlay}>
                        <View style={styles.soldOutBadge}>
                          <Text style={styles.soldOutBadgeText}>SOLD OUT</Text>
                        </View>
                      </View>
                    )}
                    {isScheduledLocked && !isDeleting && (
                      <View style={styles.categoryScheduledOverlay}>
                        <View style={styles.scheduledBadge}>
                          <Ionicons name="lock-closed" size={12} color="#fff" />
                        </View>
                      </View>
                    )}
                    {isDeleting && (
                      <View style={styles.categoryDeletingOverlay}>
                        <ActivityIndicator size="small" color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={[
                    styles.categoryName,
                    selectedCategory === cat.name && styles.categoryNameActive,
                    cat.isSoldOut && styles.categoryNameSoldOut,
                    isScheduledLocked && styles.categoryNameScheduled,
                    isDeleting && styles.categoryNameDeleting
                  ]} numberOfLines={1}>{cat.name}</Text>
                  {cat.soldOutSchedule?.enabled && cat.soldOutSchedule?.endTime && (
                    <Text style={styles.categoryTimeoutText}>
                      {(() => {
                        const [h, m] = cat.soldOutSchedule.endTime.split(':').map(Number);
                        const p = h >= 12 ? 'PM' : 'AM';
                        const h12 = h % 12 || 12;
                        return `Until ${h12}:${m.toString().padStart(2, '0')} ${p}`;
                      })()}
                    </Text>
                  )}
                  {cat.schedule?.enabled && !cat.isSoldOut && (
                    <Text style={[
                      styles.categoryScheduleText,
                      !cat.isPaused && styles.categoryScheduleActiveText
                    ]}>
                      {cat.isPaused 
                        ? formatScheduleDisplay(cat.schedule)
                        : `Active ${formatScheduleDisplay(cat.schedule)}`
                      }
                    </Text>
                  )}
                  {selectedCategory === cat.name && <View style={styles.categoryUnderline} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.categoryAddItem} onPress={() => openCategoryModal()}>
              <View style={styles.categoryAddIcon}>
                <Ionicons name="add" size={24} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ZOMATO_RED} />
          <Text style={styles.loadingText}>Loading menu...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ZOMATO_RED]} tintColor={ZOMATO_RED} />}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
          getItemLayout={(data, index) => ({
            length: 140,
            offset: 140 * index,
            index,
          })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="restaurant-outline" size={48} color={ZOMATO_RED} />
              </View>
              <Text style={styles.emptyTitle}>
                {searchTerm || selectedCategory !== 'all' || statusFilter !== 'all' || foodTypeFilter !== 'all'
                  ? 'No items found'
                  : 'No menu items yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchTerm || selectedCategory !== 'all' || statusFilter !== 'all' || foodTypeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Add your first menu item to get started'}
              </Text>
              {!searchTerm && selectedCategory === 'all' && statusFilter === 'all' && foodTypeFilter === 'all' && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => navigation.navigate('MenuItemForm', {})}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.emptyButtonText}>Add First Item</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowCategoryModal(false)}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{editingCategory ? 'Edit Category' : 'New Category'}</Text>
                  <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowCategoryModal(false)}>
                    <Ionicons name="close" size={24} color="#696969" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Category Name</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={categoryForm.name}
                      onChangeText={(text) => setCategoryForm({ ...categoryForm, name: text })}
                      placeholder="e.g., Main Course"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Category Image</Text>
                    <View style={styles.categoryImageSection}>
                      {categoryImagePreview ? (
                        <View style={styles.categoryImageContainer}>
                          <Image source={{ uri: categoryImagePreview }} style={styles.categoryImagePreview} />
                          <TouchableOpacity style={styles.removeCategoryImageButton} onPress={removeCategoryImage}>
                            <Ionicons name="close-circle" size={28} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity 
                          style={styles.categoryImagePlaceholder} 
                          onPress={pickCategoryImage}
                          disabled={pickingCategoryImage}
                        >
                          {pickingCategoryImage ? (
                            <ActivityIndicator size="small" color="#E23744" />
                          ) : (
                            <>
                              <Ionicons name="camera-outline" size={32} color="#9ca3af" />
                              <Text style={styles.categoryImagePlaceholderText}>Add Image</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                      {categoryImagePreview && (
                        <TouchableOpacity 
                          style={styles.changeCategoryImageButton} 
                          onPress={pickCategoryImage}
                          disabled={pickingCategoryImage}
                        >
                          {pickingCategoryImage ? (
                            <ActivityIndicator size="small" color="#696969" />
                          ) : (
                            <>
                              <Ionicons name="image-outline" size={18} color="#696969" />
                              <Text style={styles.changeCategoryImageText}>Change</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.modalButton, savingCategory && styles.modalButtonDisabled]}
                    onPress={saveCategory}
                    disabled={savingCategory}
                  >
                    {savingCategory ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.modalButtonText}>{editingCategory ? 'Update Category' : 'Add Category'}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Schedule Modal */}
      <CategoryScheduleModal
        visible={showScheduleModal}
        category={scheduleCategory}
        scheduleForm={scheduleForm}
        setScheduleForm={setScheduleForm}
        onSave={saveSchedule}
        onClose={() => setShowScheduleModal(false)}
        saving={savingCategory}
      />

      {/* Sold Out Schedule Modal */}
      <Modal
        visible={showSoldOutModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSoldOutModal(false)}
      >
        <View style={styles.soldOutModalOverlay}>
          <View style={styles.soldOutModalContent}>
            <View style={styles.soldOutModalHeader}>
              <Text style={styles.soldOutModalTitle}>Schedule Sold Out</Text>
              <TouchableOpacity onPress={() => setShowSoldOutModal(false)} style={styles.soldOutCloseButton}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.soldOutModalBody}>
              <Text style={styles.soldOutCategoryName}>{soldOutCategory?.name}</Text>
              <Text style={styles.soldOutDescription}>
                Mark this category as sold out until a specific time. All items will be marked unavailable.
              </Text>
              
              <View style={styles.soldOutTimeSection}>
                <Text style={styles.soldOutTimeLabel}>Available again at:</Text>
                <View style={styles.soldOutTimePicker}>
                  {/* Hour picker */}
                  <View style={styles.soldOutTimeUnit}>
                    <TouchableOpacity 
                      style={styles.soldOutTimeButton}
                      onPress={() => {
                        const [h, m] = soldOutEndTime.split(':').map(Number);
                        const newH = (h + 1) % 24;
                        setSoldOutEndTime(`${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
                      }}
                    >
                      <Ionicons name="chevron-up" size={24} color={ZOMATO_RED} />
                    </TouchableOpacity>
                    <Text style={styles.soldOutTimeValue}>
                      {(() => {
                        const h = parseInt(soldOutEndTime.split(':')[0]);
                        return (h % 12 || 12).toString().padStart(2, '0');
                      })()}
                    </Text>
                    <TouchableOpacity 
                      style={styles.soldOutTimeButton}
                      onPress={() => {
                        const [h, m] = soldOutEndTime.split(':').map(Number);
                        const newH = (h - 1 + 24) % 24;
                        setSoldOutEndTime(`${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
                      }}
                    >
                      <Ionicons name="chevron-down" size={24} color={ZOMATO_RED} />
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={styles.soldOutTimeSeparator}>:</Text>
                  
                  {/* Minute picker */}
                  <View style={styles.soldOutTimeUnit}>
                    <TouchableOpacity 
                      style={styles.soldOutTimeButton}
                      onPress={() => {
                        const [h, m] = soldOutEndTime.split(':').map(Number);
                        const newM = (m + 5) % 60;
                        setSoldOutEndTime(`${h.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`);
                      }}
                    >
                      <Ionicons name="chevron-up" size={24} color={ZOMATO_RED} />
                    </TouchableOpacity>
                    <Text style={styles.soldOutTimeValue}>
                      {soldOutEndTime.split(':')[1]}
                    </Text>
                    <TouchableOpacity 
                      style={styles.soldOutTimeButton}
                      onPress={() => {
                        const [h, m] = soldOutEndTime.split(':').map(Number);
                        const newM = (m - 5 + 60) % 60;
                        setSoldOutEndTime(`${h.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`);
                      }}
                    >
                      <Ionicons name="chevron-down" size={24} color={ZOMATO_RED} />
                    </TouchableOpacity>
                  </View>
                  
                  {/* AM/PM picker */}
                  <TouchableOpacity 
                    style={styles.soldOutAmPmButton}
                    onPress={() => {
                      const [h, m] = soldOutEndTime.split(':').map(Number);
                      const newH = h >= 12 ? h - 12 : h + 12;
                      setSoldOutEndTime(`${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
                    }}
                  >
                    <Text style={styles.soldOutAmPmText}>
                      {parseInt(soldOutEndTime.split(':')[0]) >= 12 ? 'PM' : 'AM'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            <View style={styles.soldOutModalFooter}>
              <TouchableOpacity 
                style={styles.soldOutCancelButton} 
                onPress={() => setShowSoldOutModal(false)}
              >
                <Text style={styles.soldOutCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.soldOutSaveButton, savingCategory && styles.soldOutSaveButtonDisabled]} 
                onPress={saveSoldOutSchedule}
                disabled={savingCategory}
              >
                {savingCategory ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.soldOutSaveButtonText}>Mark Sold Out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },

  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 35 : 75,
    paddingBottom: 55,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerBackgroundImage: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    marginTop: -(Platform.OS === 'android' ? StatusBar.currentHeight + 35 : 75),
    marginBottom: -55,
    marginHorizontal: -20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 35 : 75,
    paddingBottom: 55,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  glassShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4, fontWeight: '500' },
  headerButtons: { flexDirection: 'row', gap: 12 },
  headerButton: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },

  // Search
  searchContainer: { paddingHorizontal: 16, marginTop: -20 },
  searchInputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, paddingHorizontal: 16, height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    gap: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1C1C1C', fontWeight: '500' },

  // Stats
  statsContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 10 },
  statCardGradient: {
    flex: 1, 
    borderRadius: 16, 
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 90,
    overflow: 'hidden',
  },
  statCardDecor: {
    position: 'absolute',
    right: -5,
    bottom: -5,
  },
  statValueWhite: { fontSize: 24, fontWeight: '800', color: '#fff' },
  statLabelWhite: { fontSize: 9, color: 'rgba(255,255,255,0.9)', marginTop: 4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },

  // Filters
  filtersContainer: { paddingVertical: 8 },
  filterRow: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E8E8E8',
  },
  filterChipActive: { backgroundColor: '#1C1C1C', borderColor: '#1C1C1C' },
  filterChipAvailable: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  filterChipUnavailable: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  filterChipText: { fontSize: 13, color: '#696969', fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  filterDivider: { width: 1, height: 28, backgroundColor: '#E8E8E8', marginHorizontal: 4 },
  foodTypeIcon: { width: 16, height: 16, borderRadius: 4, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  foodTypeIconDot: { width: 8, height: 8, borderRadius: 4 },

  // Category Filter
  categoryFilterContainer: { paddingVertical: 16, backgroundColor: '#fff' },
  categoryFilterList: { paddingHorizontal: 16, gap: 20 },
  categoryItem: {
    alignItems: 'center',
    width: 70,
  },
  categoryImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryImageWrapperActive: {
    borderColor: ZOMATO_RED,
  },
  categoryImageWrapperPaused: {
    borderColor: '#f59e0b',
    opacity: 0.7,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  categoryPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  categoryAllIcon: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: ZOMATO_RED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  categoryPausedOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  categoryDeletingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryImageDeleting: {
    opacity: 0.5,
  },
  categoryName: {
    fontSize: 12,
    color: '#696969',
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  categoryNameActive: {
    color: ZOMATO_RED,
    fontWeight: '600',
  },
  categoryNamePaused: {
    color: '#D97706',
  },
  categoryNameSoldOut: {
    color: '#ef4444',
    fontWeight: '600',
  },
  categoryImageWrapperSoldOut: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  categoryImageSoldOut: {
    opacity: 0.5,
  },
  categorySoldOutOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.7)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  soldOutBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  soldOutBadgeText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#ef4444',
    letterSpacing: 0.5,
  },
  categoryTimeoutText: {
    fontSize: 9,
    color: '#ef4444',
    fontWeight: '500',
    marginTop: 2,
  },
  categoryScheduleText: {
    fontSize: 9,
    color: '#6366f1',
    fontWeight: '500',
    marginTop: 2,
  },
  categoryScheduleActiveText: {
    color: '#22c55e',
  },
  categoryImageWrapperScheduled: {
    borderColor: '#6366f1',
    borderWidth: 2,
  },
  categoryScheduledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(99, 102, 241, 0.7)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduledBadge: {
    backgroundColor: '#4f46e5',
    padding: 6,
    borderRadius: 20,
  },
  categoryNameScheduled: {
    color: '#6366f1',
    fontWeight: '600',
  },
  categoryNameDeleting: {
    opacity: 0.5,
  },
  categoryUnderline: {
    width: 20,
    height: 2,
    backgroundColor: ZOMATO_RED,
    borderRadius: 1,
    marginTop: 4,
  },
  categoryAddItem: {
    alignItems: 'center',
    width: 70,
  },
  categoryAddIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
  },

  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#696969', fontWeight: '500' },

  // List
  listContent: { padding: 16, paddingBottom: 100 },
  itemCard: {
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    borderRadius: 20,
    padding: 16, 
    marginBottom: 14, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  itemCardPaused: { backgroundColor: '#FEFCE8', borderWidth: 1, borderColor: '#FEF3C7' },
  itemCardScheduled: { backgroundColor: '#EEF2FF', borderWidth: 2, borderColor: '#C7D2FE' },
  itemCardOutOfStock: { backgroundColor: '#FEE2E2', borderWidth: 2, borderColor: '#FCA5A5' },
  itemImageContainer: { position: 'relative' },
  itemImage: { width: 90, height: 90, borderRadius: 16 },
  itemImagePaused: { opacity: 0.6 },
  itemLockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(99, 102, 241, 0.5)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemLockBadge: {
    backgroundColor: '#4f46e5',
    padding: 8,
    borderRadius: 20,
  },
  scheduledStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    gap: 4,
  },
  scheduledStatusText: {
    fontSize: 10,
    color: '#6366f1',
    fontWeight: '600',
  },
  placeholderImage: { backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  placeholderImagePaused: { backgroundColor: '#FEF3C7' },
  foodTypeBadge: {
    position: 'absolute', bottom: 6, left: 6,
    width: 20, height: 20, borderRadius: 5, borderWidth: 2,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center'
  },
  foodTypeDot: { width: 10, height: 10, borderRadius: 5 },
  discountBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#22C55E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  itemInfo: { flex: 1, marginLeft: 16 },
  itemName: { fontSize: 17, fontWeight: '700', color: '#1C1C1C' },
  itemCategory: { fontSize: 13, color: '#696969', marginTop: 4, fontWeight: '500' },
  textPaused: { color: '#9CA3AF' },
  prepTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  prepTimeText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  itemFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  priceContainer: { flexDirection: 'row', alignItems: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemPrice: { fontSize: 20, fontWeight: '800', color: ZOMATO_RED },
  originalPrice: { fontSize: 16, fontWeight: '500', color: '#9CA3AF', textDecorationLine: 'line-through' },
  offerPrice: { fontSize: 20, fontWeight: '800', color: '#22C55E' },
  pricePaused: { color: '#9CA3AF' },
  availabilityToggle: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, minWidth: 80, alignItems: 'center' },
  availabilityText: { fontSize: 12, fontWeight: '700' },
  pausedStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#FEE2E2', maxWidth: 100 },
  pausedStatusText: { fontSize: 10, fontWeight: '700', color: '#ef4444' },
  deleteButton: { padding: 12, marginLeft: 4 },

  // Empty
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIconContainer: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#FEF2F2',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1C', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#696969', marginTop: 8, textAlign: 'center', lineHeight: 20 },
  emptyButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 24, backgroundColor: ZOMATO_RED, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
    shadowColor: ZOMATO_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 28, 
    borderTopRightRadius: 28,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E8E8E8', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1C1C1C' },
  modalCloseButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  modalBody: { 
    paddingHorizontal: 24, 
    paddingTop: 8,
    paddingBottom: 24, 
    gap: 20,
  },
  inputGroup: { gap: 10 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#1C1C1C' },
  modalInput: {
    backgroundColor: '#F8F8F8', borderRadius: 14, paddingHorizontal: 18, height: 54,
    fontSize: 15, color: '#1C1C1C', borderWidth: 1.5, borderColor: '#E8E8E8', fontWeight: '500',
  },
  modalFooter: { 
    padding: 24, 
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  modalButton: {
    backgroundColor: ZOMATO_RED, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center',
    shadowColor: ZOMATO_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonDisabled: { opacity: 0.7 },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Category Image
  categoryImageSection: { alignItems: 'center', gap: 14 },
  categoryImageContainer: { position: 'relative' },
  categoryImagePreview: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#F0F0F0' },
  removeCategoryImageButton: { position: 'absolute', top: -4, right: -4 },
  categoryImagePlaceholder: {
    width: 110, height: 110, borderRadius: 55, backgroundColor: '#F8F8F8',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E8E8E8', borderStyle: 'dashed',
  },
  categoryImagePlaceholderText: { color: '#9CA3AF', marginTop: 6, fontSize: 13, fontWeight: '600' },
  changeCategoryImageButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#F5F5F5', borderRadius: 24,
  },
  changeCategoryImageText: { fontSize: 13, color: '#696969', fontWeight: '600' },

  // Sold Out Modal Styles
  soldOutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  soldOutModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  soldOutModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  soldOutModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  soldOutCloseButton: {
    padding: 4,
  },
  soldOutModalBody: {
    padding: 24,
  },
  soldOutCategoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 8,
  },
  soldOutDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 24,
  },
  soldOutTimeSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 20,
  },
  soldOutTimeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  soldOutTimePicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  soldOutTimeUnit: {
    alignItems: 'center',
  },
  soldOutTimeButton: {
    padding: 8,
  },
  soldOutTimeValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1C',
    minWidth: 50,
    textAlign: 'center',
  },
  soldOutTimeSeparator: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1C',
    marginHorizontal: 4,
  },
  soldOutAmPmButton: {
    backgroundColor: ZOMATO_RED,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginLeft: 12,
  },
  soldOutAmPmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  soldOutModalFooter: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  soldOutCancelButton: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  soldOutCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  soldOutSaveButton: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  soldOutSaveButtonDisabled: {
    opacity: 0.7,
  },
  soldOutSaveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
