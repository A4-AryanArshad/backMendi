const express = require('express');
const { body, param, query } = require('express-validator');
const { protect, authorize, checkJobAccess, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Job validation rules
const createJobValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Job title must be between 5 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 50, max: 1000 })
    .withMessage('Job description must be between 50 and 1000 characters'),
  body('category')
    .isIn(['bridal', 'party', 'festival', 'corporate', 'traditional', 'modern', 'arabic', 'indian', 'other'])
    .withMessage('Invalid job category'),
  body('eventDetails.eventType')
    .isIn(['wedding', 'engagement', 'birthday', 'festival', 'corporate', 'baby_shower', 'other'])
    .withMessage('Invalid event type'),
  body('eventDetails.eventDate')
    .isISO8601()
    .toDate()
    .custom((value) => {
      if (value <= new Date()) {
        throw new Error('Event date must be in the future');
      }
      return true;
    }),
  body('eventDetails.eventTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Event time must be in HH:MM format'),
  body('eventDetails.duration.estimated')
    .isInt({ min: 1, max: 12 })
    .withMessage('Duration must be between 1 and 12 hours'),
  body('eventDetails.guestCount')
    .isInt({ min: 1, max: 50 })
    .withMessage('Guest count must be between 1 and 50'),
  body('location.address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),
  body('location.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('location.postalCode')
    .trim()
    .notEmpty()
    .withMessage('Postal code is required'),
  body('budget.min')
    .isFloat({ min: 50 })
    .withMessage('Minimum budget must be at least £50'),
  body('budget.max')
    .isFloat({ min: 50 })
    .withMessage('Maximum budget must be at least £50')
    .custom((value, { req }) => {
      if (value <= req.body.budget.min) {
        throw new Error('Maximum budget must be greater than minimum budget');
      }
      return true;
    })
];

const updateJobValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Job title must be between 5 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 50, max: 1000 })
    .withMessage('Job description must be between 50 and 1000 characters'),
  // Add other optional validations as needed
];

// @desc    Get all jobs with filtering, sorting, pagination
// @route   GET /api/jobs
// @access  Public (with optional auth for personalization)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const Job = require('../models/Job');
    const mongoose = require('mongoose');
    
    // Build query
    let query = { status: 'open', visibility: 'public' };
    
    // Filtering
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    if (req.query.city) {
      query['location.city'] = new RegExp(req.query.city, 'i');
    }
    
    if (req.query.minBudget || req.query.maxBudget) {
      query['budget.min'] = {};
      if (req.query.minBudget) query['budget.min'].$gte = parseInt(req.query.minBudget);
      if (req.query.maxBudget) query['budget.max'].$lte = parseInt(req.query.maxBudget);
    }
    
    // Sorting
    let sortBy = { createdAt: -1 };
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'date':
          sortBy = { 'eventDetails.eventDate': 1 };
          break;
        case 'budget':
          sortBy = { 'budget.max': -1 };
          break;
        case 'priority':
          sortBy = { priority: -1, createdAt: -1 };
          break;
      }
    }
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const jobs = await Job.find(query)
      .populate('client', 'firstName lastName location.city')
      .sort(sortBy)
      .limit(limit)
      .skip(skip);
    
    const total = await Job.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: jobs.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: jobs
    });
    
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get single job
// @route   GET /api/jobs/:id
// @access  Public (with optional auth for view tracking)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const Job = require('../models/Job');
    const mongoose = require('mongoose');
    
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    const job = await Job.findById(req.params.id)
      .populate('client', 'firstName lastName location.city profileImage');
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    // Track view if user is authenticated artist
    if (req.user && req.user.userType === 'artist') {
      await job.addView(req.user._id);
    } else {
      await job.addView();
    }
    
    res.status(200).json({
      success: true,
      data: job
    });
    
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Create new job
// @route   POST /api/jobs
// @access  Private (Clients only)
router.post('/', protect, authorize('client'), createJobValidation, async (req, res) => {
  try {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }
    
    const Job = require('../models/Job');
    const mongoose = require('mongoose');
    const Notification = require('../models/Notification');
    
    // Add client to job data
    const jobData = {
      ...req.body,
      client: req.user._id
    };
    
    const job = await Job.create(jobData);
    
    // Populate the job with client details for notifications
    await job.populate('client', 'firstName lastName');
    
    // Notify all artists about the new job
    try {
      await Notification.notifyArtistsOfNewJob(job);
      console.log(`Successfully notified artists about new job: ${job.title}`);
    } catch (notificationError) {
      console.error('Error sending notifications:', notificationError);
      // Don't fail the job creation if notifications fail
    }
    
    res.status(201).json({
      success: true,
      data: job,
      message: 'Job created successfully and artists have been notified'
    });
    
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating job'
    });
  }
});

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private (Job owner only)
router.put('/:id', protect, checkJobAccess, updateJobValidation, async (req, res) => {
  try {
    if (!req.isJobOwner) {
      return res.status(403).json({
        success: false,
        message: 'Only job owner can update the job'
      });
    }
    
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }
    
    const Job = require('../models/Job');
    const mongoose = require('mongoose');
    
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    res.status(200).json({
      success: true,
      data: job
    });
    
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating job'
    });
  }
});

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private (Job owner only)
router.delete('/:id', protect, checkJobAccess, async (req, res) => {
  try {
    if (!req.isJobOwner) {
      return res.status(403).json({
        success: false,
        message: 'Only job owner can delete the job'
      });
    }
    
    const Job = require('../models/Job');
    const mongoose = require('mongoose');
    
    await Job.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Job deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting job'
    });
  }
});

// @desc    Get jobs by client
// @route   GET /api/jobs/client/me
// @access  Private (Clients only)
router.get('/client/me', protect, authorize('client'), async (req, res) => {
  try {
    console.log('=== GET CLIENT JOBS DEBUG ===');
    console.log('1. Client ID:', req.user._id);
    console.log('2. User type:', req.user.userType);
    
    const Job = require('../models/Job');
    const mongoose = require('mongoose');
    
    const jobs = await Job.find({ client: req.user._id })
      .populate('assignedArtist', 'firstName lastName artistProfile.businessName')
      .sort({ createdAt: -1 });
    
    console.log('3. Found jobs count:', jobs.length);
    console.log('4. Job titles:', jobs.map(job => job.title));
    console.log('5. Job IDs:', jobs.map(job => job._id));
    
    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs
    });
    
  } catch (error) {
    console.error('Get client jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Assign artist to job
// @route   PUT /api/jobs/:id/assign
// @access  Private (Job owner only)
router.put('/:id/assign', protect, checkJobAccess, async (req, res) => {
  try {
    if (!req.isJobOwner) {
      return res.status(403).json({
        success: false,
        message: 'Only job owner can assign artist'
      });
    }
    
    const Job = require('../models/Job');
    const mongoose = require('mongoose');
    const Proposal = require('../models/Proposal');
    
    const { proposalId } = req.body;
    
    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }
    
    // Update job
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      {
        status: 'assigned',
        assignedArtist: proposal.artist,
        selectedProposal: proposalId,
        'applications.acceptingApplications': false
      },
      { new: true }
    );
    
    // Update proposal status
    await Proposal.findByIdAndUpdate(proposalId, { status: 'accepted' });
    
    // Decline other proposals
    await Proposal.updateMany(
      { job: req.params.id, _id: { $ne: proposalId } },
      { status: 'declined' }
    );
    
    res.status(200).json({
      success: true,
      data: job
    });
    
  } catch (error) {
    console.error('Assign artist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error assigning artist'
    });
  }
});

module.exports = router; 