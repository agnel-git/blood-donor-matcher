const express = require('express');
const Hospital = require('../models/hospital');
const Donor = require('../models/donor');
const { protect, hospitalOnly } = require('../middleware/auth');

const router = express.Router();

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

// Get my hospital profile
router.get('/me', protect, hospitalOnly, async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user._id });
    if (!hospital) return res.status(404).json({ message: 'Profile not found' });
    res.json(hospital);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add blood request
router.post('/request', protect, hospitalOnly, async (req, res) => {
  try {
    const { bloodType, units, urgency } = req.body;
    const hospital = await Hospital.findOne({ userId: req.user._id });

    hospital.bloodRequests.push({ bloodType, units, urgency });
    await hospital.save();

    // Find compatible available donors
    const compatTypes = compatibleDonors[bloodType] || [bloodType];
    const donors = await Donor.find({
      isAvailable: true,
      bloodType: { $in: compatTypes }
    }).select('name phone bloodType location city');

    res.json({ message: 'Request added', request: hospital.bloodRequests.slice(-1)[0], compatibleDonors: donors });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get dashboard stats
router.get('/dashboard', protect, hospitalOnly, async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user._id });

    const totalDonors = await Donor.countDocuments();
    const availableDonors = await Donor.countDocuments({ isAvailable: true });

    // Count by blood type
    const bloodTypeStats = await Donor.aggregate([
      { $match: { isAvailable: true } },
      { $group: { _id: '$bloodType', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const activeRequests = hospital.bloodRequests.filter(r => !r.fulfilled).length;

    res.json({
      totalDonors,
      availableDonors,
      unavailableDonors: totalDonors - availableDonors,
      bloodTypeStats,
      activeRequests,
      requests: hospital.bloodRequests.slice(-10).reverse()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark request as fulfilled
router.patch('/request/:requestId/fulfill', protect, hospitalOnly, async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user._id });
    const request = hospital.bloodRequests.id(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.fulfilled = true;
    await hospital.save();
    res.json({ message: 'Request marked as fulfilled' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Search donors for hospital (with GPS)
router.get('/find-donors', protect, hospitalOnly, async (req, res) => {
  try {
    const { bloodType, lat, lng, maxDistance = 100000 } = req.query;
    const compatTypes = compatibleDonors[bloodType] || [bloodType];

    let donors;
    if (lat && lng) {
      donors = await Donor.find({
        isAvailable: true,
        bloodType: { $in: compatTypes },
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
            $maxDistance: parseInt(maxDistance)
          }
        }
      }).select('name phone bloodType location city age');
    } else {
      donors = await Donor.find({
        isAvailable: true,
        bloodType: { $in: compatTypes }
      }).select('name phone bloodType location city age');
    }

    res.json(donors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;