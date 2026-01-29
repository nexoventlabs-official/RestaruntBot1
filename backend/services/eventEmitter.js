const EventEmitter = require('events');

// Global event emitter for real-time updates
const dataEvents = new EventEmitter();

module.exports = dataEvents;
