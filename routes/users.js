const express = require('express');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all artists with filtering
// @route   GET /api/users/artists
// @access  Public
router.get('/artists', optionalAuth, async (req, res) => {
  try {
    const User = require('../models/User');
    
    let query = { 
      userType: 'artist', 
      isActive: true,
      'artistProfile.isVerified': true 
    };
    
    // Filtering
    if (req.query.specialty) {
      query['artistProfile.specialties'] = req.query.specialty;
    }
    
    if (req.query.city) {
      query['location.city'] = new RegExp(req.query.city, 'i');
    }
    
    if (req.query.minRating) {
      query['artistProfile.rating.average'] = { $gte: parseFloat(req.query.minRating) };
    }
    
    // Sorting
    let sortBy = { 'artistProfile.rating.average': -1 };
    if (req.query.sort === 'experience') {
      sortBy = { 'artistProfile.experience': -1 };
    } else if (req.query.sort === 'newest') {
      sortBy = { createdAt: -1 };
    }
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    
    const artists = await User.find(query)
      .select('firstName lastName artistProfile location profileImage')
      .sort(sortBy)
      .limit(limit)
      .skip(skip);
    
    const total = await User.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: artists.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: artists
    });
    
  } catch (error) {
    console.error('Get artists error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get artist profile
// @route   GET /api/users/artist/:id
// @access  Public
router.get('/artist/:id', async (req, res) => {
  try {
    const User = require('../models/User');
    
    const artist = await User.findById(req.params.id)
      .select('-password -emailVerificationToken -passwordResetToken');
    
    if (!artist || artist.userType !== 'artist') {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: artist
    });
    
  } catch (error) {
    console.error('Get artist profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 