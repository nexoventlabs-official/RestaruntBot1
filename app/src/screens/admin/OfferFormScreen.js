import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Image, Alert, ActivityIndicator, Animated, Platform,
  KeyboardAvoidingView, StatusBar, Modal, FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../config/api';

// Zomato Theme Colors
const ZOMATO_RED = '#E23744';
const ZOMATO_DARK_RED = '#CB1A27';

export default function OfferFormScreen({ route, navigation }) {
  const existingOffer = route.params?.offer;
  const isEditing = !!existingOffer;

  const [offerType, setOfferType] = useState(existingOffer?.offerType || '');
  const [percentage, setPercentage] = useState(
    existingOffer?.percentage != null ? existingOffer.percentage.toString() : ''
  );
  
  // Single universal image for all devices
  const [image, setImage] = useState(existingOffer?.imageMobile || existingOffer?.imageTablet || existingOffer?.imageDesktop || null);
  const [newImage, setNewImage] = useState(null);
  
  // Categories and Items
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(existingOffer?.appliedCategories || []);
  const [selectedItems, setSelectedItems] = useState(
    Array.isArray(existingOffer?.appliedItems) 
      ? existingOffer.appliedItems.map(item => typeof item === 'string' ? item : item._id)
      : []
  );
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
    fetchCategoriesAndItems();
  }, []);

  useEffect(() => {
    console.log('Categories state updated:', categories.length, 'categories');
    console.log('Menu items state updated:', menuItems.length, 'items');
  }, [categories, menuItems]);

  const fetchCategoriesAndItems = async () => {
    try {
      setLoadingData(true);
      const [catResponse, itemsResponse] = await Promise.all([
        api.get('/categories'),
        api.get('/menu')
      ]);
      console.log('Categories fetched:', catResponse.data);
      console.log('Menu items fetched:', itemsResponse.data);
      setCategories(catResponse.data || []);
      setMenuItems(itemsResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load categories and items');
    } finally {
      setLoadingData(false);
    }
  };

  const toggleCategory = (categoryName) => {
    if (selectedCategories.includes(categoryName)) {
      setSelectedCategories(selectedCategories.filter(c => c !== categoryName));
    } else {
      setSelectedCategories([...selectedCategories, categoryName]);
    }
  };

  const toggleItem = (itemId) => {
    const item = menuItems.find(i => i._id === itemId);
    if (!item) return;
    
    let newSelectedItems;
    if (selectedItems.includes(itemId)) {
      newSelectedItems = selectedItems.filter(id => id !== itemId);
    } else {
      newSelectedItems = [...selectedItems, itemId];
    }
    setSelectedItems(newSelectedItems);
    
    // Check if all items in this item's categories are now selected/deselected
    const itemCategories = Array.isArray(item.category) ? item.category : [item.category];
    const newSelectedCategories = [...selectedCategories];
    
    itemCategories.forEach(categoryName => {
      const categoryItems = menuItems.filter(i => 
        Array.isArray(i.category) ? i.category.includes(categoryName) : i.category === categoryName
      );
      const categoryItemIds = categoryItems.map(i => i._id);
      const allCategoryItemsSelected = categoryItemIds.every(id => newSelectedItems.includes(id));
      
      if (allCategoryItemsSelected && !newSelectedCategories.includes(categoryName)) {
        // All items selected, add category
        newSelectedCategories.push(categoryName);
      } else if (!allCategoryItemsSelected && newSelectedCategories.includes(categoryName)) {
        // Not all items selected, remove category
        const index = newSelectedCategories.indexOf(categoryName);
        if (index > -1) {
          newSelectedCategories.splice(index, 1);
        }
      }
    });
    
    setSelectedCategories(newSelectedCategories);
  };

  const selectAllItemsInCategory = (categoryName) => {
    const categoryItems = menuItems.filter(item => 
      Array.isArray(item.category) ? item.category.includes(categoryName) : item.category === categoryName
    );
    const categoryItemIds = categoryItems.map(item => item._id);
    
    // Check if all items in this category are already selected
    const allSelected = categoryItemIds.every(id => selectedItems.includes(id));
    
    if (allSelected) {
      // Deselect all items in this category and remove category
      setSelectedItems(selectedItems.filter(id => !categoryItemIds.includes(id)));
      setSelectedCategories(selectedCategories.filter(c => c !== categoryName));
    } else {
      // Select all items in this category and add category
      const newSelectedItems = [...new Set([...selectedItems, ...categoryItemIds])];
      setSelectedItems(newSelectedItems);
      if (!selectedCategories.includes(categoryName)) {
        setSelectedCategories([...selectedCategories, categoryName]);
      }
    }
  };

  const getItemsByCategory = (categoryName) => {
    return menuItems.filter(item => 
      Array.isArray(item.category) ? item.category.includes(categoryName) : item.category === categoryName
    );
  };

  // Filter categories and items based on search query
  const getFilteredCategoriesAndItems = () => {
    if (!searchQuery.trim()) {
      return categories;
    }

    const query = searchQuery.toLowerCase();
    
    return categories.filter(category => {
      // Check if category name matches
      const categoryMatches = category.name.toLowerCase().includes(query);
      
      // Check if any item in this category matches
      const categoryItems = getItemsByCategory(category.name);
      const hasMatchingItems = categoryItems.some(item => 
        item.name.toLowerCase().includes(query)
      );
      
      return categoryMatches || hasMatchingItems;
    });
  };

  const getFilteredItemsByCategory = (categoryName) => {
    const items = getItemsByCategory(categoryName);
    
    if (!searchQuery.trim()) {
      return items;
    }

    const query = searchQuery.toLowerCase();
    return items.filter(item => item.name.toLowerCase().includes(query));
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
        return;
      }
      
      setPickingImage(true);
      
      // Universal aspect ratio 19:6 for all devices
      const aspectRatio = [19, 6];

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        allowsMultipleSelection: false,
        aspect: aspectRatio,
        quality: 0.6, // Reduced from 0.9 for faster uploads
        exif: false,
      });
      
      if (!result.canceled) {
        const imageData = result.assets[0];
        setNewImage(imageData);
        setImage(imageData.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setPickingImage(false);
    }
  };

  const handleSubmit = async () => {
    // Image is required
    if (!image && !newImage) {
      Alert.alert('Error', 'Please add a banner image');
      return;
    }

    if (!offerType || !offerType.trim()) {
      Alert.alert('Error', 'Please enter an offer type');
      return;
    }

    // If percentage is provided, validate it
    if (percentage && (isNaN(percentage) || parseFloat(percentage) <= 0 || parseFloat(percentage) > 100)) {
      Alert.alert('Error', 'Please enter a valid percentage between 1 and 100');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('isActive', 'true');
      formData.append('offerType', offerType.trim());
      
      console.log('Submitting offer with:');
      console.log('- Offer Type:', offerType.trim());
      console.log('- Percentage:', percentage);
      console.log('- Selected Items:', selectedItems.length, selectedItems);
      console.log('- Selected Categories:', selectedCategories.length, selectedCategories);
      
      if (percentage && percentage.trim()) {
        formData.append('percentage', percentage);
      }
      
      if (selectedItems.length > 0) {
        formData.append('appliedItems', JSON.stringify(selectedItems));
      }
      
      if (selectedCategories.length > 0) {
        formData.append('appliedCategories', JSON.stringify(selectedCategories));
      }

      // Add the universal image for all three device types
      if (newImage) {
        const filename = newImage.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        // Send same image for all device types
        formData.append('imageMobile', { uri: newImage.uri, name: filename, type });
        formData.append('imageTablet', { uri: newImage.uri, name: filename, type });
        formData.append('imageDesktop', { uri: newImage.uri, name: filename, type });
      }

      if (isEditing) {
        await api.put(`/offers/${existingOffer._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 90000 // 90 seconds for image uploads
        });
        Alert.alert('Success', 'Offer updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await api.post('/offers', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 90000 // 90 seconds for image uploads
        });
        Alert.alert('Success', 'Offer created successfully', [
          { text: 'OK' }
        ]);
        // Don't navigate back - keep the form with data
      }
    } catch (error) {
      console.error('Error saving offer:', error);
      let errorMessage = 'Failed to save offer';
      
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

  const renderImageUpload = () => {

    return (
      <View style={styles.imageSection}>
        <View style={styles.imageSectionHeader}>
          <Ionicons 
            name="images" 
            size={20} 
            color={ZOMATO_RED} 
          />
          <Text style={styles.imageSectionTitle}>Offer Banner</Text>
        </View>
        <Text style={styles.imageSectionHint}>Universal image for all devices (Mobile, Tablet, Desktop, iPad)</Text>
        <Text style={styles.imageSectionRecommended}>Recommended: 19:6 Aspect Ratio</Text>
        
        {/* Image Preview */}
        {image && (
          <View style={styles.imagePreviewContainer}>
            <Image 
              source={{ uri: image }} 
              style={styles.imagePreview} 
              resizeMode="cover" 
            />
          </View>
        )}
        
        {/* Upload Button */}
        <TouchableOpacity 
          style={[styles.uploadButton, image && styles.uploadButtonWithImage]} 
          onPress={pickImage} 
          activeOpacity={0.8}
          disabled={pickingImage}
        >
          {pickingImage ? (
            <>
              <ActivityIndicator size="small" color={image ? "#fff" : ZOMATO_RED} />
              <Text style={image ? styles.uploadButtonTextWhite : styles.uploadButtonText}>
                Opening gallery...
              </Text>
            </>
          ) : image ? (
            <>
              <Ionicons name="camera" size={22} color="#fff" />
              <Text style={styles.uploadButtonTextWhite}>Change Image</Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={24} color={ZOMATO_RED} />
              <Text style={styles.uploadButtonText}>Upload Banner Image</Text>
              <Text style={styles.uploadButtonHint}>19:6 aspect ratio</Text>
            </>
          )}
        </TouchableOpacity>
        
        {image && !pickingImage && (
          <View style={styles.previewInfo}>
            <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
            <Text style={styles.previewInfoTextSuccess}>
              Image uploaded • Will display on all devices
            </Text>
          </View>
        )}
      </View>
    );
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
          <Text style={styles.headerTitle}>{isEditing ? 'Edit Offer' : 'New Offer'}</Text>
          <View style={{ width: 44 }} />
        </LinearGradient>
      </Animated.View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            {/* Single Universal Image Upload */}
            {renderImageUpload()}

            <View style={styles.form}>
              {/* Offer Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Offer Type <Text style={styles.required}>*</Text></Text>
                <Text style={styles.hint}>e.g., "1+1 Offer", "Buy 2 Get 1", "50% Off"</Text>
                <TextInput
                  style={styles.input}
                  value={offerType}
                  onChangeText={setOfferType}
                  placeholder="Enter offer type"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Percentage (Optional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Discount Percentage (Optional)</Text>
                <Text style={styles.hint}>Leave empty if not applicable</Text>
                <View style={styles.percentageInputContainer}>
                  <TextInput
                    style={styles.percentageInput}
                    value={percentage}
                    onChangeText={setPercentage}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                  <Text style={styles.percentageSymbol}>%</Text>
                </View>
              </View>

              {/* Apply to Items Section - Always show */}
              <View style={styles.applySection}>
                <View style={styles.applySectionHeader}>
                  <Ionicons name="pricetag" size={20} color={ZOMATO_RED} />
                  <Text style={styles.applySectionTitle}>Apply Offer To</Text>
                </View>
                <Text style={styles.applySectionHint}>
                  {percentage && percentage.trim() 
                    ? `Select categories and items to apply ${percentage}% discount`
                    : 'Select categories and items for this offer'}
                </Text>
                
                <TouchableOpacity 
                  style={styles.selectItemsButton}
                  onPress={() => setShowCategoryModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="list" size={20} color={ZOMATO_RED} />
                  <Text style={styles.selectItemsButtonText}>
                    {selectedItems.length > 0 || selectedCategories.length > 0
                      ? `${selectedCategories.length} category(ies), ${selectedItems.length} item(s) selected` 
                      : 'Select Categories & Items'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                {(selectedItems.length > 0 || selectedCategories.length > 0) && (
                  <View style={styles.selectedItemsInfo}>
                    <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                    <Text style={styles.selectedItemsInfoText}>
                      {percentage && percentage.trim()
                        ? `${percentage}% discount will be applied to ${selectedCategories.length} category(ies) and ${selectedItems.length} item(s)`
                        : `Offer will apply to ${selectedCategories.length} category(ies) and ${selectedItems.length} item(s)`}
                    </Text>
                  </View>
                )}
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
              <Text style={styles.submitButtonText}>{isEditing ? 'Update Offer' : 'Create Offer'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Category & Items Selection Modal */}
      <Modal visible={showCategoryModal} animationType="slide" transparent={true} onRequestClose={() => setShowCategoryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Select Categories & Items</Text>
                <Text style={styles.modalSubtitle}>
                  {categories.length} total categories • {menuItems.length} total items
                </Text>
                <Text style={styles.modalSubtitle}>
                  {selectedCategories.length} categories, {selectedItems.length} items selected
                </Text>
              </View>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#696969" />
              </TouchableOpacity>
            </View>
            
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search categories or items..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
            
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              {loadingData ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator size="large" color={ZOMATO_RED} />
                  <Text style={styles.emptyStateText}>Loading...</Text>
                </View>
              ) : categories.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="folder-open-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyStateText}>No categories found</Text>
                  <Text style={styles.emptyStateHint}>Add categories from Menu screen first</Text>
                </View>
              ) : menuItems.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="fast-food-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyStateText}>No menu items found</Text>
                  <Text style={styles.emptyStateHint}>Add menu items from Menu screen first</Text>
                </View>
              ) : (() => {
                const filteredCategories = getFilteredCategoriesAndItems();
                
                if (filteredCategories.length === 0) {
                  return (
                    <View style={styles.emptyState}>
                      <Ionicons name="search-outline" size={48} color="#9CA3AF" />
                      <Text style={styles.emptyStateText}>No results found</Text>
                      <Text style={styles.emptyStateHint}>Try a different search term</Text>
                    </View>
                  );
                }
                
                return (
                  <>
                    {filteredCategories.map((category) => {
                      const categoryItems = getItemsByCategory(category.name);
                      const filteredItems = getFilteredItemsByCategory(category.name);
                      const allItemsSelected = categoryItems.length > 0 && categoryItems.every(item => selectedItems.includes(item._id));
                      
                      return (
                        <View key={category._id} style={styles.categorySection}>
                          <TouchableOpacity 
                            style={styles.categoryHeader}
                            onPress={() => setExpandedCategory(expandedCategory === category.name ? null : category.name)}
                          >
                            <View style={styles.categoryHeaderLeft}>
                              <TouchableOpacity 
                                style={[styles.checkbox, allItemsSelected && styles.checkboxChecked]}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  selectAllItemsInCategory(category.name);
                                }}
                                disabled={categoryItems.length === 0}
                              >
                                {allItemsSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                              </TouchableOpacity>
                              <Text style={styles.categoryName}>{category.name}</Text>
                              <View style={styles.categoryBadge}>
                                <Text style={styles.categoryBadgeText}>{categoryItems.length}</Text>
                              </View>
                            </View>
                            <Ionicons 
                              name={expandedCategory === category.name ? "chevron-up" : "chevron-down"} 
                              size={20} 
                              color="#9CA3AF" 
                            />
                          </TouchableOpacity>
                          
                          {expandedCategory === category.name && (
                            <View style={styles.itemsList}>
                              {filteredItems.length === 0 ? (
                                <View style={styles.emptyCategory}>
                                  <Text style={styles.emptyCategoryText}>
                                    {searchQuery ? 'No matching items in this category' : 'No items in this category'}
                                  </Text>
                                </View>
                              ) : (
                                filteredItems.map((item) => {
                                  const discountPercent = percentage && percentage.trim() ? parseFloat(percentage) : 0;
                                  const offerPrice = discountPercent > 0 ? Math.round(item.price * (1 - discountPercent / 100)) : item.price;
                                  const discount = item.price - offerPrice;
                                  
                                  return (
                                    <TouchableOpacity 
                                      key={item._id}
                                      style={styles.itemRow}
                                      onPress={() => toggleItem(item._id)}
                                    >
                                      <View style={[styles.checkbox, selectedItems.includes(item._id) && styles.checkboxChecked]}>
                                        {selectedItems.includes(item._id) && <Ionicons name="checkmark" size={16} color="#fff" />}
                                      </View>
                                      {item.image && (
                                        <Image source={{ uri: item.image }} style={styles.itemImage} />
                                      )}
                                      <View style={styles.itemInfo}>
                                        <Text style={styles.itemName}>{item.name}</Text>
                                        <View style={styles.priceContainer}>
                                          {discountPercent > 0 ? (
                                            <>
                                              <View style={styles.priceRow}>
                                                <Text style={styles.originalPrice}>₹{item.price}</Text>
                                                <Ionicons name="arrow-forward" size={12} color="#9CA3AF" style={{ marginHorizontal: 4 }} />
                                                <Text style={styles.offerPrice}>₹{offerPrice}</Text>
                                              </View>
                                              <View style={styles.discountBadge}>
                                                <Text style={styles.discountText}>Save ₹{discount}</Text>
                                              </View>
                                            </>
                                          ) : (
                                            <Text style={styles.itemPrice}>₹{item.price}</Text>
                                          )}
                                        </View>
                                      </View>
                                    </TouchableOpacity>
                                  );
                                })
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </>
                );
              })()}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalDoneButton} 
                onPress={() => setShowCategoryModal(false)}
              >
                <Text style={styles.modalDoneButtonText}>
                  Done ({selectedCategories.length} categories, {selectedItems.length} items)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={ZOMATO_RED} />
            <Text style={styles.loadingText}>
              {isEditing ? 'Updating offer...' : 'Creating offer...'}
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
  
  // Image Section
  imageSection: { marginBottom: 24 },
  imageSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  imageSectionTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1C' },
  imageSectionHint: { fontSize: 13, color: '#9CA3AF', marginBottom: 2 },
  imageSectionRecommended: { fontSize: 12, color: ZOMATO_RED, marginBottom: 16, fontWeight: '600' },
  
  // Image Preview
  imagePreviewContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    height: 200, // Fixed height for better visibility
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  
  // Device Preview Frames
  devicePreviewContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  devicePreviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  
  // Upload Button
  uploadButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF5F5',
    borderWidth: 2,
    borderColor: ZOMATO_RED,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  uploadButtonWithImage: {
    flexDirection: 'row',
    backgroundColor: ZOMATO_RED,
    borderStyle: 'solid',
    paddingVertical: 14,
    gap: 10,
  },
  uploadButtonText: {
    color: ZOMATO_RED,
    fontSize: 16,
    fontWeight: '700',
  },
  uploadButtonTextWhite: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  uploadButtonHint: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
    marginTop: -4,
  },
  
  // Preview Info
  previewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
  },
  previewInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  previewInfoTextSuccess: {
    flex: 1,
    fontSize: 12,
    color: '#059669',
    lineHeight: 16,
    fontWeight: '500',
  },
  
  // Form
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: '#1C1C1C' },
  required: { color: ZOMATO_RED },
  hint: { fontSize: 12, color: '#9CA3AF', marginTop: -4, marginBottom: 4 },
  input: {
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 18, height: 54,
    borderWidth: 1.5, borderColor: '#E8E8E8', fontSize: 15, color: '#1C1C1C', fontWeight: '500',
  },
  
  // Percentage Input
  percentageInputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E8E8E8', paddingHorizontal: 18, height: 54,
  },
  percentageInput: { flex: 1, fontSize: 18, color: '#1C1C1C', fontWeight: '600' },
  percentageSymbol: { fontSize: 20, fontWeight: '700', color: ZOMATO_RED, marginLeft: 8 },
  
  // Apply Section
  applySection: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    gap: 12,
  },
  applySectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  applySectionTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1C' },
  applySectionHint: { fontSize: 13, color: '#991B1B', lineHeight: 18 },
  
  selectItemsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
  },
  selectItemsButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1C',
    marginLeft: 12,
  },
  
  selectedItemsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 12,
  },
  selectedItemsInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
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
    height: '80%',
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    display: 'flex',
    flexDirection: 'column',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
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
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 2,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1C1C1C',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  emptyStateHint: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  
  // Category Section
  categorySection: {
    marginVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1C',
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: ZOMATO_RED,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  
  // Items List
  itemsList: {
    padding: 12,
    gap: 8,
  },
  emptyCategory: {
    padding: 16,
    alignItems: 'center',
  },
  emptyCategoryText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    gap: 12,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1C',
    marginBottom: 4,
  },
  priceContainer: {
    gap: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  originalPrice: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  offerPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22C55E',
  },
  discountBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: ZOMATO_RED,
  },
  
  // Checkbox
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: ZOMATO_RED,
    borderColor: ZOMATO_RED,
  },
  
  // Modal Footer
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modalDoneButton: {
    backgroundColor: ZOMATO_RED,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDoneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  
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
