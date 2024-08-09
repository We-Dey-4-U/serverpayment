const School = require('../models/School');

// Create a new school (only admins)
exports.createSchool = async (req, res) => {
  const { school_name, address, contactEmail } = req.body; // Use `school_name` instead of `name`
  try {
    const newSchool = new School({ school_name, address, contactEmail });
    await newSchool.save();
    res.status(201).json({ message: 'School created successfully', school: newSchool });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Retrieve all schools filter
exports.getSchools = async (req, res) => {
  try {
    const schools = await School.find();
    res.json(schools);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};