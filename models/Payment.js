const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const paymentSchema = new mongoose.Schema({
  payment_id: {
    type: String,
    unique: true,
    default: uuidv4
  },
  tx_ref: {
    type: String,
    required: true
  },
  bill_type: {
    type: [String],
    required: true
  },
  student_firstname: {
    type: String,
    required: true
  },
  student_lastname: {
    type: String,
    required: true
  },
  student_id: {  // Adding student_id reference
    type: String,
    required: true,
    ref: 'Student'
  },
  school_id: {
    type: String,
    required: true,
    ref: 'School'
  },
  school_name: {
    type: String,
    required: true
  },
  grade_level: {
    type: Number,
    required: true
  },
  termName: {
    type: String,
    required: true,
    enum: ['First Term', 'Second Term', 'Third Term']
  },
  amount_due: {
    type: Number,
    required: true
  },
  amount_paid: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'cancelled'],
    default: 'pending',
    required: true
  },
  student_email: {
    type: String,
    required: true
  },
 
  payment_method: {
    type: String,
    enum: ['paypal', 'whatsapp', 'flutterwave'],
    required: true
  }
}, { timestamps: true });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;