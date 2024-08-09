const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Define routes
router.post('/initiate-flutterwave-payment', paymentController.initiateFlutterwavePayment);
router.post('/webhook', paymentController.handleWebhook);
// Route to verify a payment (updated to use a query parameter)
router.get('/verify', paymentController.verifyPayment);
router.get('/payments', paymentController.getAllPayments);
router.get('/payments/:id', paymentController.getPaymentById);
router.put('/payments/:id/status', paymentController.updatePaymentStatus);
router.put('/payments/:id/cancel', paymentController.cancelPayment);
router.get('/payment-success', paymentController.handlePaymentSuccess);
router.post('/initiate-paypal-payment', paymentController.initiatePayPalPayment);
router.post('/initiate-whatsapp-payment', paymentController.initiateWhatsAppPayment);

module.exports = router;