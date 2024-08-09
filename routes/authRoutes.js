const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
console.log('Loading authRoutes...');
const { authenticate } = require('../middleware/authMiddleware');
console.log('authMiddleware loaded:', authenticate);
const { isAdmin } = require('../middleware/adminMiddleware');
const { isStudent } = require('../middleware/studentMiddleware');

// Admin routes
router.post('/admin/register', authController.registerAdmin);
router.post('/admin/login', authController.login);

// Student routes
router.post('/student/register', authController.registerStudent);
router.post('/student/login', authController.login);

// Protected routes
router.get('/admin/dashboard', authenticate, isAdmin, (req, res) => {
  res.send('Admin dashboard');
});

router.get('/student/dashboard', authenticate, isStudent, (req, res) => {
  res.send('Student dashboard');
});

module.exports = router;