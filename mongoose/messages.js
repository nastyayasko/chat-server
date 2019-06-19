const mongoose = require('mongoose');

const messagesSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  email: String,
  message: String, 
  time: String, 
  currentDialog: String
});

module.exports = mongoose.model('Messages', messagesSchema);