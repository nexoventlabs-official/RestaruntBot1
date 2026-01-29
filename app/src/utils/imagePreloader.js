import { Asset } from 'expo-asset';
import { Image } from 'react-native';

// All background images used in the app
const backgroundImages = [
  require('../../assets/backgrounds/open.png'),
  require('../../assets/backgrounds/home.jpg'),
  require('../../assets/backgrounds/menu.jpg'),
  require('../../assets/backgrounds/orders.jpg'),
  require('../../assets/backgrounds/offers.jpg'),
  require('../../assets/backgrounds/deiverypartner.jpg'),
  require('../../assets/backgrounds/button.png'),
  require('../../assets/backgrounds/all.png'),
  require('../../assets/backgrounds/veg.png'),
  require('../../assets/backgrounds/non-veg.png'),
  require('../../assets/backgrounds/egg.png'),
];

/**
 * Preload all app images to cache them for faster display
 * @returns {Promise<void>}
 */
export const preloadImages = async () => {
  try {
    const imageAssets = backgroundImages.map(image => {
      if (typeof image === 'number') {
        // Local require() returns a number
        return Asset.fromModule(image).downloadAsync();
      } else if (typeof image === 'string') {
        // Remote URL
        return Image.prefetch(image);
      }
      return Promise.resolve();
    });

    await Promise.all(imageAssets);
    console.log('✅ All images preloaded successfully');
  } catch (error) {
    console.warn('⚠️ Image preloading failed:', error);
    // Don't throw - app should still work even if preloading fails
  }
};

export default preloadImages;
