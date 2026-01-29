// WhatsApp Service - Meta Cloud API
const metaCloud = require('./metaCloud');

const whatsapp = {
  async sendMessage(phone, message) {
    return metaCloud.sendMessage(phone, message);
  },

  async sendButtons(phone, message, buttons, footer = '') {
    return metaCloud.sendButtons(phone, message, buttons, footer);
  },

  async sendList(phone, title, description, buttonText, sections, footer = '') {
    return metaCloud.sendList(phone, title, description, buttonText, sections, footer);
  },

  async sendTemplateButtons(phone, message, buttons, footer = '') {
    return metaCloud.sendTemplateButtons(phone, message, buttons, footer);
  },

  async sendOrder(phone, order, items, paymentUrl, imageUrl = null) {
    return metaCloud.sendOrder(phone, order, items, paymentUrl, imageUrl);
  },

  async sendImage(phone, imageUrl, caption = '') {
    return metaCloud.sendImage(phone, imageUrl, caption);
  },

  async sendImageWithButtons(phone, imageUrl, message, buttons, footer = '') {
    return metaCloud.sendImageWithButtons(phone, imageUrl, message, buttons, footer);
  },

  async sendLocationRequest(phone, message) {
    return metaCloud.sendLocationRequest(phone, message);
  },

  async sendCtaUrl(phone, message, buttonText, url, footer = '') {
    return metaCloud.sendCtaUrl(phone, message, buttonText, url, footer);
  },

  async sendImageWithCtaUrl(phone, imageUrl, message, buttonText, url, footer = '') {
    return metaCloud.sendImageWithCtaUrl(phone, imageUrl, message, buttonText, url, footer);
  },

  async sendImageWithCtaUrlOriginal(phone, imageUrl, message, buttonText, url, footer = '') {
    return metaCloud.sendImageWithCtaUrlOriginal(phone, imageUrl, message, buttonText, url, footer);
  },

  async sendCtaPhone(phone, message, buttonText, phoneNumber, footer = '') {
    return metaCloud.sendCtaPhone(phone, message, buttonText, phoneNumber, footer);
  },

  async sendImageWithCtaPhone(phone, imageUrl, message, buttonText, phoneNumber, footer = '') {
    return metaCloud.sendImageWithCtaPhone(phone, imageUrl, message, buttonText, phoneNumber, footer);
  },

  // Template messages - work outside 24-hour window
  async sendMarketingTemplate(phone, templateName, imageUrl, bodyParams = [], buttonUrl = null) {
    return metaCloud.sendMarketingTemplate(phone, templateName, imageUrl, bodyParams, buttonUrl);
  },

  async sendSimpleTemplate(phone, templateName = 'hello_world', languageCode = 'en_US') {
    return metaCloud.sendSimpleTemplate(phone, templateName, languageCode);
  }
};

module.exports = whatsapp;
