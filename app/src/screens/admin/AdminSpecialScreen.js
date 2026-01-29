import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView,
  RefreshControl, TouchableOpacity, Image, Alert, ActivityIndicator,
  TextInput, Modal, Animated, Platform, StatusBar, ImageBackground
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api, { API_BASE_URL } from '../../config/api';

const ZOMATO_RED = '#E23744';
const ZOMATO_DARK_RED = '#CB1A27';

// Days of the week as categories
const DAY_CATEGORIES = [
  { id: 0, name: 'Sunday', short: 'Sun' },
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
];

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Format time from 24-hour to 12-hour with AM/PM
const formatTime12Hour = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export default function AdminSpecialScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [daySchedules, setDaySchedules] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDay, setSelectedDay] = useState(new Date().getDay()); // Default to today
  const [foodTypeFilter, setFoodTypeFilter] = useState('all');
  const [togglingId, setTogglingId] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingDay, setEditingDay] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    startTime: '09:00',
    endTime: '22:00'
  });
  const [currentTime, setCurrentTime] = useState(new Date()); // Track current time for schedule checks
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const shineAnim = useRef(new Animated.Value(-1)).current;

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

  useEffect(() => {
    fetchItems();
    fetchSchedules();
    
    // Set up interval to refresh schedule status every minute
    const scheduleInterval = setInterval(() => {
      fetchSchedules();
      setCurrentTime(new Date()); // Update current time to trigger re-render for schedule checks
    }, 60000); // 60 seconds
    
    // Also update time every 30 seconds to ensure timely lock/unlock
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // 30 seconds
    
    return () => {
      clearInterval(scheduleInterval);
      clearInterval(timeInterval);
    };
  }, []);

  // Refresh items when screen comes into focus (e.g., after editing an item)
  useFocusEffect(
    useCallback(() => {
      fetchItems();
      fetchSchedules();
      setCurrentTime(new Date());
    }, [])
  );

  const fetchItems = useCallback(async () => {
    try {
      const response = await api.get('/special-items');
      setItems(response.data || []);
    } catch (error) {
      console.error('Error fetching special items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchSchedules = useCallback(async () => {
    try {
      const response = await api.get('/special-items/schedules');
      setDaySchedules(response.data || {});
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  }, []);

  // Check if current time is within the schedule for a given day (uses global day schedules)
  const isTimeWithinDaySchedule = useCallback((dayToCheck) => {
    // Get the global schedule for this day
    const schedule = daySchedules[dayToCheck];
    
    if (!schedule || !schedule.startTime || !schedule.endTime) {
      return true; // If no schedule set for this day, always available
    }

    const currentHours = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;

    const [startHours, startMins] = schedule.startTime.split(':').map(Number);
    const [endHours, endMins] = schedule.endTime.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMins;
    const endTotalMinutes = endHours * 60 + endMins;

    // Handle overnight schedules (e.g., 22:00 - 02:00)
    if (endTotalMinutes < startTotalMinutes) {
      return currentTotalMinutes >= startTotalMinutes || currentTotalMinutes <= endTotalMinutes;
    }
    
    return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes;
  }, [currentTime, daySchedules]);

  // Check if an item should be locked due to schedule
  const isItemScheduleLocked = useCallback((item) => {
    // Get the days this item is scheduled for
    const itemDays = item.days && item.days.length > 0 ? item.days : [item.day];
    const currentDay = currentTime.getDay();
    
    // If item is not scheduled for today, it should always be locked
    if (!itemDays.includes(currentDay)) {
      return true;
    }
    
    // If item is scheduled for today, check if current time is within the day's global schedule
    return !isTimeWithinDaySchedule(currentDay);
  }, [isTimeWithinDaySchedule, currentTime]);

  // For display purposes, check if item should be locked for the selected day view
  const isItemScheduleLockedForDay = useCallback((item, dayToCheck) => {
    // Get the days this item is scheduled for
    const itemDays = item.days && item.days.length > 0 ? item.days : [item.day];
    
    // If item is not scheduled for the day we're viewing, it should appear locked
    if (!itemDays.includes(dayToCheck)) {
      return true;
    }
    
    // If item is scheduled for the day we're viewing, check if it's today and within the day's global schedule
    const currentDay = currentTime.getDay();
    if (dayToCheck === currentDay) {
      // Only for today, check the actual time schedule for this day
      return !isTimeWithinDaySchedule(currentDay);
    }
    
    // For future/past days, even if item is scheduled for that day, show as locked
    // Only today's scheduled items should appear unlocked
    return true;
  }, [isTimeWithinDaySchedule, currentTime]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
    fetchSchedules();
  };

  const handleDeleteItem = async (itemId, itemName, itemDays) => {
    const itemDaysArray = itemDays && itemDays.length > 0 ? itemDays : [];
    const isMultipleDays = itemDaysArray.length > 1;
    
    // Determine the message based on whether item appears on multiple days
    const deleteMessage = isMultipleDays
      ? `This item appears on ${itemDaysArray.length} days. Do you want to:\n\n• Remove it from ${DAY_CATEGORIES[selectedDay].name} only\n• Delete it from all days`
      : 'Are you sure you want to delete this special item?';
    
    const buttons = isMultipleDays
      ? [
          { text: 'Cancel', style: 'cancel' },
          {
            text: `Remove from ${DAY_CATEGORIES[selectedDay].short}`,
            onPress: async () => {
              try {
                setTogglingId(itemId);
                // Pass the day parameter to remove only this day
                const response = await api.delete(`/special-items/${itemId}?day=${selectedDay}`);
                
                // If item was completely deleted (no days remaining), remove from list
                if (response.data.deleted) {
                  setItems(items.filter(i => i._id !== itemId));
                  Alert.alert('Success', 'Item deleted successfully');
                } else {
                  // Item still exists but removed from this day, refresh the list
                  fetchItems();
                  Alert.alert('Success', `Item removed from ${DAY_CATEGORIES[selectedDay].name}`);
                }
              } catch (error) {
                console.error('Error removing item from day:', error);
                Alert.alert('Error', 'Failed to remove item from this day');
              } finally {
                setTogglingId(null);
              }
            }
          },
          {
            text: 'Delete from All Days',
            style: 'destructive',
            onPress: async () => {
              try {
                setTogglingId(itemId);
                // Don't pass day parameter to delete entire item
                await api.delete(`/special-items/${itemId}`);
                setItems(items.filter(i => i._id !== itemId));
                Alert.alert('Success', 'Item deleted from all days');
              } catch (error) {
                console.error('Error deleting item:', error);
                Alert.alert('Error', 'Failed to delete item');
              } finally {
                setTogglingId(null);
              }
            }
          }
        ]
      : [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                setTogglingId(itemId);
                await api.delete(`/special-items/${itemId}`);
                setItems(items.filter(i => i._id !== itemId));
                Alert.alert('Success', 'Item deleted successfully');
              } catch (error) {
                console.error('Error deleting item:', error);
                Alert.alert('Error', 'Failed to delete item');
              } finally {
                setTogglingId(null);
              }
            }
          }
        ];
    
    Alert.alert(
      'Delete Item',
      deleteMessage,
      buttons
    );
  };

  const toggleAvailability = async (item) => {
    const originalItems = [...items];
    setTogglingId(item._id);
    setItems(prev => prev.map(i => i._id === item._id ? { ...i, available: !i.available } : i));
    
    try {
      await api.patch(`/special-items/${item._id}/toggle-availability`);
    } catch (error) {
      setItems(originalItems);
      Alert.alert('Error', 'Failed to update availability');
    } finally {
      setTogglingId(null);
    }
  };

  const openScheduleModal = (day) => {
    setEditingDay(day);
    const schedule = daySchedules[day.id] || { startTime: '09:00', endTime: '22:00' };
    setScheduleForm(schedule);
    setShowScheduleModal(true);
  };

  const saveSchedule = async () => {
    try {
      await api.put(`/special-items/schedules/${editingDay.id}`, scheduleForm);
      setDaySchedules(prev => ({ ...prev, [editingDay.id]: scheduleForm }));
      setShowScheduleModal(false);
      Alert.alert('Success', 'Schedule updated successfully');
    } catch (error) {
      console.error('Error saving schedule:', error);
      Alert.alert('Error', 'Failed to save schedule');
    }
  };

  // Filter items
  const filteredItems = items.filter(item => {
    // Check if item appears on the selected day
    const itemDays = item.days && item.days.length > 0 ? item.days : [item.day];
    if (!itemDays.includes(selectedDay)) return false;
    
    // Filter by search term
    if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filter by food type
    if (foodTypeFilter !== 'all' && item.foodType !== foodTypeFilter) {
      return false;
    }
    
    return true;
  });

  const stats = {
    totalItems: filteredItems.length,
    available: filteredItems.filter(i => i.available).length,
    soldOut: filteredItems.filter(i => !i.available).length,
    scheduleLocked: filteredItems.filter(i => isItemScheduleLockedForDay(i, selectedDay)).length,
  };

  const renderItem = ({ item }) => {
    const getFoodTypeIcon = (type) => {
      switch (type) {
        case 'veg': return '🟢';
        case 'nonveg': return '🔴';
        case 'egg': return '🟡';
        default: return '⚪';
      }
    };

    const isScheduleLocked = isItemScheduleLockedForDay(item, selectedDay);

    return (
      <TouchableOpacity
        style={[
          styles.itemCard, 
          !item.available && styles.itemCardOutOfStock,
          isScheduleLocked && styles.itemCardScheduleLocked
        ]}
        onPress={() => navigation.navigate('SpecialItemForm', { item })}
        activeOpacity={0.7}
      >
        <View style={styles.itemImageContainer}>
          {item.image ? (
            <Image 
              source={{ uri: item.image.startsWith('http') ? item.image : `${API_BASE_URL}${item.image}` }} 
              style={[styles.itemImage, isScheduleLocked && styles.itemImageLocked]} 
            />
          ) : (
            <View style={[styles.itemImagePlaceholder, isScheduleLocked && styles.itemImagePlaceholderLocked]}>
              <Ionicons name="fast-food-outline" size={32} color={isScheduleLocked ? "#9CA3AF" : "#CCCCCC"} />
            </View>
          )}
          
          {/* Schedule Lock Overlay */}
          {isScheduleLocked && (
            <View style={styles.scheduleLockOverlay}>
              <View style={styles.scheduleLockBadge}>
                <Ionicons name="time-outline" size={14} color="#fff" />
              </View>
            </View>
          )}
          
          {/* Food Type Badge */}
          {item.foodType && item.foodType !== 'none' && (
            <View style={[styles.foodTypeBadge, {
              borderColor: isScheduleLocked ? '#9CA3AF' : (item.foodType === 'veg' ? '#22c55e' : item.foodType === 'egg' ? '#f59e0b' : '#ef4444')
            }]}>
              <View style={[styles.foodTypeDot, {
                backgroundColor: isScheduleLocked ? '#9CA3AF' : (item.foodType === 'veg' ? '#22c55e' : item.foodType === 'egg' ? '#f59e0b' : '#ef4444')
              }]} />
            </View>
          )}
        </View>
        
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, !item.available && styles.itemNameOutOfStock, isScheduleLocked && styles.itemNameScheduleLocked]} numberOfLines={1}>
            🔥 {item.name}
          </Text>
          
          {/* Show days this item appears on */}
          {item.days && item.days.length > 1 && (
            <View style={styles.itemDaysContainer}>
              <Text style={styles.itemDaysLabel}>Also on: </Text>
              {item.days.filter(d => d !== selectedDay).slice(0, 3).map((dayIndex, index) => (
                <View key={dayIndex} style={styles.itemDayChip}>
                  <Text style={styles.itemDayChipText}>{DAY_SHORT[dayIndex]}</Text>
                </View>
              ))}
              {item.days.filter(d => d !== selectedDay).length > 3 && (
                <Text style={styles.itemDaysMore}>+{item.days.filter(d => d !== selectedDay).length - 3}</Text>
              )}
            </View>
          )}
          
          
          <View style={styles.itemFooter}>
            <View style={styles.priceContainer}>
              {item.originalPrice && item.originalPrice > item.price ? (
                <View style={styles.priceRow}>
                  <Text style={[styles.originalPrice, !item.available && styles.priceOutOfStock, isScheduleLocked && styles.priceScheduleLocked]}>₹{item.originalPrice}</Text>
                  <Text style={[styles.itemPrice, !item.available && styles.priceOutOfStock, isScheduleLocked && styles.priceScheduleLocked]}>₹{item.price}</Text>
                </View>
              ) : (
                <Text style={[styles.itemPrice, !item.available && styles.priceOutOfStock, isScheduleLocked && styles.priceScheduleLocked]}>₹{item.price}</Text>
              )}
            </View>
            
            {/* Show schedule status or stock toggle */}
            {isScheduleLocked ? (
              <View style={styles.scheduleStatusBadge}>
                <Ionicons name="time-outline" size={12} color="#6366f1" />
                <Text style={styles.scheduleStatusText}>
                  {(() => {
                    const itemDays = item.days && item.days.length > 0 ? item.days : [item.day];
                    const currentDay = currentTime.getDay();
                    
                    // If viewing today's tab and item is scheduled for today, show today's global schedule
                    if (selectedDay === currentDay && itemDays.includes(currentDay)) {
                      const todaySchedule = daySchedules[currentDay];
                      return todaySchedule ? 
                        `${formatTime12Hour(todaySchedule.startTime)} - ${formatTime12Hour(todaySchedule.endTime)}` : 
                        'Scheduled';
                    }
                    
                    // If viewing a different day's tab, show that day's global schedule
                    if (itemDays.includes(selectedDay)) {
                      const selectedDaySchedule = daySchedules[selectedDay];
                      return selectedDaySchedule ? 
                        `${formatTime12Hour(selectedDaySchedule.startTime)} - ${formatTime12Hour(selectedDaySchedule.endTime)}` : 
                        `${DAY_SHORT[selectedDay]}`;
                    }
                    
                    // If item is not scheduled for selected day, show next scheduled day
                    const nextDay = itemDays.find(d => d > selectedDay) || itemDays[0];
                    const nextDaySchedule = daySchedules[nextDay];
                    return nextDaySchedule ? 
                      `${DAY_SHORT[nextDay]} ${formatTime12Hour(nextDaySchedule.startTime)}-${formatTime12Hour(nextDaySchedule.endTime)}` : 
                      `${DAY_SHORT[nextDay]}`;
                  })()}
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

        {/* Delete Button - always enabled, no schedule lock restriction */}
        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={() => handleDeleteItem(item._id, item.name, item.days)}
          disabled={togglingId === item._id}
        >
          {togglingId === item._id ? (
            <ActivityIndicator size="small" color={ZOMATO_RED} />
          ) : (
            <Ionicons name="trash-outline" size={20} color={ZOMATO_RED} />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

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
                  <Text style={styles.title}>🔥 Today's Special</Text>
                  <Text style={styles.subtitle}>
                    {stats.totalItems} items • {stats.available} available
                    {stats.scheduleLocked > 0 && ` • ${stats.scheduleLocked} scheduled`}
                  </Text>
                </View>
              </View>
              <View style={styles.headerButtons}>
                <TouchableOpacity 
                  style={styles.headerButton} 
                  onPress={() => navigation.navigate('SpecialItemForm', { day: selectedDay })}
                >
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
            placeholder="Search special items..."
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

      {/* Day Categories with Food Type Filter */}
      <View style={styles.categoriesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.dayScrollView}
          contentContainerStyle={styles.dayScrollContent}
        >
          {DAY_CATEGORIES.map((day) => {
            const isSelected = selectedDay === day.id;
            const isToday = new Date().getDay() === day.id;
            const schedule = daySchedules[day.id];
            const itemCount = items.filter(item => {
              const itemDays = item.days && item.days.length > 0 ? item.days : [item.day];
              return itemDays.includes(day.id);
            }).length;
            
            return (
              <TouchableOpacity
                key={day.id}
                style={styles.dayCardContainer}
                onPress={() => setSelectedDay(day.id)}
                onLongPress={() => openScheduleModal(day)}
                activeOpacity={0.7}
              >
                <View style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}>
                  <Text style={[styles.dayShort, isSelected && styles.dayShortSelected]}>
                    {day.short}
                  </Text>
                  {isToday && !isSelected && (
                    <View style={styles.todayDot} />
                  )}
                </View>
                <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>
                  {day.short}
                </Text>
                {schedule && (
                  <Text style={styles.daySchedule}>
                    {formatTime12Hour(schedule.startTime)} - {formatTime12Hour(schedule.endTime)}
                  </Text>
                )}
                {itemCount > 0 && (
                  <View style={styles.itemCountBadge}>
                    <Text style={styles.itemCountText}>{itemCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Food Type Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
          contentContainerStyle={styles.filterScrollContent}
        >
          <TouchableOpacity
            style={[styles.filterChip, foodTypeFilter === 'all' && styles.filterChipActive]}
            onPress={() => setFoodTypeFilter('all')}
          >
            <Text style={[styles.filterChipText, foodTypeFilter === 'all' && styles.filterChipTextActive]}>All</Text>
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

      {/* Items List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ZOMATO_RED} />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ZOMATO_RED]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color="#CCCCCC" />
              <Text style={styles.emptyText}>
                No special items for {DAY_CATEGORIES[selectedDay].name}
              </Text>
              <Text style={styles.emptySubText}>
                Add 🔥 special items to make {DAY_CATEGORIES[selectedDay].name} amazing for your customers
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('SpecialItemForm', { day: selectedDay })}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.emptyButtonText}>Add Special Item</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Schedule Modal */}
      <Modal
        visible={showScheduleModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowScheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Set Schedule for {editingDay?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              {/* Quick Time Presets */}
              <View style={styles.presetContainer}>
                <Text style={styles.presetLabel}>Quick Select:</Text>
                <View style={styles.presetButtons}>
                  <TouchableOpacity 
                    style={styles.presetButton}
                    onPress={() => setScheduleForm({ ...scheduleForm, startTime: '09:00', endTime: '17:00' })}
                  >
                    <Text style={styles.presetButtonText}>9AM - 5PM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.presetButton}
                    onPress={() => setScheduleForm({ ...scheduleForm, startTime: '11:00', endTime: '22:00' })}
                  >
                    <Text style={styles.presetButtonText}>11AM - 10PM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.presetButton}
                    onPress={() => setScheduleForm({ ...scheduleForm, startTime: '18:00', endTime: '23:00' })}
                  >
                    <Text style={styles.presetButtonText}>6PM - 11PM</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Text style={styles.timeLabel}>Start Time</Text>
                  <View style={styles.timePickerContainer}>
                    <View style={styles.timePicker}>
                      <Text style={styles.timePickerLabel}>Hour</Text>
                      <ScrollView 
                        style={styles.timeScrollView}
                        showsVerticalScrollIndicator={false}
                        snapToInterval={40}
                        decelerationRate="fast"
                        contentContainerStyle={{ paddingVertical: 40 }}
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <TouchableOpacity 
                            key={i} 
                            style={[
                              styles.timeOption,
                              parseInt(scheduleForm.startTime.split(':')[0]) === i && styles.timeOptionSelected
                            ]}
                            onPress={() => {
                              const currentMinute = parseInt(scheduleForm.startTime.split(':')[1]);
                              setScheduleForm({ 
                                ...scheduleForm, 
                                startTime: `${i.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}` 
                              });
                            }}
                          >
                            <Text style={[
                              styles.timeOptionText,
                              parseInt(scheduleForm.startTime.split(':')[0]) === i && styles.timeOptionTextSelected
                            ]}>
                              {i.toString().padStart(2, '0')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                    
                    <Text style={styles.timeSeparator}>:</Text>
                    
                    <View style={styles.timePicker}>
                      <Text style={styles.timePickerLabel}>Min</Text>
                      <ScrollView 
                        style={styles.timeScrollView}
                        showsVerticalScrollIndicator={false}
                        snapToInterval={40}
                        decelerationRate="fast"
                        contentContainerStyle={{ paddingVertical: 40 }}
                      >
                        {Array.from({ length: 4 }, (_, i) => (
                          <TouchableOpacity 
                            key={i} 
                            style={[
                              styles.timeOption,
                              parseInt(scheduleForm.startTime.split(':')[1]) === i * 15 && styles.timeOptionSelected
                            ]}
                            onPress={() => {
                              const currentHour = parseInt(scheduleForm.startTime.split(':')[0]);
                              setScheduleForm({ 
                                ...scheduleForm, 
                                startTime: `${currentHour.toString().padStart(2, '0')}:${(i * 15).toString().padStart(2, '0')}` 
                              });
                            }}
                          >
                            <Text style={[
                              styles.timeOptionText,
                              parseInt(scheduleForm.startTime.split(':')[1]) === i * 15 && styles.timeOptionTextSelected
                            ]}>
                              {(i * 15).toString().padStart(2, '0')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                  <Text style={styles.timeFormat}>{formatTime12Hour(scheduleForm.startTime)}</Text>
                </View>
                
                <View style={styles.timeField}>
                  <Text style={styles.timeLabel}>End Time</Text>
                  <View style={styles.timePickerContainer}>
                    <View style={styles.timePicker}>
                      <Text style={styles.timePickerLabel}>Hour</Text>
                      <ScrollView 
                        style={styles.timeScrollView}
                        showsVerticalScrollIndicator={false}
                        snapToInterval={40}
                        decelerationRate="fast"
                        contentContainerStyle={{ paddingVertical: 40 }}
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <TouchableOpacity 
                            key={i} 
                            style={[
                              styles.timeOption,
                              parseInt(scheduleForm.endTime.split(':')[0]) === i && styles.timeOptionSelected
                            ]}
                            onPress={() => {
                              const currentMinute = parseInt(scheduleForm.endTime.split(':')[1]);
                              setScheduleForm({ 
                                ...scheduleForm, 
                                endTime: `${i.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}` 
                              });
                            }}
                          >
                            <Text style={[
                              styles.timeOptionText,
                              parseInt(scheduleForm.endTime.split(':')[0]) === i && styles.timeOptionTextSelected
                            ]}>
                              {i.toString().padStart(2, '0')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                    
                    <Text style={styles.timeSeparator}>:</Text>
                    
                    <View style={styles.timePicker}>
                      <Text style={styles.timePickerLabel}>Min</Text>
                      <ScrollView 
                        style={styles.timeScrollView}
                        showsVerticalScrollIndicator={false}
                        snapToInterval={40}
                        decelerationRate="fast"
                        contentContainerStyle={{ paddingVertical: 40 }}
                      >
                        {Array.from({ length: 4 }, (_, i) => (
                          <TouchableOpacity 
                            key={i} 
                            style={[
                              styles.timeOption,
                              parseInt(scheduleForm.endTime.split(':')[1]) === i * 15 && styles.timeOptionSelected
                            ]}
                            onPress={() => {
                              const currentHour = parseInt(scheduleForm.endTime.split(':')[0]);
                              setScheduleForm({ 
                                ...scheduleForm, 
                                endTime: `${currentHour.toString().padStart(2, '0')}:${(i * 15).toString().padStart(2, '0')}` 
                              });
                            }}
                          >
                            <Text style={[
                              styles.timeOptionText,
                              parseInt(scheduleForm.endTime.split(':')[1]) === i * 15 && styles.timeOptionTextSelected
                            ]}>
                              {(i * 15).toString().padStart(2, '0')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                  <Text style={styles.timeFormat}>{formatTime12Hour(scheduleForm.endTime)}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => setShowScheduleModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSaveButton} 
                onPress={saveSchedule}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
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
  searchContainer: {
    paddingHorizontal: 16,
    marginTop: -20,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1C1C1C',
    fontWeight: '500',
  },
  categoriesContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dayScrollView: {
    backgroundColor: '#fff',
  },
  dayScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 16,
  },
  dayCardContainer: {
    alignItems: 'center',
    width: 70,
  },
  dayCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  dayCircleSelected: {
    backgroundColor: ZOMATO_RED,
    borderColor: ZOMATO_RED,
    shadowColor: ZOMATO_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dayShort: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  dayShortSelected: {
    color: '#fff',
  },
  todayDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ZOMATO_RED,
  },
  scheduleStatusDot: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#fff',
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  dayLabelSelected: {
    color: ZOMATO_RED,
  },
  daySchedule: {
    fontSize: 9,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  itemCountBadge: {
    position: 'absolute',
    top: -4,
    right: 8,
    backgroundColor: ZOMATO_RED,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  itemCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  filterScrollView: {
    backgroundColor: '#fff',
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 12,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
  },
  filterChipActive: {
    backgroundColor: '#1C1C1C',
    borderColor: '#1C1C1C',
  },
  filterChipText: {
    fontSize: 13,
    color: '#696969',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  filterDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E8E8E8',
    marginHorizontal: 4,
  },
  foodTypeIcon: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodTypeIconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  itemCardOutOfStock: {
    opacity: 0.6,
  },
  itemCardScheduleLocked: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  itemImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  itemImageLocked: {
    opacity: 0.5,
  },
  itemImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemImagePlaceholderLocked: {
    backgroundColor: '#F1F5F9',
  },
  scheduleLockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleLockBadge: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodTypeBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  foodTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  itemNameOutOfStock: {
    color: '#9CA3AF',
  },
  itemNameScheduleLocked: {
    color: '#64748B',
  },
  itemDaysContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  itemDaysLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    marginRight: 4,
  },
  itemDayChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
    marginBottom: 2,
  },
  itemDayChipText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  itemDaysMore: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  tagChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tagChipOutOfStock: {
    backgroundColor: '#F9FAFB',
    borderColor: '#F3F4F6',
  },
  tagChipScheduleLocked: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  tagText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  tagTextOutOfStock: {
    color: '#9CA3AF',
  },
  tagTextScheduleLocked: {
    color: '#94A3B8',
  },
  moreTagsText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  moreTagsTextOutOfStock: {
    color: '#D1D5DB',
  },
  moreTagsTextScheduleLocked: {
    color: '#CBD5E1',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: ZOMATO_RED,
  },
  originalPrice: {
    fontSize: 13,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  priceOutOfStock: {
    color: '#9CA3AF',
  },
  priceScheduleLocked: {
    color: '#94A3B8',
  },
  availabilityToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 70,
    alignItems: 'center',
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scheduleStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  scheduleStatusText: {
    fontSize: 10,
    color: '#6366f1',
    fontWeight: '600',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButtonDisabled: {
    backgroundColor: '#F8FAFC',
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ZOMATO_RED,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalContent: {
    padding: 20,
  },
  presetContainer: {
    marginBottom: 20,
  },
  presetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  presetButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  presetButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  presetButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeField: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  timePicker: {
    alignItems: 'center',
  },
  timeScrollView: {
    height: 120,
    width: 60,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timeOption: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  timeOptionSelected: {
    backgroundColor: ZOMATO_RED,
  },
  timeOptionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
  },
  timeOptionTextSelected: {
    color: '#fff',
  },
  timePickerLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: '700',
    color: ZOMATO_RED,
    marginHorizontal: 16,
  },
  timeFormat: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: ZOMATO_RED,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
