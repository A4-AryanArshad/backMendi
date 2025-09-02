const express = require('express');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Create review
// @route   POST /api/reviews
// @access  Private (Clients only)
router.post('/', protect, authorize('client'), async (req, res) => {
  try {
    const Review = require('../models/Review');
    const Job = require('../models/Job');
    
    const { jobId, rating, title, comment, images, experience } = req.body;
    
    // Verify job exists and user is the client
    const job = await Job.findById(jobId);
    if (!job || job.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to review this job'
      });
    }
    
    // Check if job is completed
    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only review completed jobs'
      });
    }
    
    const review = await Review.create({
      reviewer: req.user._id,
      reviewee: job.assignedArtist,
      job: jobId,
      proposal: job.selectedProposal,
      rating,
      title,
      comment,
      images,
      experience
    });
    
    res.status(201).json({
      success: true,
      data: review
    });
    
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating review'
    });
  }
});

// @desc    Get reviews for artist
// @route   GET /api/reviews/artist/:artistId
// @access  Public
router.get('/artist/:artistId', async (req, res) => {
  try {
    const Review = require('../models/Review');
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const reviews = await Review.findForArtist(req.params.artistId, {
      limit,
      skip: (page - 1) * limit
    });
    
    const stats = await Review.getArtistStats(req.params.artistId);
    
    res.status(200).json({
      success: true,
      count: reviews.length,
      stats: stats[0] || {},
      data: reviews
    });
    
  } catch (error) {
    console.error('Get artist reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 