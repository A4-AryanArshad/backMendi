const express = require('express');
const { body, param, query } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Proposal validation rules
const createProposalValidation = [
  body('message')
    .trim()
    .isLength({ min: 50, max: 1000 })
    .withMessage('Proposal message must be between 50 and 1000 characters'),
  body('pricing.totalPrice')
    .isNumeric()
    .isFloat({ min: 10 })
    .withMessage('Total price must be at least £10'),
  body('timeline.estimatedDuration.value')
    .isNumeric()
    .isFloat({ min: 1 })
    .withMessage('Estimated duration must be at least 1 hour'),
  body('experience.yearsOfExperience')
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Years of experience must be a positive number')
];

// @desc    Create new proposal
// @route   POST /api/proposals
// @access  Private (Artists only)
router.post('/', protect, authorize('artist'), createProposalValidation, async (req, res) => {
  try {
    console.log('=== BACKEND PROPOSAL DEBUG ===');
    console.log('1. Request body:', JSON.stringify(req.body, null, 2));
    console.log('2. User:', req.user ? { id: req.user._id, userType: req.user.userType } : 'No user');
    
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      console.log('3. Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const Proposal = require('../models/Proposal');
    const Job = require('../models/Job');
    
    const { jobId, message, pricing, timeline, experience, coverLetter, terms } = req.body;
    
    // Check if job exists and is accepting applications
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    if (job.status !== 'open' || !job.applications.acceptingApplications) {
      return res.status(400).json({
        success: false,
        message: 'This job is no longer accepting applications'
      });
    }
    
    // Check if artist already submitted a proposal
    const existingProposal = await Proposal.findOne({
      job: jobId,
      artist: req.user._id
    });
    
    if (existingProposal) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a proposal for this job'
      });
    }
    
    // Create proposal
    const proposal = new Proposal({
      job: jobId,
      artist: req.user._id,
      message,
      pricing: {
        totalPrice: pricing.totalPrice,
        currency: pricing.currency || 'GBP'
      },
      timeline: {
        estimatedDuration: {
          value: timeline.estimatedDuration.value,
          unit: timeline.estimatedDuration.unit || 'hours'
        }
      },
      experience: {
        yearsOfExperience: experience?.yearsOfExperience || 0,
        relevantExperience: experience?.relevantExperience || ''
      },
      coverLetter: coverLetter || '',
      terms: {
        paymentTerms: terms?.paymentTerms || '',
        cancellationPolicy: terms?.cancellationPolicy || '',
        additionalNotes: terms?.additionalNotes || ''
      }
    });
    
    await proposal.save();
    
    // Add proposal reference to job
    job.applications.received.push(proposal._id);
    await job.save();
    
    // Populate proposal before returning
    await proposal.populate('artist', 'firstName lastName profileImage location.city');
    await proposal.populate('job', 'title eventDetails.eventDate location.city budget');
    
    res.status(201).json({
      success: true,
      message: 'Proposal submitted successfully',
      data: proposal
    });
    
  } catch (error) {
    console.error('Create proposal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get proposals for an artist
// @route   GET /api/proposals/my-proposals
// @access  Private (Artists only)
router.get('/my-proposals', protect, authorize('artist'), async (req, res) => {
  try {
    console.log('=== GET MY PROPOSALS DEBUG ===');
    console.log('1. Artist ID:', req.user ? req.user._id : 'NO USER');
    console.log('2. User type:', req.user ? req.user.userType : 'NO USER TYPE');
    console.log('3. Query params:', req.query);
    
    const Proposal = require('../models/Proposal');
    
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { artist: req.user._id };
    if (status) {
      query.status = status;
    }
    
    console.log('3. Database query:', query);
    const skip = (page - 1) * limit;
    
    const proposals = await Proposal.find(query)
      .populate({
        path: 'job',
        select: 'title eventDetails.eventDate location.city budget status client',
        populate: {
          path: 'client',
          select: 'firstName lastName'
        }
      })
      .sort({ submittedAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await Proposal.countDocuments(query);
    
    console.log('4. Found proposals count:', proposals.length);
    console.log('5. Total proposals in DB:', total);
    console.log('6. Sample proposal:', proposals[0] ? JSON.stringify(proposals[0], null, 2) : 'No proposals found');
    
    res.status(200).json({
      success: true,
      count: proposals.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: proposals
    });
    
  } catch (error) {
    console.error('Get artist proposals error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get proposals for a job
// @route   GET /api/proposals/job/:jobId
// @access  Private (Job owner only)
router.get('/job/:jobId', protect, async (req, res) => {
  try {
    const Job = require('../models/Job');
    const Proposal = require('../models/Proposal');
    
    // Check if user owns the job
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    if (job.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const { status, page = 1, limit = 10 } = req.query;
    
    const proposals = await Proposal.getJobProposals(req.params.jobId, {
      status,
      limit: parseInt(limit)
    });
    
    res.status(200).json({
      success: true,
      count: proposals.length,
      data: proposals
    });
    
  } catch (error) {
    console.error('Get job proposals error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get single proposal
// @route   GET /api/proposals/:id
// @access  Private (Proposal owner or job owner)
router.get('/:id', protect, async (req, res) => {
  try {
    const Proposal = require('../models/Proposal');
    
    const proposal = await Proposal.findById(req.params.id)
      .populate('artist', 'firstName lastName profileImage location.city')
      .populate('job', 'title eventDetails.eventDate location.city budget client');
    
    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }
    
    // Check access rights
    const isArtist = proposal.artist._id.toString() === req.user._id.toString();
    const isJobOwner = proposal.job.client.toString() === req.user._id.toString();
    
    if (!isArtist && !isJobOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.status(200).json({
      success: true,
      data: proposal
    });
    
  } catch (error) {
    console.error('Get proposal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update proposal
// @route   PUT /api/proposals/:id
// @access  Private (Proposal owner only)
router.put('/:id', protect, authorize('artist'), createProposalValidation, async (req, res) => {
  try {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const Proposal = require('../models/Proposal');
    
    const proposal = await Proposal.findById(req.params.id);
    
    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }
    
    // Check ownership
    if (proposal.artist.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Only allow updates for pending proposals
    if (proposal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update proposal after it has been reviewed'
      });
    }
    
    const { message, pricing, timeline, experience, coverLetter, terms } = req.body;
    
    // Update proposal
    proposal.message = message;
    proposal.pricing.totalPrice = pricing.totalPrice;
    proposal.pricing.currency = pricing.currency || 'GBP';
    proposal.timeline.estimatedDuration.value = timeline.estimatedDuration.value;
    proposal.timeline.estimatedDuration.unit = timeline.estimatedDuration.unit || 'hours';
    proposal.experience.yearsOfExperience = experience?.yearsOfExperience || 0;
    proposal.experience.relevantExperience = experience?.relevantExperience || '';
    proposal.coverLetter = coverLetter || '';
    proposal.terms.paymentTerms = terms?.paymentTerms || '';
    proposal.terms.cancellationPolicy = terms?.cancellationPolicy || '';
    proposal.terms.additionalNotes = terms?.additionalNotes || '';
    
    await proposal.save();
    
    await proposal.populate('artist', 'firstName lastName profileImage location.city');
    await proposal.populate('job', 'title eventDetails.eventDate location.city budget');
    
    res.status(200).json({
      success: true,
      message: 'Proposal updated successfully',
      data: proposal
    });
    
  } catch (error) {
    console.error('Update proposal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Accept proposal
// @route   PUT /api/proposals/:id/accept
// @access  Private (Job owner only)
router.put('/:id/accept', protect, authorize('client'), async (req, res) => {
  try {
    const Proposal = require('../models/Proposal');
    const Job = require('../models/Job');
    
    const proposal = await Proposal.findById(req.params.id)
      .populate('job', 'client')
      .populate('artist', 'firstName lastName');
    
    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }
    
    // Check if user owns the job
    if (proposal.job.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    if (proposal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Proposal has already been reviewed'
      });
    }
    
    // Accept the proposal
    await proposal.accept(req.user._id);
    
    // Update job status
    const job = await Job.findById(proposal.job._id);
    job.assignedArtist = proposal.artist._id;
    job.selectedProposal = proposal._id;
    job.status = 'assigned';
    await job.save();
    
    res.status(200).json({
      success: true,
      message: 'Proposal accepted successfully',
      data: proposal
    });
    
  } catch (error) {
    console.error('Accept proposal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Reject proposal
// @route   PUT /api/proposals/:id/reject
// @access  Private (Job owner only)
router.put('/:id/reject', protect, authorize('client'), async (req, res) => {
  try {
    const Proposal = require('../models/Proposal');
    
    const proposal = await Proposal.findById(req.params.id)
      .populate('job', 'client');
    
    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }
    
    // Check if user owns the job
    if (proposal.job.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    if (proposal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Proposal has already been reviewed'
      });
    }
    
    const { message } = req.body;
    
    // Reject the proposal
    await proposal.reject(req.user._id, message || '');
    
    res.status(200).json({
      success: true,
      message: 'Proposal rejected',
      data: proposal
    });
    
  } catch (error) {
    console.error('Reject proposal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Withdraw proposal
// @route   PUT /api/proposals/:id/withdraw
// @access  Private (Proposal owner only)
router.put('/:id/withdraw', protect, authorize('artist'), async (req, res) => {
  try {
    const Proposal = require('../models/Proposal');
    
    const proposal = await Proposal.findById(req.params.id);
    
    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }
    
    // Check ownership
    if (proposal.artist.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    if (proposal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot withdraw proposal after it has been reviewed'
      });
    }
    
    proposal.status = 'withdrawn';
    await proposal.save();
    
    res.status(200).json({
      success: true,
      message: 'Proposal withdrawn successfully',
      data: proposal
    });
    
  } catch (error) {
    console.error('Withdraw proposal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get proposal statistics for artist
// @route   GET /api/proposals/stats
// @access  Private (Artists only)
router.get('/stats', protect, authorize('artist'), async (req, res) => {
  try {
    const Proposal = require('../models/Proposal');
    
    const stats = await Proposal.getArtistStats(req.user._id);
    
    res.status(200).json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Get proposal stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 