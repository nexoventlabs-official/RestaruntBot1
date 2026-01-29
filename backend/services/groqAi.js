const Groq = require('groq-sdk');

let groq = null;
const getGroq = () => {
  if (!groq) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groq;
};

const groqAi = {
  // Transcribe audio using Groq's Whisper model
  // Optimized for Indian food ordering context
  async transcribeAudio(audioBuffer, mimeType = 'audio/ogg') {
    try {
      const client = getGroq();
      
      // Create a File-like object from buffer
      const file = new File([audioBuffer], 'audio.ogg', { type: mimeType });
      
      // Use prompt to help Whisper understand food-related context
      // This significantly improves accuracy for food names
      const transcription = await client.audio.transcriptions.create({
        file: file,
        model: 'whisper-large-v3',
        response_format: 'text',
        prompt: 'Food ordering: dosa, idli, vada, sambar, rasam, biryani, pulao, curry, rice, roti, parotta, chapati, naan, paneer, chicken, mutton, fish, prawn, egg, masala, butter, ghee, curd, dal, fry, gravy, soup, juice, coffee, tea, lassi, buttermilk, payasam, halwa, gulab jamun, jalebi, pongal, upma, pesarattu, uttapam, appam, puttu, poori, bonda, bajji, pakora, manchurian, fried rice, noodles, gobi, aloo, palak, mushroom, tomato, onion, gongura, pulihora, curd rice, lemon rice, tamarind rice, coconut rice, veg, non-veg, spicy, mild, hot, cold, sweet, order, cart, menu, cancel, status, track, delivery, pickup, dine-in'
      });
      
      console.log('🎤 Transcription result:', transcription);
      return transcription || '';
    } catch (error) {
      console.error('❌ Groq transcription error:', error.message);
      return null;
    }
  },

  // Clean and normalize transcribed text for better food search
  // Fixes common voice recognition mistakes for food items
  normalizeTranscription(text) {
    if (!text) return '';
    
    let normalized = text.toLowerCase().trim();
    
    // Common voice recognition mistakes for food items
    const corrections = {
      // Dosa variations
      'dosha': 'dosa', 'dhosha': 'dosa', 'dhosa': 'dosa', 'dosai': 'dosa',
      'those a': 'dosa', 'those are': 'dosa', 'dozer': 'dosa', 'closer': 'dosa',
      'dossa': 'dosa', 'doza': 'dosa', 'tosa': 'dosa', 'rosa': 'dosa',
      // Idli variations
      'idly': 'idli', 'idle': 'idli', 'italy': 'idli', 'ideally': 'idli',
      'idlee': 'idli', 'iddly': 'idli', 'iddli': 'idli', 'it lee': 'idli',
      // Vada variations
      'wada': 'vada', 'vadai': 'vada', 'vade': 'vada', 'water': 'vada',
      'vader': 'vada', 'voda': 'vada', 'bada': 'vada', 'wadda': 'vada',
      // Sambar variations
      'sambhar': 'sambar', 'sambaar': 'sambar', 'samba': 'sambar',
      'summer': 'sambar', 'somber': 'sambar', 'sambor': 'sambar',
      'samber': 'sambar', 'sambur': 'sambar', 'sambhar': 'sambar',
      // Biryani variations
      'biriyani': 'biryani', 'briyani': 'biryani', 'biriani': 'biryani',
      'birani': 'biryani', 'bryani': 'biryani', 'beriani': 'biryani',
      // Rasam variations
      'rasamu': 'rasam', 'rasa': 'rasam', 'rasum': 'rasam',
      // Upma variations
      'uppuma': 'upma', 'uppit': 'upma', 'uppma': 'upma', 'up ma': 'upma',
      // Pongal variations
      'pongali': 'pongal', 'pongala': 'pongal', 'pongol': 'pongal',
      // Uttapam variations
      'uttappam': 'uttapam', 'uthappam': 'uttapam', 'utappam': 'uttapam',
      // Parotta variations
      'paratha': 'parotta', 'parota': 'parotta', 'barotta': 'parotta',
      // Chapati variations
      'chapathi': 'chapati', 'chapatti': 'chapati', 'chappati': 'chapati',
      // Poori variations
      'puri': 'poori', 'puree': 'poori', 'pooree': 'poori',
      // Paneer variations
      'panir': 'paneer', 'panner': 'paneer', 'panier': 'paneer',
      // Masala variations
      'masalla': 'masala', 'marsala': 'masala', 'massala': 'masala',
      // Chicken variations
      'chiken': 'chicken', 'chikken': 'chicken', 'chickan': 'chicken',
      // Mutton variations
      'mutan': 'mutton', 'muton': 'mutton', 'matton': 'mutton',
      // Curry variations
      'curri': 'curry', 'kari': 'curry', 'karri': 'curry',
      // Pulao/Pulav variations
      'pulav': 'pulao', 'pilaf': 'pulao', 'pilau': 'pulao',
      // Gongura variations
      'gongora': 'gongura', 'gangura': 'gongura', 'gonguru': 'gongura',
      // Pesarattu variations
      'pesaratu': 'pesarattu', 'pesarat': 'pesarattu', 'pesarathu': 'pesarattu',
      // Common phrases
      'i want': '', 'i need': '', 'give me': '', 'get me': '',
      'please': '', 'can i have': '', 'order': '', 'one': '1', 'two': '2',
      'three': '3', 'four': '4', 'five': '5'
    };
    
    // Apply corrections
    for (const [wrong, correct] of Object.entries(corrections)) {
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
      normalized = normalized.replace(regex, correct);
    }
    
    // Clean up extra spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
  },

  // Translate local language text to English for search
  // Returns multiple possible translations for better search matching
  async translateToEnglish(text) {
    try {
      // Check if text contains non-English characters (Indian languages)
      const hasNonEnglish = /[^\x00-\x7F]/.test(text);
      if (!hasNonEnglish) {
        // For English text, normalize and return
        const normalized = this.normalizeTranscription(text);
        return { primary: normalized || text, variations: [normalized || text] };
      }

      const client = getGroq();
      const completion = await client.chat.completions.create({
        messages: [{
          role: 'system',
          content: `You are an expert Indian food translator. Translate food names from ANY Indian language (Telugu, Tamil, Hindi, Kannada, Malayalam) to English.

CRITICAL: Many food items have the SAME name in English and regional languages. Keep these as-is:
- dosa, idli, vada, biryani, sambar, rasam, upma, pongal, parotta, chapati, poori, naan, roti
- paneer, dal, curry, fry, rice, pulao

RULES:
1. Return ONLY the food name in English, no explanations
2. If the word is already a common food name, return it as-is
3. For regional-specific names, provide English equivalent

EXAMPLES:
- దోశ/தோசை → dosa
- ఇడ్లీ/இட்லி → idli  
- బిర్యానీ/பிரியாணி → biryani
- చిత్రాన్నం → lemon rice
- పులిహోర → tamarind rice
- గొంగూర చికెన్ → gongura chicken
- మటన్ బిర్యానీ → mutton biryani`
        }, {
          role: 'user',
          content: `Translate: "${text}"`
        }],
        model: 'llama-3.1-8b-instant',
        max_tokens: 100,
        temperature: 0.1
      });
      
      let response = completion.choices[0]?.message?.content?.trim() || text;
      
      // Clean up the response
      response = response.replace(/^["']|["']$/g, '').trim();
      response = response.replace(/^(translation|english|answer|result|variations?|the food item is|food item)[\s:=→]+/i, '').trim();
      
      // Parse variations (comma or slash separated)
      let variations = response.split(/[,\/]/).map(v => v.trim().toLowerCase()).filter(v => v.length > 0);
      
      // Remove any non-English variations and normalize
      variations = variations
        .filter(v => !/[^\x00-\x7F]/.test(v))
        .map(v => this.normalizeTranscription(v))
        .filter(v => v.length > 0);
      
      // If no valid variations, return original
      if (variations.length === 0) {
        return { primary: text, variations: [text] };
      }
      
      // Remove duplicates
      variations = [...new Set(variations)];
      
      console.log(`🌐 Translated "${text}" to variations: [${variations.join(', ')}]`);
      return { primary: variations[0], variations };
    } catch (error) {
      console.error('Groq translation error:', error.message);
      return { primary: text, variations: [text] };
    }
  },

  // Translate romanized Indian food names to standard English/searchable terms
  async translateRomanizedFood(text) {
    try {
      const client = getGroq();
      const completion = await client.chat.completions.create({
        messages: [{
          role: 'system',
          content: `You are a food search assistant for an Indian restaurant. Convert romanized Indian food names to their standard searchable English names.

RULES:
1. If it's a specific regional dish name, keep it (gongura, pulihora, pesarattu)
2. Convert regional words to common English equivalents for searching
3. Return ONLY the converted name, no explanations

EXAMPLES:
- "gongura chicken" → "gongura chicken"
- "kodi biryani" → "chicken biryani"
- "mamsam curry" → "mutton curry"
- "chepala pulusu" → "fish curry"
- "bendakaya fry" → "okra fry"
- "gutti vankaya" → "stuffed brinjal"
- "pappu" → "dal"
- "koora" → "curry"
- "pulusu" → "curry"
- "vepudu" → "fry"
- "iguru" → "dry curry"
- "perugu" → "curd"
- "annam" → "rice"
- "roti" → "roti"
- "parotta" → "parotta"
- "dosai" → "dosa"
- "idly" → "idli"
- "vadai" → "vada"
- "kozhi" → "chicken"
- "aattu" → "mutton"
- "meen" → "fish"
- "murgh" → "chicken"
- "gosht" → "mutton"
- "machli" → "fish"

If already standard or you're unsure, return as is.`
        }, {
          role: 'user',
          content: `Convert: "${text}"`
        }],
        model: 'llama-3.1-8b-instant',
        max_tokens: 50,
        temperature: 0.1
      });
      
      let translated = completion.choices[0]?.message?.content?.trim() || text;
      
      // Clean up the response
      translated = translated.replace(/^["']|["']$/g, '').trim();
      translated = translated.replace(/^(the |a |an )/i, '').trim();
      translated = translated.replace(/^(translation|english|answer|result|convert)[\s:=→]+/i, '').trim();
      
      // If response is too long or contains explanation, return original
      if (translated.length > 50 || translated.includes('\n')) {
        return text;
      }
      
      console.log(`🔤 Romanized "${text}" → "${translated}"`);
      return translated;
    } catch (error) {
      console.error('Groq romanized translation error:', error.message);
      return text;
    }
  },

  async generateDescription(itemName, category) {
    try {
      const client = getGroq();
      const completion = await client.chat.completions.create({
        messages: [{
          role: 'user',
          content: `Write a short, appetizing description (max 50 words) for a restaurant menu item called "${itemName}" in the "${category}" category. Make it enticing and highlight flavors. Only return the description, no quotes or extra text.`
        }],
        model: 'llama-3.1-8b-instant',
        max_tokens: 150,
        temperature: 0.7
      });
      return completion.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      console.error('Groq AI error:', error);
      throw new Error('Failed to generate description: ' + error.message);
    }
  },

  async generateTags(itemName, category, foodType) {
    try {
      const client = getGroq();
      const categories = Array.isArray(category) ? category : [category];
      const categoryText = categories.join(', ');
      const foodTypeText = foodType === 'veg' ? 'veg' : foodType === 'nonveg' ? 'nonveg' : foodType === 'egg' ? 'egg' : '';
      
      // Extract words from item name (split by space and special chars)
      const nameWords = itemName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/gi, ' ')
        .split(/\s+/)
        .filter(word => word.length > 1)
        .map(word => word.trim());
      
      // Extract category words
      const categoryWords = categories
        .map(cat => cat.toLowerCase().trim())
        .filter(cat => cat.length > 0);
      
      // Combine name words + category words as base tags
      const baseTags = [...new Set([...nameWords, ...categoryWords])];
      
      const completion = await client.chat.completions.create({
        messages: [{
          role: 'user',
          content: `Generate 5-7 additional searchable tags for this Indian restaurant menu item. Only return extra tags that are NOT already in the base tags list.

Item: "${itemName}"
Category: ${categoryText}
Type: ${foodTypeText}
Base tags (already included): ${baseTags.join(', ')}

Add only these types of extra tags:
- Main ingredient if not in name (chicken, paneer, dal, aloo, gobi, mutton, fish, prawn)
- Taste/style (spicy, mild, hot, creamy, dry, crispy, fried, grilled, tandoor)
- Cuisine type (south indian, north indian, punjabi, hyderabadi, chinese)
- Meal type (breakfast, lunch, dinner, snacks)
- Popular terms (special, popular, famous) if applicable

Return ONLY comma-separated lowercase words. No sentences, no explanations.
Example: spicy, crispy, popular, lunch, north indian`
        }],
        model: 'llama-3.1-8b-instant',
        max_tokens: 100,
        temperature: 0.5
      });
      
      const aiTagsText = completion.choices[0]?.message?.content?.trim() || '';
      
      // Clean AI generated tags
      const aiTags = aiTagsText
        .replace(/[\[\]"]/g, '')
        .replace(/\n/g, ',')
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 1 && tag.length < 20 && !tag.includes(':') && !tag.includes('.'));
      
      // Combine base tags + AI tags + food type, remove duplicates
      const allTags = [...baseTags];
      if (foodTypeText) allTags.push(foodTypeText);
      aiTags.forEach(tag => {
        if (!allTags.includes(tag)) allTags.push(tag);
      });
      
      // Limit to 15 tags max
      return allTags.slice(0, 15).join(', ');
    } catch (error) {
      console.error('Groq AI tags error:', error);
      // Fallback: return item name words + categories if AI fails
      const categories = Array.isArray(category) ? category : [category];
      const nameWords = itemName.toLowerCase().replace(/[^a-z0-9\s]/gi, ' ').split(/\s+/).filter(w => w.length > 1);
      const categoryWords = categories.map(c => c.toLowerCase().trim());
      const fallbackTags = [...new Set([...nameWords, ...categoryWords])];
      if (foodType && foodType !== 'none') fallbackTags.push(foodType);
      return fallbackTags.join(', ');
    }
  },

  // Use AI to correct spelling mistakes in food search queries
  // This helps match "samber" → "sambar", "biriyani" → "biryani", etc.
  async correctFoodSpelling(text, menuItems) {
    try {
      // Build a list of all available food names from menu
      const foodNames = menuItems.map(item => item.name).join(', ');
      
      const client = getGroq();
      const completion = await client.chat.completions.create({
        messages: [{
          role: 'system',
          content: `You are a spelling correction assistant for an Indian restaurant menu search.

Your job: If the user's search has a spelling mistake, correct it to match the closest food item name.

Available menu items: ${foodNames}

RULES:
1. If the search closely matches a menu item name (with spelling mistakes), return the CORRECT spelling
2. If it's already correct or doesn't match any menu item, return it as-is
3. Return ONLY the corrected word(s), no explanations
4. Consider common mistakes: samber→sambar, biriyani→biryani, chiken→chicken, dosa→dosa, idly→idli

EXAMPLES:
- "samber" → "sambar" (if sambar is in menu)
- "biriyani" → "biryani" (if biryani is in menu)
- "chiken" → "chicken" (if chicken is in menu)
- "dosa" → "dosa" (already correct)
- "pizza" → "pizza" (not in menu, return as-is)`
        }, {
          role: 'user',
          content: `Correct spelling: "${text}"`
        }],
        model: 'llama-3.1-8b-instant',
        max_tokens: 50,
        temperature: 0.1
      });
      
      let corrected = completion.choices[0]?.message?.content?.trim() || text;
      
      // Clean up the response
      corrected = corrected.replace(/^["']|["']$/g, '').trim();
      corrected = corrected.replace(/^(corrected|correction|spelling|answer|result)[\s:=→]+/i, '').trim();
      
      // If response is too long or contains explanation, return original
      if (corrected.length > text.length + 10 || corrected.includes('\n') || corrected.includes('.')) {
        return text;
      }
      
      // Only return correction if it's different and reasonable
      if (corrected.toLowerCase() !== text.toLowerCase() && corrected.length > 0) {
        console.log(`✏️ Spelling corrected: "${text}" → "${corrected}"`);
        return corrected;
      }
      
      return text;
    } catch (error) {
      console.error('Groq spelling correction error:', error.message);
      return text;
    }
  },

  async processCustomerMessage(message, context, menuItems) {
    try {
      const menuList = menuItems.map(m => `${m.name} (₹${m.price}) - ${m.category}`).join('\n');
      const systemPrompt = `You are a helpful restaurant AI assistant. Help customers with:
- Viewing menu and ordering food
- Checking order status
- Cancelling orders
- Requesting refunds
- Tracking deliveries
- Answering questions about menu items

Current menu:
${menuList}

Customer context: ${JSON.stringify(context)}

Respond naturally and helpfully. If they want to order, guide them through the process.
For actions, include JSON at the end: {"action": "action_name", "data": {...}}
Actions: view_menu, add_to_cart, view_cart, checkout, check_status, cancel_order, request_refund, track_order`;

      const client = getGroq();
      const completion = await client.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        model: 'llama-3.1-8b-instant',
        max_tokens: 500
      });
      return completion.choices[0]?.message?.content || "I'm sorry, I couldn't understand that. Please try again.";
    } catch (error) {
      console.error('Groq AI chat error:', error.message);
      return "I'm having trouble processing your request. Please try again.";
    }
  }
};

module.exports = groqAi;
