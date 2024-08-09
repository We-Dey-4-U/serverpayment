const express = require('express');
const router = express.Router();
const { verifyPayment } = require('../controllers/paymentController');

// Define the route for handling payment success
router.get('/payment-success', async (req, res) => {
    try {
        await verifyPayment(req, res);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;