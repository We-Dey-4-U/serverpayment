require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const School = require('../models/School');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const twilio = require('twilio');

//TWILIO_ACCOUNT_SID=your_twilio_account_sid
//TWILIO_AUTH_TOKEN=your_twilio_auth_token

// Initialize Twilio client
//const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Helper function to fetch 'got'
const fetchGot = async () => {
  const { default: got } = await import('got');
  return got;
};

exports.initiateFlutterwavePayment = async (req, res) => {
  try {
    console.log('Request received to initiate Flutterwave payment:', req.body);

    const { amount, email, grade_level, name, termName, bill_type, school_name } = req.body;
    const [student_firstname, student_lastname] = name.split(' ');

    console.log(`Searching for student: ${student_firstname} ${student_lastname}`);
    const student = await Student.findOne({ firstname: student_firstname, lastname: student_lastname });
    if (!student) {
      console.log('Student not found');
      return res.status(404).json({ message: 'Student not found' });
    }
    console.log('Student found:', student);

    console.log(`Searching for school with ID: ${student.school_id}`);
    const school = await School.findOne({ school_id: student.school_id });
    if (!school) {
      console.log('School not found');
      return res.status(404).json({ message: 'School not found' });
    }
    console.log('School found:', school);

    if (school.school_name !== school_name) {
      console.log('School name does not match');
      return res.status(400).json({ message: 'School name does not match the school ID' });
    }

    // Generate a unique tx_ref
    const txRef = uuidv4(); // Generate a unique tx_ref for Flutterwave

    // Create a new payment record with tx_ref
    const newPayment = new Payment({
      student_id: student._id,
      school_id: student.school_id,
      bill_type: Array.isArray(bill_type) ? bill_type : [bill_type],
      student_firstname: student_firstname,
      student_lastname: student_lastname,
      school_name: school.school_name,
      grade_level: grade_level,
      termName: termName,
      amount_due: amount,
      student_email: email,
      payment_method: 'flutterwave',
      status: 'pending',
      tx_ref: txRef, // Save the generated tx_ref in the payment record
      payment_id: uuidv4() // Generate a unique payment ID for internal tracking
    });

    console.log('Saving new payment:', newPayment);
    const savedPayment = await newPayment.save();
    console.log('Payment saved successfully:', savedPayment);

    // Fetch got dynamically
    const got = await fetchGot();

    // Initiate Flutterwave payment
    const response = await got.post('https://api.flutterwave.com/v3/payments', {
      headers: {
        Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      json: {
        tx_ref: txRef,
        amount: amount,
        currency: 'NGN',
        redirect_url: 'http://localhost:3000/payment-success', // Change to your success URL
        meta: {
          consumer_id: 23, // Use actual consumer ID if applicable
          consumer_mac: '92a3-912ba-1192a' // Use actual consumer MAC if applicable
        },
        customer: {
          email: email,
          name: name
        },
        customizations: {
          title: 'School Payments',
          logo: 'http://www.yourschool.com/logo.png' // Change to your logo URL
        }
      },
      responseType: 'json'
    });

    if (response.body.status === 'success') {
      // Send payment link via WhatsApp (Placeholder for actual integration)
      const paymentLink = response.body.data.link; // Extract the payment link
      console.log('Payment link generated:', paymentLink);

      // Example of how you might use an API or service to send the payment link via WhatsApp
      // This is a placeholder and should be replaced with actual implementation
      // sendPaymentLinkViaWhatsApp(paymentLink, email);

      res.json({ message: 'Payment link generated successfully', paymentLink: paymentLink });
    } else {
      // Update payment status to 'failed'
      savedPayment.status = 'failed';
      await savedPayment.save();
      res.status(400).json({ message: 'Payment initiation failed' });
    }
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};



// Controller function to verify payment
exports.verifyPayment = async (req, res) => {
  try {
      const { transaction_id } = req.query;
      const got = await fetchGot();

      const response = await got.get(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
          headers: {
              Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`
          }
      }).json();

      if (response.data.status === "successful") {
          const payment = await Payment.findOneAndUpdate(
              { tx_ref: response.data.tx_ref },
              { status: 'paid', amount_paid: response.data.amount }, // Update amount_paid here
              { new: true }
          );

          if (payment) {
              res.status(200).json(payment);
          } else {
              res.status(404).json({ message: 'Payment not found' });
          }
      } else {
          const payment = await Payment.findOneAndUpdate(
              { tx_ref: response.data.tx_ref },
              { status: response.data.status === "cancelled" ? 'cancelled' : 'failed' },
              { new: true }
          );

          if (payment) {
              res.status(200).json(payment);
          } else {
              res.status(404).json({ message: 'Payment not found' });
          }
      }
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
};



// Webhook handler
exports.handleWebhook = async (req, res) => {
  try {
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
    const hash = crypto.createHmac('sha256', secretHash)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['verif-hash']) {
      return res.status(400).send('Invalid signature');
    }

    const event = req.body;

    if (event.event === 'charge.completed' && event.data.status === 'successful') {
      const payment = await Payment.findOneAndUpdate(
        { tx_ref: event.data.tx_ref },
        { status: 'paid', amount_paid: event.data.amount },
        { new: true }
      );

      if (payment) {
        res.status(200).send('Webhook received');
      } else {
        res.status(404).json({ message: 'Payment not found' });
      }
    } else if (event.event === 'charge.failed' || event.event === 'charge.cancelled') {
      const payment = await Payment.findOneAndUpdate(
        { tx_ref: event.data.tx_ref },
        { status: event.data.status === 'cancelled' ? 'cancelled' : 'failed' },
        { new: true }
      );

      if (payment) {
        res.status(200).send('Webhook received');
      } else {
        res.status(404).json({ message: 'Payment not found' });
      }
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Controller function to get all payments
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find();
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Controller function to update payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { status, amount_paid } = req.body;

    const payment = await Payment.findOneAndUpdate(
      { payment_id: req.params.id }, // Use payment_id for UUID lookup
      { status, amount_paid },
      { new: true }
    );

    if (payment) {
      res.status(200).json(payment);
    } else {
      res.status(404).json({ message: 'Payment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




// Controller function to cancel payment
exports.cancelPayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );

    if (payment) {
      res.status(200).json(payment);
    } else {
      res.status(404).json({ message: 'Payment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Controller function to handle payment success
exports.handlePaymentSuccess = async (req, res) => {
  try {
      // Extract transaction details from the request query parameters
      const { tx_ref, transaction_id, status } = req.query;

      // Check if the payment was successful
      if (status === 'successful') {
          // Perform transaction verification (optional but recommended)
          const transactionDetails = await verifyTransaction(tx_ref, transaction_id);

          // Render payment success page
          return res.render('payment-success', { transactionDetails });
      } else {
          // Handle unsuccessful payment
          return res.render('payment-failure');
      }
  } catch (error) {
      console.error('Error handling payment success:', error);
      // Render error page
      return res.render('error');
  }
};

// Controller function to get payments with population (adjusted for current schema)
exports.getPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('student_id', 'student_firstname student_lastname student_email') // Updated fields
      .populate('school_id', 'school_name') // Ensure these fields are correct
      .exec();

    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Controller function to get a payment by ID with population (adjusted for current schema)
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('student_id', 'student_firstname student_lastname student_email') // Updated fields
      .populate('school_id', 'school_name') // Ensure these fields are correct
      .exec();

    if (payment) {
      res.status(200).json(payment);
    } else {
      res.status(404).json({ message: 'Payment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




// Placeholder function for sending payment link via WhatsApp
const sendPaymentLinkViaWhatsApp = async (paymentLink, email) => {
  try {
    // Define the WhatsApp-enabled Twilio phone number and the recipient phone number
    const from = 'whatsapp:+14155238886'; // Your Twilio WhatsApp number
    const to = `whatsapp:${await getWhatsAppNumberFromEmail(email)}`; // The recipient's WhatsApp number, resolve it from email if necessary

    // Send the message via WhatsApp
    const message = await client.messages.create({
      from: from,
      to: to,
      body: `Hello! Your payment link is: ${paymentLink}. Please complete your payment using this link. Thank you!`
    });

    console.log('Payment link sent successfully:', message.sid);
  } catch (error) {
    console.error('Error sending payment link via WhatsApp:', error);
  }
};

// Function to get WhatsApp number from email (Placeholder)
const getWhatsAppNumberFromEmail = async (email) => {
  // Implement your logic to fetch the WhatsApp number associated with the email
  // This is a placeholder, and you might need to integrate with your user database or another service
  // For demo purposes, return a hardcoded number
  return '+2348123456789'; // Replace with the actual phone number fetching logic
};







// Controller function to initiate PayPal payment
exports.initiatePayPalPayment = async (req, res) => {
  try {
    // Placeholder logic for initiating PayPal payment
    res.status(200).json({ message: 'PayPal payment initiated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
























// Controller function to initiate WhatsApp payment
// Controller function to initiate WhatsApp payment
exports.initiateWhatsAppPayment = async (req, res) => {
  try {
    const { amount, email, grade_level, name, termName, school_name, bill_type } = req.body;

    // Validate input
    if (!amount || !email || !grade_level || !name || !termName || !school_name || !bill_type) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Create payment intent
    const paymentIntent = await whatsapp.createPaymentIntent({
      amount: amount,
      currency: 'USD', // Adjust currency as needed
      description: `Payment for ${bill_type} - ${termName} (${grade_level}) at ${school_name}`,
      metadata: {
        email: email,
        name: name,
        grade_level: grade_level,
        termName: termName,
        school_name: school_name,
        bill_type: bill_type
      }
    });

    // Handle payment callback
    whatsapp.on('payment_callback', (callback) => {
      if (callback.status === 'success') {
        console.log('Payment successful!');
        // You might want to update payment status in your database here
      } else {
        console.log('Payment failed!');
        // Handle payment failure and update status in your database
      }
    });

    res.status(200).json({ message: 'WhatsApp payment initiated', paymentIntent: paymentIntent });
  } catch (error) {
    console.error('Error initiating WhatsApp payment:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

