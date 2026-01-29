const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String }
});

// Pre-save middleware to update timestamp
settingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get a setting value
settingsSchema.statics.getValue = async function(key, defaultValue = null) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : defaultValue;
};

// Static method to set a setting value
settingsSchema.statics.setValue = async function(key, value, updatedBy = null) {
  const setting = await this.findOneAndUpdate(
    { key },
    { key, value, updatedAt: Date.now(), updatedBy },
    { upsert: true, new: true }
  );
  return setting;
};

module.exports = mongoose.model('Settings', settingsSchema);
