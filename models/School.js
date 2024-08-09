const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Schema = mongoose.Schema;

const SchoolSchema = new Schema({
  school_id: {
    type: String,
    unique: true,
    default: uuidv4
  },
  school_name: { 
    type: String, 
    required: true 
  },
  address: { 
    type: String, 
    required: true 
  },
  contactEmail: { 
    type: String, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('School', SchoolSchema);