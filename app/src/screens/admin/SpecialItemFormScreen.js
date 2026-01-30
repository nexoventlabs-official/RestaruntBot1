import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Image, Alert, ActivityIndicator, Platform, StatusBar, Animated, KeyboardAvoidingView, Modal, FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../config/api';

const ZOMATO_RED = '#E23744';
const ZOMATO_DARK_RED = '#CB1A27';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const FOOD_TYPES = [
  { value: 'veg', label: 'Veg', color: '#22C55E' },
  { value: 'nonveg', label: 'Non-Veg', color: '#EF4444' },
  { value: 'egg', label: 'Egg', color: '#F59E0B' },
];

const UNITS = ['piece', 'plate', 'bowl', 'cup', 'slice', 'full', 'half', 'small', 'kg', 'gram', 'liter', 'ml', 'inch'];

export default function SpecialItemFormScreen({ route, navigation }) {
  const existingItem = route.params?.item;
  const preselectedDay = route.params?.day !== undefined ? route.params.day : (existingItem?.day || new Date().getDay());
  const isEditing = !!existingItem;
  
  const [name, setName] = useState(existingItem?.name || '');
  const [description, setDescription] = useState(existingItem?.description || '');
  const [price, setPrice] = useState(existingItem?.price?.toString() || '');
  const [originalPrice, setOriginalPrice] = useState(existingItem?.originalPrice?.toString() || '');
  const [unit, setUnit] = useState(existingItem?.unit || 'piece');
  const [quantity, setQuantity] = useState(existingItem?.quantity?.toString() || '1');
  const [selectedDays, setSelectedDays] = useState(
    existingItem?.days && existingItem.days.length > 0 
      ? existingItem.days 
      : (existingItem?.day !== undefined ? [existingItem.day] : [preselectedDay])
  );
  const [foodType, setFoodType] = useState(existingItem?.foodType || 'veg');
  const [image, setImage] = useState(existingItem?.image || null);
  const [newImage, setNewImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(existingItem?.image || '');
  const [loading, setLoading] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [tagsAiLoading, setTagsAiLoading] = useState(false);
  const [tags, setTags] = useState(existingItem?.tags?.join(', ') || '');
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const pickImage = async () => {
    try {
      setPickingImage(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      if (!result.canceled) {
        setNewImage(result.assets[0]);
        setImagePreview(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      setPickingImage(false);
    }
  };

  const removeImage = () => {
    setImage(null);
    setNewImage(null);
    setImagePreview('');
  };

  const generateDescription = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Enter item name first');
      return;
    }
    setAiLoading(true);
    try {
      const response = await api.post('/ai/generate-description', { 
        name, 
        category: ['Special Items'] // Special items category
      });
      setDescription(response.data.description);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate description');
    } finally {
      setAiLoading(false);
    }
  };



  const generateTags = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Enter item name first');
      return;
    }
    setTagsAiLoading(true);
    try {
      const response = await api.post('/ai/generate-tags', { 
        name, 
        category: ['Special Items'],
        foodType 
      });
      setTags(response.data.tags);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate tags');
    } finally {
      setTagsAiLoading(false);
    }
  };

  const toggleDay = (dayIndex) => {
    setSelectedDays(prev => {
      if (prev.includes(dayIndex)) {
        // Don't allow removing the last day
        if (prev.length === 1) {
          Alert.alert('Required', 'At least one day must be selected');
          return prev;
        }
        // Remove day
        return prev.filter(d => d !== dayIndex);
      } else {
        // Add day
        return [...prev, dayIndex].sort();
      }
    });
  };

  const handleSubmit = async () => {
    if (!name.trim() || !price.trim() || selectedDays.length === 0) {
      Alert.alert('Error', 'Please fill in name, price, and select at least one day');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('price', price);
      if (originalPrice) formData.append('originalPrice', originalPrice);
      formData.append('unit', unit);
      formData.append('quantity', quantity);
      formData.append('days', JSON.stringify(selectedDays));
      formData.append('foodType', foodType);
      formData.append('tags', tags);

      if (newImage) {
        const filename = newImage.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('image', { uri: newImage.uri, name: filename, type });
      } else if (!imagePreview && existingItem?.image) {
        formData.append('removeImage', 'true');
      }

      if (existingItem) {
        await api.put(`/special-items/${existingItem._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 90000,
        });
        Alert.alert('Success', 'Special item updated');
      } else {
        await api.post('/special-items', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 90000,
        });
        Alert.alert('Success', 'Special item added');
      }
      
      navigation.goBack();
    } catch (error) {
      console.error('Error saving special item:', error);
      let errorMessage = 'Failed to save item';
      
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
          <Text style={styles.headerTitle}>{isEditing ? 'Edit Special' : 'New Special'}</Text>
          <View style={{ width: 44 }} />
        </LinearGradient>
      </Animated.View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Image Section */}
            <View style={styles.imageSection}>
              <TouchableOpacity 
                style={styles.imageContainer} 
                onPress={pickImage} 
                activeOpacity={0.8}
                disabled={pickingImage}
              >
                {imagePreview ? (
                  <Image source={{ uri: imagePreview }} style={styles.image} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    {pickingImage ? (
                      <>
                        <ActivityIndicator size="large" color={ZOMATO_RED} />
                        <Text style={styles.imagePlaceholderText}>Opening gallery...</Text>
                      </>
                    ) : (
                      <>
                        <View style={styles.imagePlaceholderIcon}>
                          <Ionicons name="camera-outline" size={32} color={ZOMATO_RED} />
                        </View>
                        <Text style={styles.imagePlaceholderText}>Add Photo</Text>
                        <Text style={styles.imagePlaceholderHint}>Tap to upload</Text>
                      </>
                    )}
                  </View>
                )}
                {pickingImage && imagePreview && (
                  <View style={styles.imageLoadingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
              {imagePreview && !pickingImage && (
                <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
                  <Ionicons name="close-circle" size={32} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.form}>
              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Item Name <Text style={styles.required}>*</Text></Text>
                <TextInput 
                  style={styles.input} 
                  value={name} 
                  onChangeText={setName} 
                  placeholder="e.g., Special Biryani" 
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Description with AI */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Description</Text>
                  <TouchableOpacity style={styles.aiButton} onPress={generateDescription} disabled={aiLoading}>
                    {aiLoading ? (
                      <ActivityIndicator size="small" color="#8B5CF6" />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={14} color="#8B5CF6" />
                        <Text style={styles.aiButtonText}>AI Generate</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe your special item..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Price */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Price <Text style={styles.required}>*</Text></Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={price}
                    onChangeText={setPrice}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Original Price */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Original Price</Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={originalPrice}
                    onChangeText={setOriginalPrice}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Quantity & Unit */}
              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Quantity</Text>
                  <TextInput
                    style={styles.input}
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder="1"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Unit</Text>
                  <TouchableOpacity style={styles.pickerButton} onPress={() => setShowUnitPicker(true)}>
                    <Text style={styles.pickerValue}>{unit}</Text>
                    <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Day Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Days <Text style={styles.required}>*</Text></Text>
                <Text style={styles.inputHint}>Select one or more days for this special item</Text>
                <View style={styles.dayContainer}>
                  {DAY_NAMES.map((day, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dayChip, 
                        selectedDays.includes(index) && styles.dayChipActive
                      ]}
                      onPress={() => toggleDay(index)}
                    >
                      <Text style={[
                        styles.dayChipText, 
                        selectedDays.includes(index) && styles.dayChipTextActive
                      ]}>
                        {DAY_SHORT[index]}
                      </Text>
                      {selectedDays.includes(index) && (
                        <View style={styles.dayChipCheckmark}>
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                {selectedDays.length > 0 && (
                  <View style={styles.selectedDaysInfo}>
                    <Text style={styles.selectedDaysText}>
                      Selected: {selectedDays.map(d => DAY_SHORT[d]).join(', ')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Food Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Food Type</Text>
                <View style={styles.foodTypeContainer}>
                  {FOOD_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[styles.foodTypeButton, foodType === type.value && { backgroundColor: type.color, borderColor: type.color }]}
                      onPress={() => setFoodType(type.value)}
                    >
                      <View style={[styles.foodTypeIcon, { borderColor: foodType === type.value ? '#fff' : type.color }]}>
                        <View style={[styles.foodTypeDot, { backgroundColor: foodType === type.value ? '#fff' : type.color }]} />
                      </View>
                      <Text style={[styles.foodTypeText, foodType === type.value && { color: '#fff' }]}>{type.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Tags with AI */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Tags</Text>
                  <TouchableOpacity 
                    style={styles.aiTagsButton} 
                    onPress={generateTags}
                    disabled={tagsAiLoading}
                  >
                    {tagsAiLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={14} color="#fff" />
                        <Text style={styles.aiTagsButtonText}>AI Generate</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  value={tags}
                  onChangeText={setTags}
                  placeholder="e.g., spicy, bestseller, new"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.inputHint}>Separate tags with commas</Text>
              </View>
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
              <Ionicons name={isEditing ? 'checkmark-circle' : 'add-circle'} size={22} color="#fff" />
              <Text style={styles.submitButtonText}>
                {isEditing ? 'Update Item' : 'Add Item'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Unit Picker Modal */}
      <Modal visible={showUnitPicker} animationType="slide" transparent={true} onRequestClose={() => setShowUnitPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Unit</Text>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowUnitPicker(false)}>
                <Ionicons name="close" size={24} color="#696969" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={UNITS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.unitOption, unit === item && styles.unitOptionSelected]}
                  onPress={() => { setUnit(item); setShowUnitPicker(false); }}
                >
                  <Text style={[styles.unitOptionText, unit === item && styles.unitOptionTextSelected]}>{item}</Text>
                  {unit === item && <Ionicons name="checkmark-circle" size={22} color={ZOMATO_RED} />}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.modalList}
            />
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={ZOMATO_RED} />
            <Text style={styles.loadingText}>
              {isEditing ? 'Updating item...' : 'Adding item...'}
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
  
  // Image
  imageSection: { alignItems: 'center', marginBottom: 24, position: 'relative' },
  imageContainer: { alignItems: 'center' },
  image: { 
    width: 150, height: 150, borderRadius: 20, borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  imagePlaceholder: {
    width: 150, height: 150, borderRadius: 20, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E8E8E8', borderStyle: 'dashed',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  imagePlaceholderIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#FEF2F2',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  imagePlaceholderText: { color: '#1C1C1C', fontSize: 14, fontWeight: '600' },
  imagePlaceholderHint: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  removeImageButton: { position: 'absolute', top: -8, right: '25%' },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Form
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: '#1C1C1C' },
  required: { color: ZOMATO_RED },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: {
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 18, height: 54,
    borderWidth: 1.5, borderColor: '#E8E8E8', fontSize: 15, color: '#1C1C1C', fontWeight: '500',
  },
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: 16 },
  inputHint: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },

  // AI Button
  aiButton: { 
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F3E8FF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  aiButtonText: { fontSize: 12, color: '#8B5CF6', fontWeight: '700' },
  aiTagsButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#8B5CF6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  aiTagsButtonText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  
  // Price
  priceInputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E8E8E8', paddingHorizontal: 18, height: 54,
  },
  currencySymbol: { fontSize: 20, fontWeight: '700', color: ZOMATO_RED, marginRight: 8 },
  priceInput: { flex: 1, fontSize: 18, color: '#1C1C1C', fontWeight: '600' },
  
  // Row inputs
  rowInputs: { flexDirection: 'row', gap: 14 },
  
  // Picker
  pickerButton: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 18, height: 54,
    borderWidth: 1.5, borderColor: '#E8E8E8',
  },
  pickerValue: { fontSize: 15, color: '#1C1C1C', fontWeight: '500', textTransform: 'capitalize' },
  
  // Day Selection
  dayContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: {
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: '#fff',
    borderWidth: 2, borderColor: '#E8E8E8', minWidth: 60, alignItems: 'center',
    position: 'relative',
  },
  dayChipActive: {
    backgroundColor: ZOMATO_RED, borderColor: ZOMATO_RED,
  },
  dayChipText: { fontSize: 14, fontWeight: '700', color: '#696969' },
  dayChipTextActive: { color: '#fff' },
  dayChipCheckmark: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  selectedDaysInfo: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  selectedDaysText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500',
    textAlign: 'center',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scheduleDay: {
    width: 80,
    marginRight: 16,
  },
  scheduleDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  scheduleTimeInputs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeInputGroup: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  timeInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 16,
  },
  
  // Food type
  foodTypeContainer: { flexDirection: 'row', gap: 12 },
  foodTypeButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 14, backgroundColor: '#fff',
    borderWidth: 2, borderColor: '#E8E8E8',
  },
  foodTypeIcon: { width: 18, height: 18, borderRadius: 5, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  foodTypeDot: { width: 10, height: 10, borderRadius: 5 },
  foodTypeText: { fontSize: 14, fontWeight: '700', color: '#696969' },
  
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
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E8E8E8',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalList: {
    paddingHorizontal: 20,
  },
  unitOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  unitOptionSelected: {
    backgroundColor: '#FEF2F2',
  },
  unitOptionText: {
    fontSize: 16,
    color: '#1C1C1C',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  unitOptionTextSelected: {
    color: ZOMATO_RED,
    fontWeight: '700',
  },
});
