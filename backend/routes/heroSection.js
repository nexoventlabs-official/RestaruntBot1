const express = require('express');
const router = express.Router();
const HeroSection = require('../models/HeroSection');
const auth = require('../middleware/auth');
const cloudinary = require('../services/cloudinary');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

// Get all hero sections (admin)
router.get('/', auth, async (req, res) => {
  try {
    const heroes = await HeroSection.find().sort({ order: 1, createdAt: -1 });
    res.json(heroes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create hero section
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, subtitle, description, buttonText, buttonLink, isActive, order } = req.body;
    
    let imageUrl = '';
    if (req.file) {
      imageUrl = await cloudinary.uploadFromBuffer(req.file.buffer, 'hero-sections');
    } else if (req.body.image) {
      imageUrl = req.body.image;
    }

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const hero = new HeroSection({
      title,
      subtitle,
      description,
      image: imageUrl,
      buttonText: buttonText || 'Order Now',
      buttonLink: buttonLink || '/menu',
      isActive: isActive !== 'false',
      order: parseInt(order) || 0
    });

    await hero.save();
    res.status(201).json(hero);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update hero section
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, subtitle, description, buttonText, buttonLink, isActive, order } = req.body;
    
    const updateData = {
      title,
      subtitle,
      description,
      buttonText,
      buttonLink,
      isActive: isActive !== 'false',
      order: parseInt(order) || 0
    };

    if (req.file) {
      updateData.image = await cloudinary.uploadFromBuffer(req.file.buffer, 'hero-sections');
    } else if (req.body.image) {
      updateData.image = req.body.image;
    }

    const hero = await HeroSection.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!hero) return res.status(404).json({ error: 'Hero section not found' });
    
    res.json(hero);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete hero section
router.delete('/:id', auth, async (req, res) => {
  try {
    const hero = await HeroSection.findByIdAndDelete(req.params.id);
    if (!hero) return res.status(404).json({ error: 'Hero section not found' });
    res.json({ message: 'Hero section deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle active status
router.patch('/:id/toggle', auth, async (req, res) => {
  try {
    const hero = await HeroSection.findById(req.params.id);
    if (!hero) return res.status(404).json({ error: 'Hero section not found' });
    
    hero.isActive = !hero.isActive;
    await hero.save();
    res.json(hero);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
