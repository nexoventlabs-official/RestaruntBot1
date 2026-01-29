import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Modal,
  RefreshControl, TouchableOpacity, ActivityIndicator, Animated, Platform, StatusBar, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api, { API_BASE_URL } from '../../config/api';
import { colors, spacing, radius, typography, shadows } from '../../theme';

const REPORT_TYPES = [
  { id: 'today', label: 'Today', icon: 'today-outline' },
  { id: 'weekly', label: 'Week', icon: 'calendar-outline' },
  { id: 'monthly', label: 'Month', icon: 'calendar' },
  { id: 'yearly', label: 'Year', icon: 'calendar-number-outline' },
  { id: 'custom', label: 'Custom', icon: 'options-outline' },
];

const StatCard = ({ icon, title, value, color, bgColor, gradientColors, delay = 0 }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, delay, useNativeDriver: true }),
    ]).start();
  }, [value]);

  if (gradientColors) {
    return (
      <Animated.View style={[styles.statCard, styles.statCardGradient, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCardGradientInner}
        >
          <View style={styles.statCardDecor}>
            <Ionicons name={icon.replace('-outline', '')} size={60} color="rgba(255,255,255,0.15)" />
          </View>
          <View style={[styles.statIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name={icon} size={22} color="#fff" />
          </View>
          <Text style={[styles.statValue, styles.statValueWhite]}>{value}</Text>
          <Text style={[styles.statTitle, styles.statTitleWhite]}>{title}</Text>
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.statCard, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
      <View style={[styles.statIconContainer, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </Animated.View>
  );
};

const SmallStatCard = ({ icon, title, value, color, bgColor }) => (
  <View style={styles.smallStatCard}>
    <View style={[styles.smallIconContainer, { backgroundColor: bgColor }]}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <View style={styles.smallStatInfo}>
      <Text style={styles.smallStatValue}>{value}</Text>
      <Text style={styles.smallStatTitle}>{title}</Text>
    </View>
  </View>
);

// Dropdown Selector Component
const DropdownSelector = ({ label, value, options, onSelect, isOpen, onToggle }) => (
  <View style={styles.dropdownContainer}>
    <Text style={styles.dropdownLabel}>{label}</Text>
    <TouchableOpacity style={styles.dropdownButton} onPress={onToggle}>
      <Text style={styles.dropdownButtonText}>{value}</Text>
      <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.light.text.secondary} />
    </TouchableOpacity>
    {isOpen && (
      <View style={styles.dropdownList}>
        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled showsVerticalScrollIndicator>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.dropdownItem, value === option.label && styles.dropdownItemActive]}
              onPress={() => onSelect(option)}
            >
              <Text style={[styles.dropdownItemText, value === option.label && styles.dropdownItemTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    )}
  </View>
);

// Custom Date Picker Modal with Dropdowns
const DatePickerModal = ({ visible, onClose, onSelect, initialDate, title }) => {
  const [day, setDay] = useState(1);
  const [month, setMonth] = useState(1);
  const [year, setYear] = useState(2025);
  const [openDropdown, setOpenDropdown] = useState(null); // 'day', 'month', 'year', or null

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => ({
    value: currentYear - 5 + i,
    label: (currentYear - 5 + i).toString(),
  }));

  // Get days in selected month
  const getDaysInMonth = (m, y) => new Date(y, m, 0).getDate();
  const daysInMonth = getDaysInMonth(month, year);
  const days = Array.from({ length: daysInMonth }, (_, i) => ({
    value: i + 1,
    label: (i + 1).toString().padStart(2, '0'),
  }));

  useEffect(() => {
    if (visible && initialDate) {
      const d = new Date(initialDate);
      setDay(d.getDate());
      setMonth(d.getMonth() + 1);
      setYear(d.getFullYear());
      setOpenDropdown(null);
    }
  }, [visible, initialDate]);

  // Adjust day if it exceeds days in new month
  useEffect(() => {
    if (day > daysInMonth) {
      setDay(daysInMonth);
    }
  }, [month, year, daysInMonth]);

  const handleConfirm = () => {
    const date = new Date(year, month - 1, day);
    onSelect(date);
    onClose();
  };

  const getMonthLabel = () => months.find(m => m.value === month)?.label || '';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setOpenDropdown(null)}
      >
        <View style={styles.datePickerModal}>
          <View style={styles.datePickerHeader}>
            <Text style={styles.datePickerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.datePickerClose}>
              <Ionicons name="close" size={24} color={colors.light.text.secondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.dateDropdownRow}>
            <DropdownSelector
              label="Day"
              value={day.toString().padStart(2, '0')}
              options={days}
              isOpen={openDropdown === 'day'}
              onToggle={() => setOpenDropdown(openDropdown === 'day' ? null : 'day')}
              onSelect={(opt) => { setDay(opt.value); setOpenDropdown(null); }}
            />
            <DropdownSelector
              label="Month"
              value={getMonthLabel()}
              options={months}
              isOpen={openDropdown === 'month'}
              onToggle={() => setOpenDropdown(openDropdown === 'month' ? null : 'month')}
              onSelect={(opt) => { setMonth(opt.value); setOpenDropdown(null); }}
            />
            <DropdownSelector
              label="Year"
              value={year.toString()}
              options={years}
              isOpen={openDropdown === 'year'}
              onToggle={() => setOpenDropdown(openDropdown === 'year' ? null : 'year')}
              onSelect={(opt) => { setYear(opt.value); setOpenDropdown(null); }}
            />
          </View>

          <View style={styles.datePickerActions}>
            <TouchableOpacity style={styles.datePickerCancelBtn} onPress={onClose}>
              <Text style={styles.datePickerCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.datePickerConfirmBtn} onPress={handleConfirm}>
              <Text style={styles.datePickerConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default function ReportDetailScreen({ navigation }) {
  const [reportType, setReportType] = useState('today');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportData, setReportData] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Custom date range state
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [customDateApplied, setCustomDateApplied] = useState(false);
  const [fromDateSelected, setFromDateSelected] = useState(false);
  const [dateError, setDateError] = useState('');

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const fetchReport = useCallback(async (type, from = null, to = null) => {
    try {
      let url = `/analytics/report?type=${type}`;
      if (type === 'custom' && from && to) {
        url = `/analytics/report?type=custom&startDate=${from.toISOString()}&endDate=${to.toISOString()}`;
      }
      const response = await api.get(url);
      setReportData(response.data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
      setReportData({ totalRevenue: 0, totalOrders: 0, totalItemsSold: 0, avgOrderValue: 0, deliveredOrders: 0, cancelledOrders: 0, refundedOrders: 0, codOrders: 0, upiOrders: 0, topSellingItems: [], leastSellingItems: [] });
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    if (reportType !== 'custom') {
      setLoading(true);
      setCustomDateApplied(false);
      setFromDateSelected(false);
      setDateError('');
      fetchReport(reportType);
    }
  }, [reportType, fetchReport]);

  // Handle From date selection
  const handleFromDateSelect = (date) => {
    setFromDate(date);
    setFromDateSelected(true);
    setDateError('');
    // If toDate is already set and is before new fromDate, reset it
    if (customDateApplied && toDate < date) {
      setToDate(date);
      setCustomDateApplied(false);
    }
    // Auto open To date picker after selecting From date
    setTimeout(() => setShowToPicker(true), 300);
  };

  // Handle To date selection - auto fetch report
  const handleToDateSelect = (date) => {
    // Validate: To date must be >= From date
    if (date < fromDate) {
      setDateError(`"To" date cannot be before "From" date (${formatDate(fromDate)})`);
      return;
    }
    
    setDateError('');
    setToDate(date);
    if (fromDateSelected && fromDate) {
      setLoading(true);
      setCustomDateApplied(true);
      fetchReport('custom', fromDate, date);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (reportType === 'custom' && customDateApplied) {
      fetchReport('custom', fromDate, toDate);
    } else {
      fetchReport(reportType);
    }
  }, [reportType, fetchReport, fromDate, toDate, customDateApplied]);

  const formatCurrency = (val) => `₹${(val || 0).toLocaleString('en-IN')}`;
  
  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleReportTypeChange = (type) => {
    setReportType(type);
    if (type === 'custom') {
      // Set default date range (last 7 days)
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      setFromDate(weekAgo);
      setToDate(today);
      setFromDateSelected(false);
      setCustomDateApplied(false);
      // Auto open From date picker
      setTimeout(() => setShowFromPicker(true), 300);
    }
  };

  if (loading && !reportData) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient colors={[colors.zomato.red, colors.zomato.darkRed]} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Report Details</Text>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
        <ActivityIndicator size="large" color={colors.zomato.red} style={{ flex: 1 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient colors={[colors.zomato.red, colors.zomato.darkRed]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Report Details</Text>
            <Text style={styles.subtitle}>Track your business performance</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsList}>
          {REPORT_TYPES.map((type) => (
            <TouchableOpacity 
              key={type.id} 
              style={[styles.tab, reportType === type.id && styles.tabActive]} 
              onPress={() => handleReportTypeChange(type.id)} 
              activeOpacity={0.7}
            >
              <Ionicons name={type.icon} size={16} color={reportType === type.id ? '#fff' : colors.light.text.secondary} />
              <Text style={[styles.tabText, reportType === type.id && styles.tabTextActive]}>{type.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Custom Date Range Selector */}
      {reportType === 'custom' && (
        <View style={styles.customDateContainer}>
          <Text style={styles.customDateHint}>
            {!fromDateSelected ? 'Select start date' : !customDateApplied ? 'Now select end date' : 'Tap dates to change range'}
          </Text>
          <View style={styles.dateRangeRow}>
            <TouchableOpacity 
              style={[styles.dateSelector, fromDateSelected && styles.dateSelectorSelected]} 
              onPress={() => { setDateError(''); setShowFromPicker(true); }}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.zomato.red} />
              <View style={styles.dateSelectorText}>
                <Text style={styles.dateSelectorLabel}>From</Text>
                <Text style={styles.dateSelectorValue}>{formatDate(fromDate)}</Text>
              </View>
              {fromDateSelected && <Ionicons name="checkmark-circle" size={16} color="#22C55E" />}
            </TouchableOpacity>
            
            <Ionicons name="arrow-forward" size={20} color={colors.light.text.tertiary} />
            
            <TouchableOpacity 
              style={[styles.dateSelector, customDateApplied && styles.dateSelectorSelected, dateError && styles.dateSelectorError]} 
              onPress={() => { setDateError(''); setShowToPicker(true); }}
            >
              <Ionicons name="calendar-outline" size={18} color={dateError ? '#EF4444' : colors.zomato.red} />
              <View style={styles.dateSelectorText}>
                <Text style={styles.dateSelectorLabel}>To</Text>
                <Text style={styles.dateSelectorValue}>{formatDate(toDate)}</Text>
              </View>
              {customDateApplied && !dateError && <Ionicons name="checkmark-circle" size={16} color="#22C55E" />}
              {dateError && <Ionicons name="alert-circle" size={16} color="#EF4444" />}
            </TouchableOpacity>
          </View>
          
          {/* Error Message */}
          {dateError ? (
            <View style={styles.dateErrorContainer}>
              <Ionicons name="warning" size={14} color="#EF4444" />
              <Text style={styles.dateErrorText}>{dateError}</Text>
            </View>
          ) : null}
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.zomato.red]} />}>
        {/* Date Range Display for Custom */}
        {reportType === 'custom' && customDateApplied && (
          <View style={styles.dateRangeBadge}>
            <Ionicons name="calendar" size={14} color={colors.zomato.red} />
            <Text style={styles.dateRangeBadgeText}>
              {formatDate(fromDate)} - {formatDate(toDate)}
            </Text>
          </View>
        )}

        <View style={styles.statsGrid}>
          <StatCard icon="cash-outline" title="Revenue" value={formatCurrency(reportData?.totalRevenue)} color="#22C55E" bgColor="#DCFCE7" gradientColors={['#22C55E', '#16A34A']} delay={0} />
          <StatCard icon="receipt-outline" title="Orders" value={reportData?.totalOrders || 0} color="#EC4899" bgColor="#FCE7F3" gradientColors={['#EC4899', '#DB2777']} delay={100} />
        </View>

        <View style={styles.statsGrid}>
          <StatCard icon="cube-outline" title="Items Sold" value={reportData?.totalItemsSold || 0} color="#06B6D4" bgColor="#CFFAFE" gradientColors={['#06B6D4', '#0891B2']} delay={200} />
          <StatCard icon="trending-up-outline" title="Avg Order" value={formatCurrency(reportData?.avgOrderValue)} color="#EF4444" bgColor="#FEE2E2" gradientColors={['#EF4444', '#DC2626']} delay={300} />
        </View>

        {/* Order & Payment Status Row */}
        <View style={styles.orderPaymentStatusCard}>
          <View style={styles.orderPaymentStatusRow}>
            <View style={styles.orderPaymentStatusItem}>
              <View style={[styles.orderPaymentStatusIcon, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="checkmark-circle" size={28} color="#22C55E" />
              </View>
              <Text style={styles.orderPaymentStatusLabel}>Delivered</Text>
              <Text style={styles.orderPaymentStatusValue}>{reportData?.deliveredOrders || 0}</Text>
            </View>
            <View style={styles.orderPaymentStatusItem}>
              <View style={[styles.orderPaymentStatusIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="close-circle" size={28} color="#EF4444" />
              </View>
              <Text style={styles.orderPaymentStatusLabel}>Cancelled</Text>
              <Text style={styles.orderPaymentStatusValue}>{reportData?.cancelledOrders || 0}</Text>
            </View>
            <View style={styles.orderPaymentStatusItem}>
              <View style={[styles.orderPaymentStatusIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="cash-outline" size={28} color="#F59E0B" />
              </View>
              <Text style={styles.orderPaymentStatusLabel}>COD</Text>
              <Text style={styles.orderPaymentStatusValue}>{reportData?.codOrders || 0}</Text>
            </View>
            <View style={styles.orderPaymentStatusItem}>
              <View style={[styles.orderPaymentStatusIcon, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="phone-portrait-outline" size={28} color="#8B5CF6" />
              </View>
              <Text style={styles.orderPaymentStatusLabel}>UPI</Text>
              <Text style={styles.orderPaymentStatusValue}>{reportData?.upiOrders || 0}</Text>
            </View>
          </View>
        </View>

        {reportData?.topSellingItems?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>🔥 Top Selling</Text>
            <View style={styles.itemsContainer}>
              {reportData.topSellingItems.slice(0, 5).map((item, index) => (
                <View key={index} style={styles.itemCard}>
                  <View style={[styles.itemRank, { backgroundColor: index < 3 ? '#FEF3C7' : colors.light.surfaceSecondary }]}>
                    <Text style={[styles.itemRankText, { color: index < 3 ? '#F59E0B' : colors.light.text.secondary }]}>{index + 1}</Text>
                  </View>
                  {item.image ? (
                    <Image 
                      source={{ uri: item.image.startsWith('http') ? item.image : `${API_BASE_URL}${item.image}` }} 
                      style={styles.itemImage} 
                    />
                  ) : (
                    <View style={styles.itemImagePlaceholder}>
                      <Ionicons name="fast-food-outline" size={20} color={colors.light.text.tertiary} />
                    </View>
                  )}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.itemMeta}>
                      <Text style={styles.itemQty}>{item.quantity} sold</Text>
                      {item.avgRating > 0 && (
                        <View style={styles.ratingBadge}>
                          <Ionicons name="star" size={10} color="#F59E0B" />
                          <Text style={styles.ratingText}>{item.avgRating?.toFixed(1)}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={styles.itemRevenue}>{formatCurrency(item.revenue)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {reportData?.leastSellingItems?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>📉 Least Selling</Text>
            <View style={styles.itemsContainer}>
              {reportData.leastSellingItems.slice(0, 5).map((item, index) => (
                <View key={index} style={styles.itemCard}>
                  <View style={[styles.itemRank, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[styles.itemRankText, { color: '#EF4444' }]}>{index + 1}</Text>
                  </View>
                  {item.image ? (
                    <Image 
                      source={{ uri: item.image.startsWith('http') ? item.image : `${API_BASE_URL}${item.image}` }} 
                      style={styles.itemImage} 
                    />
                  ) : (
                    <View style={styles.itemImagePlaceholder}>
                      <Ionicons name="fast-food-outline" size={20} color={colors.light.text.tertiary} />
                    </View>
                  )}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.itemMeta}>
                      <Text style={styles.itemQty}>{item.quantity} sold</Text>
                      {item.avgRating > 0 && (
                        <View style={styles.ratingBadge}>
                          <Ionicons name="star" size={10} color="#F59E0B" />
                          <Text style={styles.ratingText}>{item.avgRating?.toFixed(1)}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={[styles.itemRevenue, { color: '#EF4444' }]}>{formatCurrency(item.revenue)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {!reportData?.totalOrders && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="bar-chart-outline" size={48} color={colors.light.text.tertiary} />
            </View>
            <Text style={styles.emptyTitle}>No data for this period</Text>
            <Text style={styles.emptyText}>Orders will appear in reports once placed</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Date Picker Modals */}
      <DatePickerModal
        visible={showFromPicker}
        onClose={() => setShowFromPicker(false)}
        onSelect={handleFromDateSelect}
        initialDate={fromDate}
        title="Select From Date"
      />
      <DatePickerModal
        visible={showToPicker}
        onClose={() => setShowToPicker(false)}
        onSelect={handleToDateSelect}
        initialDate={toDate}
        title="Select To Date"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  header: { 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 15 : 60, 
    paddingBottom: spacing.lg, 
    paddingHorizontal: spacing.screenHorizontal, 
    borderBottomLeftRadius: 24, 
    borderBottomRightRadius: 24 
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: { fontSize: typography.display.small.fontSize, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: typography.body.medium.fontSize, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  placeholder: { width: 40 },
  tabsContainer: { backgroundColor: colors.light.surface, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.light.borderLight },
  tabsList: { paddingHorizontal: spacing.screenHorizontal },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.light.surfaceSecondary, marginRight: spacing.sm },
  tabActive: { backgroundColor: colors.zomato.red },
  tabText: { fontSize: typography.label.medium.fontSize, color: colors.light.text.secondary, fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  
  // Custom Date Range Styles
  customDateContainer: {
    backgroundColor: colors.light.surface,
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.borderLight,
  },
  customDateHint: {
    fontSize: 12,
    color: colors.light.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surfaceSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dateSelectorSelected: {
    borderColor: '#22C55E',
    backgroundColor: '#22C55E10',
  },
  dateSelectorError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  dateSelectorText: {
    flex: 1,
  },
  dateSelectorLabel: {
    fontSize: 11,
    color: colors.light.text.tertiary,
    fontWeight: '500',
  },
  dateSelectorValue: {
    fontSize: 14,
    color: colors.light.text.primary,
    fontWeight: '600',
  },
  dateErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  dateErrorText: {
    flex: 1,
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  dateRangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.zomato.red + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    gap: spacing.xs,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  dateRangeBadgeText: {
    fontSize: 12,
    color: colors.zomato.red,
    fontWeight: '600',
  },

  // Date Picker Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.screenHorizontal,
  },
  datePickerModal: {
    backgroundColor: colors.light.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 340,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.text.primary,
  },
  datePickerClose: {
    padding: spacing.xs,
  },
  dateDropdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    zIndex: 100,
  },
  dropdownContainer: {
    flex: 1,
    zIndex: 100,
  },
  dropdownLabel: {
    fontSize: 12,
    color: colors.light.text.tertiary,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.light.borderLight,
  },
  dropdownButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.text.primary,
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.light.surface,
    borderRadius: radius.lg,
    marginTop: 4,
    ...shadows.lg,
    zIndex: 1000,
    elevation: 10,
  },
  dropdownScroll: {
    maxHeight: 180,
  },
  dropdownItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.borderLight,
  },
  dropdownItemActive: {
    backgroundColor: colors.zomato.red + '15',
  },
  dropdownItemText: {
    fontSize: 14,
    color: colors.light.text.primary,
  },
  dropdownItemTextActive: {
    color: colors.zomato.red,
    fontWeight: '600',
  },
  datePickerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  datePickerCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.light.surfaceSecondary,
    alignItems: 'center',
  },
  datePickerCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.text.secondary,
  },
  datePickerConfirmBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.zomato.red,
    alignItems: 'center',
  },
  datePickerConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  content: { flex: 1, padding: spacing.screenHorizontal },
  statsGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md, marginTop: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.light.surface, borderRadius: radius.xl, padding: spacing.base, ...shadows.card },
  statCardGradient: { padding: 0, overflow: 'hidden' },
  statCardGradientInner: { flex: 1, padding: spacing.base, borderRadius: radius.xl, minHeight: 130 },
  statCardDecor: { position: 'absolute', right: -10, bottom: -10 },
  statValueWhite: { color: '#fff' },
  statTitleWhite: { color: 'rgba(255, 255, 255, 0.9)' },
  statIconContainer: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.light.text.primary },
  statTitle: { fontSize: typography.body.small.fontSize, color: colors.light.text.secondary, marginTop: spacing.xs },
  sectionTitle: { fontSize: typography.headline.small.fontSize, fontWeight: '600', color: colors.light.text.primary, marginTop: spacing.lg, marginBottom: spacing.md },
  
  // Order & Payment Status Combined Row
  orderPaymentStatusCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.light.borderLight,
  },
  orderPaymentStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderPaymentStatusItem: {
    flex: 1,
    alignItems: 'center',
  },
  orderPaymentStatusIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  orderPaymentStatusLabel: {
    fontSize: 12,
    color: colors.light.text.secondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  orderPaymentStatusValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.light.text.primary,
  },

  smallStatsGrid: { flexDirection: 'row', gap: spacing.sm },
  smallStatCard: { flex: 1, backgroundColor: colors.light.surface, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, ...shadows.sm },
  smallIconContainer: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  smallStatInfo: { flex: 1 },
  smallStatValue: { fontSize: typography.title.large.fontSize, fontWeight: '700', color: colors.light.text.primary },
  smallStatTitle: { fontSize: typography.label.small.fontSize, color: colors.light.text.tertiary },
  paymentGrid: { flexDirection: 'row', gap: spacing.md },
  paymentCard: { flex: 1, backgroundColor: colors.light.surface, borderRadius: radius.xl, padding: spacing.base, alignItems: 'center', ...shadows.card },
  paymentIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  paymentValue: { fontSize: 24, fontWeight: '700', color: colors.light.text.primary, marginTop: spacing.sm },
  paymentLabel: { fontSize: typography.body.small.fontSize, color: colors.light.text.secondary, marginTop: spacing.xs },
  itemsContainer: { backgroundColor: colors.light.surface, borderRadius: radius.xl, overflow: 'hidden', ...shadows.card },
  itemCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.light.borderLight },
  itemRank: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  itemRankText: { fontSize: typography.label.medium.fontSize, fontWeight: '700' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: typography.title.medium.fontSize, fontWeight: '500', color: colors.light.text.primary },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  itemQty: { fontSize: typography.body.small.fontSize, color: colors.light.text.secondary },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: typography.label.small.fontSize, color: '#F59E0B', fontWeight: '600' },
  itemRevenue: { fontSize: typography.title.medium.fontSize, fontWeight: '600', color: '#22C55E' },
  itemImage: { width: 44, height: 44, borderRadius: 10, marginRight: spacing.sm, backgroundColor: colors.light.surfaceSecondary },
  itemImagePlaceholder: { width: 44, height: 44, borderRadius: 10, marginRight: spacing.sm, backgroundColor: colors.light.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.light.surfaceSecondary, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.base },
  emptyTitle: { fontSize: typography.headline.small.fontSize, fontWeight: '600', color: colors.light.text.secondary },
  emptyText: { fontSize: typography.body.medium.fontSize, color: colors.light.text.tertiary, marginTop: spacing.xs },
});
