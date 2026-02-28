const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Donor = require('../models/donor');
const Hospital = require('../models/hospital');
const { protect } = require('../middleware/auth');

const router = express.Router();

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, bloodType, age, address, city, lat, lng } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password, role });

    // Create profile based on role
    if (role === 'donor') {
      await Donor.create({
        userId: user._id,
        name, email, phone,
        bloodType, age: parseInt(age),
        location: {
          coordinates: [parseFloat(lng) || 0, parseFloat(lat) || 0],
          address, city
        }
      });
    } else if (role === 'hospital') {
      await Hospital.create({
        userId: user._id,
        name, email, phone, address, city,
        location: {
          coordinates: [parseFloat(lng) || 0, parseFloat(lat) || 0]
        }
      });
    }

    res.status(201).json({
      token: generateToken(user._id),
      user: { id: user._id, name, email, role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      token: generateToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user
router.get('/me', protect, async (req, res) => {
  try {
    let profile = null;
    if (req.user.role === 'donor') {
      profile = await Donor.findOne({ userId: req.user._id });
    } else {
      profile = await Hospital.findOne({ userId: req.user._id });
    }
    res.json({ user: req.user, profile });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;