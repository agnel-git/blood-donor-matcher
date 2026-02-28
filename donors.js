const express = require('express');
const Donor = require('../models/donor');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Blood compatibility map: who can donate to whom
const compatibleDonors = {
  'A+':  ['A+', 'AB+'],
  'A-':  ['A+', 'A-', 'AB+', 'AB-'],
  'B+':  ['B+', 'AB+'],
  'B-':  ['B+', 'B-', 'AB+', 'AB-'],
  'AB+': ['AB+'],
  'AB-': ['AB+', 'AB-'],
  'O+':  ['A+', 'B+', 'AB+', 'O+'],
  'O-':  ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
};

// Get all available donors (with optional blood type filter & GPS proximity)
router.get('/', async (req, res) => {
  try {
    const { bloodType, lat, lng, maxDistance = 50000, available } = req.query;

    let query = {};

    // Filter by availability
    if (available !== undefined) query.isAvailable = available === 'true';

    // Blood type compatibility filter
    if (bloodType) {
      const compatible = compatibleDonors[bloodType] || [bloodType];
      query.bloodType = { $in: compatible };
    }

    let donors;

    // GPS-based proximity search
    if (lat && lng) {
      donors = await Donor.find({
        ...query,
        'location.coordinates': { $exists: true },
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
            $maxDistance: parseInt(maxDistance)
          }
        }
      }).select('-userId');
    } else {
      donors = await Donor.find(query).select('-userId').sort('-createdAt');
    }

    res.json(donors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Toggle availability (donor only)
router.patch('/toggle-availability', protect, async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user._id });
    if (!donor) return res.status(404).json({ message: 'Donor profile not found' });

    donor.isAvailable = !donor.isAvailable;
    donor.updatedAt = Date.now();
    await donor.save();

    res.json({ isAvailable: donor.isAvailable, message: `Status set to ${donor.isAvailable ? 'Available' : 'Unavailable'}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update donor profile/location
router.put('/profile', protect, async (req, res) => {
  try {
    const { phone, city, address, lat, lng, lastDonated, medicalConditions, emergencyContact } = req.body;

    const donor = await Donor.findOneAndUpdate(
      { userId: req.user._id },
      {
        phone, city, address, lastDonated, medicalConditions, emergencyContact,
        'location.coordinates': [parseFloat(lng) || 0, parseFloat(lat) || 0],
        'location.address': address,
        'location.city': city,
        updatedAt: Date.now()
      },
      { new: true }
    );

    res.json(donor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get blood compatibility info
router.get('/compatibility/:bloodType', (req, res) => {
  const { bloodType } = req.params;
  const canDonateTo = compatibleDonors[bloodType] || [];
  
  // Who can donate to this blood type
  const canReceiveFrom = Object.entries(compatibleDonors)
    .filter(([donor, recipients]) => recipients.includes(bloodType))
    .map(([donor]) => donor);

  res.json({
    bloodType,
    canDonateTo,
    canReceiveFrom
  });
});

// Get my donor profile
router.get('/me', protect, async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user._id });
    if (!donor) return res.status(404).json({ message: 'Profile not found' });
    res.json(donor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;