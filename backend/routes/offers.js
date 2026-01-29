const express = require('express');
const router = express.Router();
const Offer = require('../models/Offer');
const auth = require('../middleware/auth');
const cloudinary = require('../services/cloudinary');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

// Support multiple image uploads (mobile, tablet, desktop)
const uploadMultiple = upload.fields([
  { name: 'imageMobile', maxCount: 1 },
  { name: 'imageTablet', maxCount: 1 },
  { name: 'imageDesktop', maxCount: 1 },
  { name: 'image', maxCount: 1 } // Legacy support
]);

// Get all offers (admin)
router.get('/', auth, async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    res.json(offers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create offer
router.post('/', auth, uploadMultiple, async (req, res) => {
  try {
    const { 
      title, description, offerType, code, discountType, discountValue, 
      minOrderAmount, validFrom, validUntil, isActive, showAsPopup,
      buttonText, buttonLink, percentage, appliedItems, appliedCategories
    } = req.body;
    
    let imageMobileUrl = '';
    let imageTabletUrl = '';
    let imageDesktopUrl = '';
    let legacyImageUrl = '';

    // Upload mobile image
    if (req.files?.imageMobile?.[0]) {
      imageMobileUrl = await cloudinary.uploadPreserveAspect(req.files.imageMobile[0].buffer, 'offers/mobile');
    } else if (req.body.imageMobile) {
      imageMobileUrl = req.body.imageMobile;
    }

    // Upload tablet image
    if (req.files?.imageTablet?.[0]) {
      imageTabletUrl = await cloudinary.uploadPreserveAspect(req.files.imageTablet[0].buffer, 'offers/tablet');
    } else if (req.body.imageTablet) {
      imageTabletUrl = req.body.imageTablet;
    }

    // Upload desktop image
    if (req.files?.imageDesktop?.[0]) {
      imageDesktopUrl = await cloudinary.uploadPreserveAspect(req.files.imageDesktop[0].buffer, 'offers/desktop');
    } else if (req.body.imageDesktop) {
      imageDesktopUrl = req.body.imageDesktop;
    }

    // Legacy image support (use desktop as fallback)
    if (req.files?.image?.[0]) {
      legacyImageUrl = await cloudinary.uploadPreserveAspect(req.files.image[0].buffer, 'offers');
    } else if (req.body.image) {
      legacyImageUrl = req.body.image;
    } else {
      // Use desktop image as legacy fallback
      legacyImageUrl = imageDesktopUrl || imageTabletUrl || imageMobileUrl;
    }

    // At least one image is required
    if (!imageMobileUrl && !imageTabletUrl && !imageDesktopUrl && !legacyImageUrl) {
      return res.status(400).json({ error: 'At least one image is required' });
    }

    // Parse appliedItems and appliedCategories if they're JSON strings
    let parsedAppliedItems = [];
    let parsedAppliedCategories = [];
    
    if (appliedItems) {
      parsedAppliedItems = typeof appliedItems === 'string' ? JSON.parse(appliedItems) : appliedItems;
    }
    
    if (appliedCategories) {
      parsedAppliedCategories = typeof appliedCategories === 'string' ? JSON.parse(appliedCategories) : appliedCategories;
    }

    const offer = new Offer({
      title,
      description,
      offerType: offerType || '',
      percentage: percentage ? parseFloat(percentage) : null,
      appliedItems: parsedAppliedItems,
      appliedCategories: parsedAppliedCategories,
      image: legacyImageUrl || imageDesktopUrl || imageTabletUrl || imageMobileUrl, // Legacy field
      imageMobile: imageMobileUrl,
      imageTablet: imageTabletUrl,
      imageDesktop: imageDesktopUrl,
      code,
      discountType: discountType || 'none',
      discountValue: parseFloat(discountValue) || 0,
      minOrderAmount: parseFloat(minOrderAmount) || 0,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : null,
      isActive: isActive !== 'false',
      showAsPopup: showAsPopup !== 'false',
      buttonText: buttonText || 'Order Now',
      buttonLink: buttonLink || '/menu'
    });

    await offer.save();
    
    console.log('Offer saved:', {
      offerType,
      percentage,
      appliedItems: parsedAppliedItems,
      appliedCategories: parsedAppliedCategories
    });
    
    // Apply offer to selected items and categories (if any items/categories are selected)
    if (parsedAppliedItems.length > 0 || parsedAppliedCategories.length > 0) {
      const MenuItem = require('../models/MenuItem');
      
      // Collect all item IDs (from both direct selection and categories)
      let allItemIds = [...parsedAppliedItems];
      
      // Add items from selected categories
      if (parsedAppliedCategories.length > 0) {
        console.log('Finding items in categories:', parsedAppliedCategories);
        const categoryItems = await MenuItem.find({
          category: { $in: parsedAppliedCategories }
        });
        console.log('Found category items:', categoryItems.length);
        const categoryItemIds = categoryItems.map(item => item._id.toString());
        allItemIds = [...new Set([...allItemIds, ...categoryItemIds])];
      }
      
      console.log('Total items to apply offer:', allItemIds.length);
      
      // Apply offer to all collected items
      for (const itemId of allItemIds) {
        const item = await MenuItem.findById(itemId);
        if (item) {
          // Add offer type to item's offerType array
          const offerTypes = Array.isArray(item.offerType) ? item.offerType : (item.offerType ? [item.offerType] : []);
          if (!offerTypes.includes(offerType)) {
            offerTypes.push(offerType);
          }
          
          const updateFields = { offerType: offerTypes };
          
          // If percentage is provided, calculate and apply discount
          if (percentage) {
            const discountPercent = parseFloat(percentage);
            const offerPrice = Math.round(item.price * (1 - discountPercent / 100));
            updateFields.offerPrice = offerPrice;
            console.log(`Applying to ${item.name}: ${item.price} -> ${offerPrice} (${discountPercent}% OFF)`);
          } else {
            console.log(`Adding offer type to ${item.name}: ${offerType}`);
          }
          
          // Update item
          await MenuItem.findByIdAndUpdate(itemId, updateFields);
        }
      }
      
      console.log('Offer application completed');
    } else {
      console.log('No items or categories selected for this offer');
    }
    
    // Emit SSE event to notify clients to refresh (cache-busting)
    const eventEmitter = require('../services/eventEmitter');
    eventEmitter.emit('dataUpdate', { type: 'offers' });
    eventEmitter.emit('dataUpdate', { type: 'menu' });
    
    res.status(201).json(offer);
  } catch (err) {
    console.error('Error creating offer:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update offer
router.put('/:id', auth, uploadMultiple, async (req, res) => {
  try {
    const { 
      title, description, offerType, code, discountType, discountValue, 
      minOrderAmount, validFrom, validUntil, isActive, showAsPopup,
      buttonText, buttonLink, percentage, appliedItems, appliedCategories
    } = req.body;
    
    // Get existing offer to check for old images
    const existingOffer = await Offer.findById(req.params.id);
    if (!existingOffer) return res.status(404).json({ error: 'Offer not found' });
    
    // Parse appliedItems and appliedCategories if they're JSON strings
    let parsedAppliedItems = [];
    let parsedAppliedCategories = [];
    
    if (appliedItems) {
      parsedAppliedItems = typeof appliedItems === 'string' ? JSON.parse(appliedItems) : appliedItems;
    }
    
    if (appliedCategories) {
      parsedAppliedCategories = typeof appliedCategories === 'string' ? JSON.parse(appliedCategories) : appliedCategories;
    }
    
    const updateData = {
      title,
      description,
      offerType: offerType || '',
      percentage: percentage ? parseFloat(percentage) : null,
      appliedItems: parsedAppliedItems,
      appliedCategories: parsedAppliedCategories,
      code,
      discountType: discountType || 'none',
      discountValue: parseFloat(discountValue) || 0,
      minOrderAmount: parseFloat(minOrderAmount) || 0,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : null,
      isActive: isActive !== 'false',
      showAsPopup: showAsPopup !== 'false',
      buttonText,
      buttonLink
    };

    // Helper function to delete old image
    const deleteOldImage = async (imageUrl) => {
      if (imageUrl && imageUrl.includes('cloudinary.com')) {
        try {
          const publicId = cloudinary.extractPublicId(imageUrl);
          if (publicId) await cloudinary.deleteImage(publicId);
        } catch (e) {
          console.log('Could not delete old offer image:', e.message);
        }
      }
    };

    // Handle mobile image
    if (req.files?.imageMobile?.[0]) {
      await deleteOldImage(existingOffer.imageMobile);
      updateData.imageMobile = await cloudinary.uploadPreserveAspect(req.files.imageMobile[0].buffer, 'offers/mobile');
    } else if (req.body.imageMobile && req.body.imageMobile !== existingOffer.imageMobile) {
      await deleteOldImage(existingOffer.imageMobile);
      updateData.imageMobile = req.body.imageMobile;
    }

    // Handle tablet image
    if (req.files?.imageTablet?.[0]) {
      await deleteOldImage(existingOffer.imageTablet);
      updateData.imageTablet = await cloudinary.uploadPreserveAspect(req.files.imageTablet[0].buffer, 'offers/tablet');
    } else if (req.body.imageTablet && req.body.imageTablet !== existingOffer.imageTablet) {
      await deleteOldImage(existingOffer.imageTablet);
      updateData.imageTablet = req.body.imageTablet;
    }

    // Handle desktop image
    if (req.files?.imageDesktop?.[0]) {
      await deleteOldImage(existingOffer.imageDesktop);
      updateData.imageDesktop = await cloudinary.uploadPreserveAspect(req.files.imageDesktop[0].buffer, 'offers/desktop');
    } else if (req.body.imageDesktop && req.body.imageDesktop !== existingOffer.imageDesktop) {
      await deleteOldImage(existingOffer.imageDesktop);
      updateData.imageDesktop = req.body.imageDesktop;
    }

    // Handle legacy image field
    if (req.files?.image?.[0]) {
      await deleteOldImage(existingOffer.image);
      updateData.image = await cloudinary.uploadPreserveAspect(req.files.image[0].buffer, 'offers');
    } else if (req.body.image && req.body.image !== existingOffer.image) {
      await deleteOldImage(existingOffer.image);
      updateData.image = req.body.image;
    } else {
      // Update legacy image to match desktop (or best available)
      updateData.image = updateData.imageDesktop || existingOffer.imageDesktop || 
                        updateData.imageTablet || existingOffer.imageTablet || 
                        updateData.imageMobile || existingOffer.imageMobile ||
                        existingOffer.image;
    }

    const offer = await Offer.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    // Apply offer to selected items and categories (if any items/categories are selected)
    if (parsedAppliedItems.length > 0 || parsedAppliedCategories.length > 0) {
      const MenuItem = require('../models/MenuItem');
      
      // Collect all item IDs (from both direct selection and categories)
      let allItemIds = [...parsedAppliedItems];
      
      // Add items from selected categories
      if (parsedAppliedCategories.length > 0) {
        const categoryItems = await MenuItem.find({
          category: { $in: parsedAppliedCategories }
        });
        const categoryItemIds = categoryItems.map(item => item._id.toString());
        allItemIds = [...new Set([...allItemIds, ...categoryItemIds])];
      }
      
      // First, remove this offer from items that are no longer selected
      const previousItems = existingOffer.appliedItems || [];
      const previousCategories = existingOffer.appliedCategories || [];
      
      // Get previous category items
      let previousCategoryItemIds = [];
      if (previousCategories.length > 0) {
        const prevCategoryItems = await MenuItem.find({
          category: { $in: previousCategories }
        });
        previousCategoryItemIds = prevCategoryItems.map(item => item._id.toString());
      }
      
      const allPreviousItemIds = [...new Set([...previousItems.map(id => id.toString()), ...previousCategoryItemIds])];
      const removedItems = allPreviousItemIds.filter(id => !allItemIds.includes(id));
      
      for (const itemId of removedItems) {
        const item = await MenuItem.findById(itemId);
        if (item) {
          const offerTypes = Array.isArray(item.offerType) ? item.offerType : (item.offerType ? [item.offerType] : []);
          const updatedOfferTypes = offerTypes.filter(ot => ot !== offerType);
          
          if (updatedOfferTypes.length === 0) {
            await MenuItem.findByIdAndUpdate(itemId, {
              $unset: { offerPrice: 1 },
              offerType: []
            });
          } else {
            await MenuItem.findByIdAndUpdate(itemId, {
              offerType: updatedOfferTypes
            });
          }
        }
      }
      
      // Then, apply offer to newly selected items
      for (const itemId of allItemIds) {
        const item = await MenuItem.findById(itemId);
        if (item) {
          // Add offer type to item's offerType array
          const offerTypes = Array.isArray(item.offerType) ? item.offerType : (item.offerType ? [item.offerType] : []);
          if (!offerTypes.includes(offerType)) {
            offerTypes.push(offerType);
          }
          
          const updateFields = { offerType: offerTypes };
          
          // If percentage is provided, calculate and apply discount
          if (percentage) {
            const discountPercent = parseFloat(percentage);
            const offerPrice = Math.round(item.price * (1 - discountPercent / 100));
            updateFields.offerPrice = offerPrice;
          }
          
          await MenuItem.findByIdAndUpdate(itemId, updateFields);
        }
      }
    } else {
      // If no items/categories selected, remove this offer from all items
      const MenuItem = require('../models/MenuItem');
      const previousItems = existingOffer.appliedItems || [];
      const previousCategories = existingOffer.appliedCategories || [];
      
      // Get previous category items
      let previousCategoryItemIds = [];
      if (previousCategories.length > 0) {
        const prevCategoryItems = await MenuItem.find({
          category: { $in: previousCategories }
        });
        previousCategoryItemIds = prevCategoryItems.map(item => item._id.toString());
      }
      
      const allPreviousItemIds = [...new Set([...previousItems.map(id => id.toString()), ...previousCategoryItemIds])];
      
      for (const itemId of allPreviousItemIds) {
        const item = await MenuItem.findById(itemId);
        if (item) {
          const offerTypes = Array.isArray(item.offerType) ? item.offerType : (item.offerType ? [item.offerType] : []);
          const updatedOfferTypes = offerTypes.filter(ot => ot !== offerType);
          
          if (updatedOfferTypes.length === 0) {
            await MenuItem.findByIdAndUpdate(itemId, {
              $unset: { offerPrice: 1 },
              offerType: []
            });
          } else {
            await MenuItem.findByIdAndUpdate(itemId, {
              offerType: updatedOfferTypes
            });
          }
        }
      }
    }
    
    // Emit SSE event to notify clients to refresh (cache-busting)
    const eventEmitter = require('../services/eventEmitter');
    eventEmitter.emit('dataUpdate', { type: 'offers' });
    eventEmitter.emit('dataUpdate', { type: 'menu' });
    
    res.json(offer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete offer
router.delete('/:id', auth, async (req, res) => {
  try {
    // Get offer first to delete images from Cloudinary and remove from menu items
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    
    // Helper function to delete image
    const deleteImage = async (imageUrl) => {
      if (imageUrl && imageUrl.includes('cloudinary.com')) {
        try {
          const publicId = cloudinary.extractPublicId(imageUrl);
          if (publicId) await cloudinary.deleteImage(publicId);
        } catch (e) {
          console.log('Could not delete offer image:', e.message);
        }
      }
    };

    // Delete all images from Cloudinary
    await Promise.all([
      deleteImage(offer.image),
      deleteImage(offer.imageMobile),
      deleteImage(offer.imageTablet),
      deleteImage(offer.imageDesktop)
    ]);
    
    // Remove this offer type from all menu items and recalculate offer prices
    if (offer.offerType) {
      const MenuItem = require('../models/MenuItem');
      
      // Get all items that have this offer type
      const itemsWithOffer = await MenuItem.find({ offerType: offer.offerType });
      
      for (const item of itemsWithOffer) {
        const offerTypes = Array.isArray(item.offerType) ? item.offerType : [item.offerType];
        const updatedOfferTypes = offerTypes.filter(ot => ot !== offer.offerType);
        
        // If no more offers, remove offerPrice
        if (updatedOfferTypes.length === 0) {
          await MenuItem.findByIdAndUpdate(item._id, {
            $unset: { offerPrice: 1 },
            offerType: []
          });
        } else {
          // Still has other offers, recalculate offerPrice based on remaining offers
          const remainingOffers = await Offer.find({ 
            offerType: { $in: updatedOfferTypes },
            isActive: true 
          });
          
          // Find the best discount from remaining offers
          let bestDiscount = 0;
          for (const remainingOffer of remainingOffers) {
            if (remainingOffer.percentage && remainingOffer.percentage > bestDiscount) {
              bestDiscount = remainingOffer.percentage;
            }
          }
          
          const updateFields = { offerType: updatedOfferTypes };
          if (bestDiscount > 0) {
            updateFields.offerPrice = Math.round(item.price * (1 - bestDiscount / 100));
          } else {
            // No percentage-based offers remain, remove offerPrice
            await MenuItem.findByIdAndUpdate(item._id, {
              $unset: { offerPrice: 1 },
              offerType: updatedOfferTypes
            });
            continue;
          }
          
          await MenuItem.findByIdAndUpdate(item._id, updateFields);
        }
      }
      
    }
    
    await Offer.findByIdAndDelete(req.params.id);
    
    // Emit SSE event to notify clients
    const eventEmitter = require('../services/eventEmitter');
    eventEmitter.emit('dataUpdate', { type: 'menu' });
    eventEmitter.emit('dataUpdate', { type: 'offers' });
    
    res.json({ message: 'Offer deleted and removed from all items' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle active status
router.patch('/:id/toggle', auth, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    
    const wasActive = offer.isActive;
    offer.isActive = !offer.isActive;
    await offer.save();
    
    // If offer is being deactivated, recalculate prices for affected items
    if (wasActive && !offer.isActive && offer.offerType) {
      const MenuItem = require('../models/MenuItem');
      const itemsWithOffer = await MenuItem.find({ offerType: offer.offerType });
      
      for (const item of itemsWithOffer) {
        const offerTypes = Array.isArray(item.offerType) ? item.offerType : [item.offerType];
        
        // Get remaining active offers for this item
        const remainingOffers = await Offer.find({ 
          offerType: { $in: offerTypes },
          isActive: true,
          _id: { $ne: offer._id } // Exclude the deactivated offer
        });
        
        // Find the best discount from remaining active offers
        let bestDiscount = 0;
        for (const remainingOffer of remainingOffers) {
          if (remainingOffer.percentage && remainingOffer.percentage > bestDiscount) {
            bestDiscount = remainingOffer.percentage;
          }
        }
        
        if (bestDiscount > 0) {
          await MenuItem.findByIdAndUpdate(item._id, {
            offerPrice: Math.round(item.price * (1 - bestDiscount / 100))
          });
        } else {
          // No active percentage-based offers remain, remove offerPrice
          await MenuItem.findByIdAndUpdate(item._id, {
            $unset: { offerPrice: 1 }
          });
        }
      }
      
      // Emit SSE event to notify clients
      const eventEmitter = require('../services/eventEmitter');
      eventEmitter.emit('dataUpdate', { type: 'menu' });
    }
    
    // If offer is being activated, apply it to items
    if (!wasActive && offer.isActive && offer.offerType && offer.percentage) {
      const MenuItem = require('../models/MenuItem');
      const itemsWithOffer = await MenuItem.find({ offerType: offer.offerType });
      
      for (const item of itemsWithOffer) {
        const offerTypes = Array.isArray(item.offerType) ? item.offerType : [item.offerType];
        
        // Get all active offers for this item
        const activeOffers = await Offer.find({ 
          offerType: { $in: offerTypes },
          isActive: true
        });
        
        // Find the best discount
        let bestDiscount = 0;
        for (const activeOffer of activeOffers) {
          if (activeOffer.percentage && activeOffer.percentage > bestDiscount) {
            bestDiscount = activeOffer.percentage;
          }
        }
        
        if (bestDiscount > 0) {
          await MenuItem.findByIdAndUpdate(item._id, {
            offerPrice: Math.round(item.price * (1 - bestDiscount / 100))
          });
        }
      }
      
      // Emit SSE event to notify clients
      const eventEmitter = require('../services/eventEmitter');
      eventEmitter.emit('dataUpdate', { type: 'menu' });
    }
    
    // Emit SSE event to notify clients
    const eventEmitter = require('../services/eventEmitter');
    eventEmitter.emit('dataUpdate', { type: 'offers' });
    
    res.json(offer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle popup status
router.patch('/:id/toggle-popup', auth, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    
    offer.showAsPopup = !offer.showAsPopup;
    await offer.save();
    res.json(offer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
