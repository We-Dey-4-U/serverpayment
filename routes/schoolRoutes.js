// Route definitions
const express = require('express');
const { createSchool, getSchools } = require('../controllers/schoolController');
const { authenticate } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/adminMiddleware');

const router = express.Router();

// Route to create a new school, only accessible by admins
router.post('/create', authenticate, isAdmin, createSchool);

// Route to get all schools, accessible by anyone
router.get('/', getSchools);

module.exports = router;