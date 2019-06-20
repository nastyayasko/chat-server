const mongoose = require('mongoose');

const usersSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  email: String,
  firstName: String,
  lastName: String,
  img: {
    type: String,
    default: '',
  },
  token: {
    type: String,
    default: '',
  },
  password: {
    type: String,
    default: '',
  }
});

module.exports = mongoose.model('Users', usersSchema);