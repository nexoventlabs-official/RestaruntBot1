// Chatbot Images Service - Get dynamic images for WhatsApp messages
const ChatbotImage = require('../models/ChatbotImage');

// Cache for images (refresh every 5 minutes)
let imageCache = {};
let lastCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const chatbotImagesService = {
  /**
   * Get image URL by key
   * @param {string} key - Image key (e.g., 'cart_cleared', 'order_confirmed')
   * @returns {Promise<string|null>} - Image URL or null if not configured
   */
  async getImageUrl(key) {
    try {
      // Check cache
      const now = Date.now();
      if (imageCache[key] && (now - lastCacheTime) < CACHE_TTL) {
        return imageCache[key];
      }

      // Fetch from database
      const image = await ChatbotImage.findOne({ key });
      
      if (image?.imageUrl) {
        imageCache[key] = image.imageUrl;
        lastCacheTime = now;
        return image.imageUrl;
      }

      // No fallback - return null if not configured
      return null;
    } catch (error) {
      console.error(`Error fetching chatbot image ${key}:`, error.message);
      return null;
    }
  },

  /**
   * Refresh cache - call this after image updates
   */
  clearCache() {
    imageCache = {};
    lastCacheTime = 0;
  },

  /**
   * Get all images (for preloading)
   * @returns {Promise<Object>} - Object with all image URLs
   */
  async getAllImages() {
    try {
      const images = await ChatbotImage.find();
      const result = {};
      
      images.forEach(img => {
        if (img.imageUrl) {
          result[img.key] = img.imageUrl;
        }
      });

      // Update cache
      imageCache = result;
      lastCacheTime = Date.now();
      
      return result;
    } catch (error) {
      console.error('Error fetching all chatbot images:', error.message);
      return {};
    }
  }
};

module.exports = chatbotImagesService;
