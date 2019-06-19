const mongoose = require('mongoose');

const dialogsSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  type: String,
  users: Array,
});

module.exports = mongoose.model('Dialogs', dialogsSchema);