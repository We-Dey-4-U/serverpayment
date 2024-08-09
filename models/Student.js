const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Schema = mongoose.Schema;

const studentSchema = new Schema({
  student_id: {
    type: String,
    unique: true,
    default: uuidv4,
  },
  firstname: {
     type: String, 
     required: true
     },
    lastname: { 
      type: String, 
      required: true
     },

  student_email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  school_id: {
    type: String,
    ref: 'School',
    required: true,
  },
  school_name: { 
    type: String, 
    required: true 
  },
});

module.exports = mongoose.model('Student', studentSchema);