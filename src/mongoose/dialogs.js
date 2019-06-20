const mongoose = require('mongoose');

const dialogsSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  type: String,
  title: {
    type: String,
    default:'',
  },
  users: Array,
});

module.exports = mongoose.model('Dialogs', dialogsSchema);