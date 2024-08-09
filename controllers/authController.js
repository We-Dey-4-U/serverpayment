const Admin = require('../models/Admin');
const Student = require('../models/Student');
const School = require('../models/School');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Function to register a new admin
exports.registerAdmin = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({
      name,
      email,
      password: hashedPassword,
    });

    await newAdmin.save();

    res.status(201).json({ message: 'Admin registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error registering admin' });
  }
};

// Function to register a new student
exports.registerStudent = async (req, res) => {
  const { firstname, lastname, student_email, password, school_name } = req.body;

  try {
    // Check if the school exists by name
    const school = await School.findOne({ school_name });

    if (!school) {
      return res.status(400).json({ error: 'Invalid school name' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newStudent = new Student({
      firstname,
      lastname,
      student_email,
      password: hashedPassword,
      school_id: school.school_id,
      school_name: school.school_name
    });

    await newStudent.save();

    res.status(201).json({ message: 'Student registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error registering student' });
  }
};

// Function to handle login for both Admin and Student
exports.login = async (req, res) => {
    const { email, password } = req.body;
  
    try {
      let user = await Admin.findOne({ email });
      if (!user) {
        user = await Student.findOne({ student_email: email });
      }
  
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
  
      const isMatch = await bcrypt.compare(password, user.password);
  
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
  
  
      const token = jwt.sign(
        { id: user._id, role: user.constructor.modelName }, // Ensure role is correct
        process.env.JWT_SECRET,
        { expiresIn: '1y' }
      );
  
      res.json({ token });
    } catch (error) {
      res.status(500).json({ error: 'Error logging in' });
    }
  };