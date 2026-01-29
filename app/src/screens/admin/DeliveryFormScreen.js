import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Image, Alert, ActivityIndicator, Switch, Animated, Platform,
  KeyboardAvoidingView, StatusBar, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../config/api';

// Zomato Theme Colors
const ZOMATO_RED = '#E23744';
const ZOMATO_DARK_RED = '#CB1A27';

// Generate arrays for date picker
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTHS = [
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
const YEARS = Array.from({ length: 80 }, (_, i) => currentYear - 16 - i); // Start from 16 years ago (minimum age 16)

export default function DeliveryFormScreen({ route, navigation }) {
  const existingDeliveryBoy = route.params?.deliveryBoy;
  const isEditing = !!existingDeliveryBoy;

  // Parse existing DOB if editing
  const parseExistingDob = () => {
    if (existingDeliveryBoy?.dob) {
      const date = new Date(existingDeliveryBoy.dob);
      return {
        day: date.getDate(),
        month: date.getMonth() + 1,
        year: date.getFullYear()
      };
    }
    return { day: null, month: null, year: null };
  };

  const existingDob = parseExistingDob();

  const [name, setName] = useState(existingDeliveryBoy?.name || '');
  const [email, setEmail] = useState(existingDeliveryBoy?.email || '');
  const [phone, setPhone] = useState(existingDeliveryBoy?.phone || '');
  const [dobDay, setDobDay] = useState(existingDob.day);
  const [dobMonth, setDobMonth] = useState(existingDob.month);
  const [dobYear, setDobYear] = useState(existingDob.year);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [isActive, setIsActive] = useState(existingDeliveryBoy?.isActive !== false);
  const [photo, setPhoto] = useState(existingDeliveryBoy?.photo || null);
  const [newPhoto, setNewPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // Format DOB for display
  const getFormattedDob = () => {
    if (dobDay && dobMonth && dobYear) {
      const monthName = MONTHS.find(m => m.value === dobMonth)?.label || '';
      return `${dobDay} ${monthName.substring(0, 3)} ${dobYear}`;
    }
    return '';
  };

  // Get DOB in ISO format for API
  const getDobForApi = () => {
    if (dobDay && dobMonth && dobYear) {
      const month = String(dobMonth).padStart(2, '0');
      const day = String(dobDay).padStart(2, '0');
      return `${dobYear}-${month}-${day}`;
    }
    return '';
  };

  const pickImage = async () => {
    try {
      setPickingImage(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Reduced from 0.8 for faster uploads
      });
      if (!result.canceled) {
        setNewPhoto(result.assets[0]);
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      setPickingImage(false);
    }
  };

  const handleSubmit = async () => {
    const dob = getDobForApi();
    if (!name.trim() || !phone.trim() || !dob) {
      Alert.alert('Error', 'Please fill in name, phone, and date of birth');
      return;
    }
    if (!isEditing && !email.trim()) {
      Alert.alert('Error', 'Email is required for new delivery partners');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('phone', phone);
      formData.append('dob', dob);
      formData.append('isActive', isActive.toString());

      if (!isEditing) {
        formData.append('email', email);
      }

      if (newPhoto) {
        const filename = newPhoto.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('photo', { uri: newPhoto.uri, name: filename, type });
      }

      if (isEditing) {
        await api.put(`/delivery/${existingDeliveryBoy._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 90000 // 90 seconds for image uploads
        });
        Alert.alert('Success', 'Delivery partner updated');
      } else {
        await api.post('/delivery', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 90000 // 90 seconds for image uploads
        });
        Alert.alert('Success', 'Delivery partner added. Password sent to email.');
      }
      navigation.goBack();
    } catch (error) {
      console.error('Submit error:', error);
      let errorMessage = 'Failed to save';
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Upload timed out. Please check your internet connection and try again.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {/* Premium Header */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <LinearGradient
          colors={[ZOMATO_RED, ZOMATO_DARK_RED]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? 'Edit Partner' : 'New Partner'}</Text>
          <View style={{ width: 44 }} />
        </LinearGradient>
      </Animated.View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Photo Section */}
            <View style={styles.photoSection}>
              <TouchableOpacity 
                style={styles.photoContainer} 
                onPress={pickImage} 
                activeOpacity={0.8}
                disabled={pickingImage}
              >
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.photo} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    {pickingImage ? (
                      <>
                        <ActivityIndicator size="large" color={ZOMATO_RED} />
                        <Text style={styles.photoPlaceholderText}>Opening gallery...</Text>
                      </>
                    ) : (
                      <>
                        <View style={styles.photoPlaceholderIcon}>
                          <Ionicons name="person-outline" size={36} color={ZOMATO_RED} />
                        </View>
                        <Text style={styles.photoPlaceholderText}>Add Photo</Text>
                      </>
                    )}
                  </View>
                )}
                {!pickingImage && (
                  <View style={styles.cameraButton}>
                    <Ionicons name="camera" size={18} color="#fff" />
                  </View>
                )}
                {pickingImage && photo && (
                  <View style={styles.photoLoadingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#9CA3AF" />
                  <TextInput 
                    style={styles.input} 
                    value={name} 
                    onChangeText={setName} 
                    placeholder="Enter full name" 
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email {!isEditing && <Text style={styles.required}>*</Text>}</Text>
                <View style={[styles.inputWrapper, isEditing && styles.inputDisabled]}>
                  <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="email@example.com"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isEditing}
                  />
                </View>
                {isEditing && <Text style={styles.inputHint}>Email cannot be changed</Text>}
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Enter phone number"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Date of Birth */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date of Birth <Text style={styles.required}>*</Text></Text>
                <View style={styles.dobContainer}>
                  {/* Day Picker */}
                  <TouchableOpacity 
                    style={styles.dobPicker} 
                    onPress={() => setShowDayPicker(true)}
                  >
                    <Text style={[styles.dobPickerText, !dobDay && styles.dobPlaceholder]}>
                      {dobDay || 'Day'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                  </TouchableOpacity>

                  {/* Month Picker */}
                  <TouchableOpacity 
                    style={[styles.dobPicker, styles.dobPickerMonth]} 
                    onPress={() => setShowMonthPicker(true)}
                  >
                    <Text style={[styles.dobPickerText, !dobMonth && styles.dobPlaceholder]}>
                      {dobMonth ? MONTHS.find(m => m.value === dobMonth)?.label.substring(0, 3) : 'Month'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                  </TouchableOpacity>

                  {/* Year Picker */}
                  <TouchableOpacity 
                    style={styles.dobPicker} 
                    onPress={() => setShowYearPicker(true)}
                  >
                    <Text style={[styles.dobPickerText, !dobYear && styles.dobPlaceholder]}>
                      {dobYear || 'Year'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                {getFormattedDob() ? (
                  <Text style={styles.dobDisplay}>
                    <Ionicons name="calendar" size={12} color="#22C55E" /> {getFormattedDob()}
                  </Text>
                ) : null}
              </View>

              {/* Day Picker Modal */}
              <Modal visible={showDayPicker} transparent animationType="fade">
                <TouchableOpacity 
                  style={styles.modalOverlay} 
                  activeOpacity={1} 
                  onPress={() => setShowDayPicker(false)}
                >
                  <View style={styles.pickerModal}>
                    <Text style={styles.pickerTitle}>Select Day</Text>
                    <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                      {DAYS.map(day => (
                        <TouchableOpacity
                          key={day}
                          style={[styles.pickerOption, dobDay === day && styles.pickerOptionActive]}
                          onPress={() => { setDobDay(day); setShowDayPicker(false); }}
                        >
                          <Text style={[styles.pickerOptionText, dobDay === day && styles.pickerOptionTextActive]}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </TouchableOpacity>
              </Modal>

              {/* Month Picker Modal */}
              <Modal visible={showMonthPicker} transparent animationType="fade">
                <TouchableOpacity 
                  style={styles.modalOverlay} 
                  activeOpacity={1} 
                  onPress={() => setShowMonthPicker(false)}
                >
                  <View style={styles.pickerModal}>
                    <Text style={styles.pickerTitle}>Select Month</Text>
                    <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                      {MONTHS.map(month => (
                        <TouchableOpacity
                          key={month.value}
                          style={[styles.pickerOption, dobMonth === month.value && styles.pickerOptionActive]}
                          onPress={() => { setDobMonth(month.value); setShowMonthPicker(false); }}
                        >
                          <Text style={[styles.pickerOptionText, dobMonth === month.value && styles.pickerOptionTextActive]}>
                            {month.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </TouchableOpacity>
              </Modal>

              {/* Year Picker Modal */}
              <Modal visible={showYearPicker} transparent animationType="fade">
                <TouchableOpacity 
                  style={styles.modalOverlay} 
                  activeOpacity={1} 
                  onPress={() => setShowYearPicker(false)}
                >
                  <View style={styles.pickerModal}>
                    <Text style={styles.pickerTitle}>Select Year</Text>
                    <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                      {YEARS.map(year => (
                        <TouchableOpacity
                          key={year}
                          style={[styles.pickerOption, dobYear === year && styles.pickerOptionActive]}
                          onPress={() => { setDobYear(year); setShowYearPicker(false); }}
                        >
                          <Text style={[styles.pickerOptionText, dobYear === year && styles.pickerOptionTextActive]}>
                            {year}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </TouchableOpacity>
              </Modal>

              {/* Active Switch */}
              <View style={styles.switchCard}>
                <View style={styles.switchInfo}>
                  <View style={[styles.switchIconContainer, { backgroundColor: isActive ? '#DCFCE7' : '#FEE2E2' }]}>
                    <Ionicons name={isActive ? 'checkmark-circle' : 'close-circle'} size={24} color={isActive ? '#22C55E' : '#EF4444'} />
                  </View>
                  <View>
                    <Text style={styles.switchLabel}>Account Status</Text>
                    <Text style={styles.switchHint}>{isActive ? 'Partner can accept orders' : 'Partner is deactivated'}</Text>
                  </View>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: '#FEE2E2', true: '#BBF7D0' }}
                  thumbColor={isActive ? '#22C55E' : '#EF4444'}
                />
              </View>

              {!isEditing && (
                <View style={styles.infoCard}>
                  <Ionicons name="information-circle" size={22} color="#3B82F6" />
                  <Text style={styles.infoText}>
                    A temporary password will be sent to the partner's email address.
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name={isEditing ? 'checkmark-circle' : 'person-add'} size={22} color="#fff" />
              <Text style={styles.submitButtonText}>{isEditing ? 'Update Partner' : 'Add Partner'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={ZOMATO_RED} />
            <Text style={styles.loadingText}>
              {isEditing ? 'Updating partner...' : 'Adding partner...'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  
  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  content: { flex: 1, padding: 16 },
  
  // Photo
  photoSection: { alignItems: 'center', marginBottom: 28 },
  photoContainer: { position: 'relative' },
  photo: { 
    width: 130, height: 130, borderRadius: 65, borderWidth: 4, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  photoPlaceholder: {
    width: 130, height: 130, borderRadius: 65, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E8E8E8', borderStyle: 'dashed',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  photoPlaceholderIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF2F2',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  photoPlaceholderText: { color: '#696969', fontSize: 13, fontWeight: '600' },
  cameraButton: {
    position: 'absolute', bottom: 4, right: 4,
    width: 38, height: 38, borderRadius: 19, backgroundColor: ZOMATO_RED,
    justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  photoLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Form
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: '#1C1C1C' },
  required: { color: ZOMATO_RED },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, height: 56,
    borderWidth: 1.5, borderColor: '#E8E8E8',
  },
  inputDisabled: { backgroundColor: '#F5F5F5' },
  input: { flex: 1, fontSize: 15, color: '#1C1C1C', fontWeight: '500' },
  inputHint: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },

  // Date of Birth Picker
  dobContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  dobPicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 56,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
  },
  dobPickerMonth: {
    flex: 1.5,
  },
  dobPickerText: {
    fontSize: 15,
    color: '#1C1C1C',
    fontWeight: '500',
  },
  dobPlaceholder: {
    color: '#9CA3AF',
  },
  dobDisplay: {
    fontSize: 13,
    color: '#22C55E',
    marginTop: 8,
    fontWeight: '500',
  },
  
  // Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxHeight: '60%',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1C',
    textAlign: 'center',
    marginBottom: 16,
  },
  pickerScroll: {
    maxHeight: 300,
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  pickerOptionActive: {
    backgroundColor: '#FEF2F2',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#1C1C1C',
    textAlign: 'center',
  },
  pickerOptionTextActive: {
    color: ZOMATO_RED,
    fontWeight: '600',
  },

  // Switch
  switchCard: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', padding: 18, borderRadius: 16, borderWidth: 1.5, borderColor: '#E8E8E8',
  },
  switchInfo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  switchIconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  switchLabel: { fontSize: 15, fontWeight: '700', color: '#1C1C1C' },
  switchHint: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  
  // Info Card
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#EFF6FF', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#DBEAFE',
  },
  infoText: { flex: 1, fontSize: 13, color: '#1E40AF', lineHeight: 20 },
  
  // Footer
  footer: { 
    padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: '#fff', borderTopWidth: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 10,
  },
  submitButton: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: ZOMATO_RED, height: 56, borderRadius: 16,
    shadowColor: ZOMATO_RED, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  
  // Loading Overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1C',
  },
});
