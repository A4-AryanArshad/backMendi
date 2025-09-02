const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Review participants
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reviewer is required']
  },
  reviewee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reviewee (artist) is required']
  },
  
  // Related job and proposal
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: [true, 'Job reference is required']
  },
  proposal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal'
  },
  
  // Review content
  rating: {
    overall: {
      type: Number,
      required: [true, 'Overall rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    },
    breakdown: {
      quality: {
        type: Number,
        min: 1,
        max: 5
      },
      punctuality: {
        type: Number,
        min: 1,
        max: 5
      },
      professionalism: {
        type: Number,
        min: 1,
        max: 5
      },
      communication: {
        type: Number,
        min: 1,
        max: 5
      },
      valueForMoney: {
        type: Number,
        min: 1,
        max: 5
      },
      creativity: {
        type: Number,
        min: 1,
        max: 5
      }
    }
  },
  
  // Written review
  title: {
    type: String,
    maxlength: [100, 'Review title cannot exceed 100 characters'],
    trim: true
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    minlength: [10, 'Review comment must be at least 10 characters'],
    maxlength: [1000, 'Review comment cannot exceed 1000 characters']
  },
  
  // Review media
  images: [{
    url: String,
    description: String,
    isBeforePhoto: Boolean,
    isAfterPhoto: Boolean,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Review experience details
  experience: {
    wouldRecommend: {
      type: Boolean,
      required: [true, 'Recommendation status is required']
    },
    wouldHireAgain: {
      type: Boolean,
      required: [true, 'Hire again status is required']
    },
    designSatisfaction: {
      type: String,
      enum: ['very_unsatisfied', 'unsatisfied', 'neutral', 'satisfied', 'very_satisfied'],
      required: true
    },
    serviceHighlights: [{
      type: String,
      enum: ['punctual', 'professional', 'creative', 'friendly', 'skilled', 'clean', 'organized', 'flexible', 'communicative', 'efficient']
    }],
    areasForImprovement: [{
      type: String,
      enum: ['punctuality', 'communication', 'design_quality', 'professionalism', 'cleanliness', 'efficiency', 'creativity']
    }]
  },
  
  // Event details from client perspective
  eventDetails: {
    actualDuration: {
      value: Number,
      unit: {
        type: String,
        enum: ['minutes', 'hours'],
        default: 'hours'
      }
    },
    peopleServed: Number,
    designComplexity: {
      type: String,
      enum: ['simple', 'medium', 'complex']
    },
    specialRequests: [{
      request: String,
      fulfilled: Boolean
    }]
  },
  
  // Review status and moderation
  status: {
    type: String,
    enum: ['draft', 'submitted', 'published', 'flagged', 'removed', 'hidden'],
    default: 'submitted'
  },
  
  // Moderation
  moderation: {
    isModerated: {
      type: Boolean,
      default: false
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    moderatedAt: Date,
    moderationNotes: String,
    flags: [{
      type: {
        type: String,
        enum: ['inappropriate', 'fake', 'spam', 'harassment', 'copyright']
      },
      reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reportedAt: {
        type: Date,
        default: Date.now
      },
      reason: String,
      status: {
        type: String,
        enum: ['pending', 'reviewed', 'dismissed', 'upheld'],
        default: 'pending'
      }
    }]
  },
  
  // Review visibility
  visibility: {
    type: String,
    enum: ['public', 'private', 'artist_only'],
    default: 'public'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationMethod: {
    type: String,
    enum: ['booking_confirmed', 'payment_verified', 'manual_verification']
  },
  
  // Review interactions
  helpfulVotes: {
    helpful: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      votedAt: {
        type: Date,
        default: Date.now
      }
    }],
    notHelpful: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      votedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Artist response
  artistResponse: {
    message: {
      type: String,
      maxlength: [500, 'Artist response cannot exceed 500 characters']
    },
    respondedAt: Date,
    isPublic: {
      type: Boolean,
      default: true
    }
  },
  
  // Review metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    deviceInfo: String,
    location: {
      country: String,
      city: String
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: Date,
    editHistory: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
      editedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Quality indicators
  qualityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  isHighQuality: {
    type: Boolean,
    default: false
  },
  
  // Featured review
  isFeatured: {
    type: Boolean,
    default: false
  },
  featuredReason: String,
  featuredUntil: Date,
  
  // Review analytics
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    engagement: {
      clicks: Number,
      timeSpent: Number // seconds
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
reviewSchema.index({ reviewer: 1 });
reviewSchema.index({ reviewee: 1 });
reviewSchema.index({ job: 1 });
reviewSchema.index({ 'rating.overall': -1 });
reviewSchema.index({ status: 1 });
reviewSchema.index({ createdAt: -1 });

// Compound indexes
reviewSchema.index({ reviewee: 1, status: 1, 'rating.overall': -1 });
reviewSchema.index({ reviewee: 1, visibility: 1 });

// Unique constraint to prevent duplicate reviews
reviewSchema.index({ reviewer: 1, job: 1 }, { unique: true });

// Virtual for helpful votes count
reviewSchema.virtual('helpfulVotesCount').get(function() {
  return {
    helpful: this.helpfulVotes.helpful.length,
    notHelpful: this.helpfulVotes.notHelpful.length,
    total: this.helpfulVotes.helpful.length + this.helpfulVotes.notHelpful.length
  };
});

// Virtual for review age
reviewSchema.virtual('ageInDays').get(function() {
  const now = new Date();
  const created = this.createdAt;
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
});

// Virtual for average breakdown rating
reviewSchema.virtual('averageBreakdownRating').get(function() {
  const breakdown = this.rating.breakdown;
  const ratings = Object.values(breakdown).filter(rating => rating && typeof rating === 'number');
  
  if (ratings.length === 0) return 0;
  
  const sum = ratings.reduce((total, rating) => total + rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal
});

// Virtual for review completeness score
reviewSchema.virtual('completenessScore').get(function() {
  let score = 0;
  
  // Base rating (30%)
  if (this.rating.overall) score += 30;
  
  // Comment quality (25%)
  if (this.comment && this.comment.length >= 50) score += 25;
  else if (this.comment && this.comment.length >= 20) score += 15;
  else if (this.comment) score += 10;
  
  // Breakdown ratings (20%)
  const breakdownCount = Object.values(this.rating.breakdown).filter(r => r).length;
  score += Math.min(20, breakdownCount * 3);
  
  // Images (15%)
  if (this.images && this.images.length >= 3) score += 15;
  else if (this.images && this.images.length >= 1) score += 10;
  
  // Experience details (10%)
  if (this.experience.wouldRecommend !== undefined && 
      this.experience.wouldHireAgain !== undefined) score += 10;
  
  return Math.min(100, score);
});

// Pre-save middleware
reviewSchema.pre('save', function(next) {
  // Calculate quality score
  this.qualityScore = this.completenessScore;
  this.isHighQuality = this.qualityScore >= 80;
  
  // Auto-verify if from confirmed booking
  if (this.verificationMethod === 'booking_confirmed') {
    this.isVerified = true;
  }
  
  // Auto-publish if high quality and verified
  if (this.isHighQuality && this.isVerified && this.status === 'submitted') {
    this.status = 'published';
  }
  
  next();
});

// Post-save middleware to update artist rating
reviewSchema.post('save', async function(doc) {
  if (doc.status === 'published') {
    try {
      await updateArtistRating(doc.reviewee);
    } catch (error) {
      console.error('Error updating artist rating:', error);
    }
  }
});

// Post-remove middleware to update artist rating
reviewSchema.post('remove', async function(doc) {
  try {
    await updateArtistRating(doc.reviewee);
  } catch (error) {
    console.error('Error updating artist rating after removal:', error);
  }
});

// Function to update artist's overall rating
async function updateArtistRating(artistId) {
  const Review = mongoose.model('Review');
  const User = mongoose.model('User');
  
  const stats = await Review.aggregate([
    {
      $match: {
        reviewee: artistId,
        status: 'published'
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating.overall' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);
  
  const artist = await User.findById(artistId);
  if (artist && stats.length > 0) {
    artist.artistProfile.rating.average = Math.round(stats[0].averageRating * 10) / 10;
    artist.artistProfile.rating.count = stats[0].totalReviews;
    await artist.save();
  }
}

// Static method to find reviews for an artist
reviewSchema.statics.findForArtist = function(artistId, options = {}) {
  const {
    status = 'published',
    limit = 10,
    skip = 0,
    sort = { createdAt: -1 }
  } = options;
  
  return this.find({
    reviewee: artistId,
    status: status,
    visibility: { $ne: 'private' }
  })
  .populate('reviewer', 'firstName lastName profileImage')
  .populate('job', 'title eventDetails.eventType eventDetails.eventDate')
  .sort(sort)
  .limit(limit)
  .skip(skip);
};

// Static method to get review statistics for an artist
reviewSchema.statics.getArtistStats = function(artistId) {
  return this.aggregate([
    {
      $match: {
        reviewee: mongoose.Types.ObjectId(artistId),
        status: 'published'
      }
    },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating.overall' },
        ratingDistribution: {
          $push: '$rating.overall'
        },
        recommendationRate: {
          $avg: {
            $cond: [{ $eq: ['$experience.wouldRecommend', true] }, 1, 0]
          }
        },
        averageBreakdown: {
          $avg: {
            $avg: [
              '$rating.breakdown.quality',
              '$rating.breakdown.punctuality',
              '$rating.breakdown.professionalism',
              '$rating.breakdown.communication',
              '$rating.breakdown.valueForMoney',
              '$rating.breakdown.creativity'
            ]
          }
        }
      }
    },
    {
      $addFields: {
        ratingCounts: {
          $reduce: {
            input: [1, 2, 3, 4, 5],
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: [[
                    { k: { $toString: '$$this' } },
                    { v: {
                      $size: {
                        $filter: {
                          input: '$ratingDistribution',
                          cond: { $eq: ['$$item', '$$this'] }
                        }
                      }
                    }}
                  ]]
                }
              ]
            }
          }
        }
      }
    }
  ]);
};

// Method to vote helpful
reviewSchema.methods.voteHelpful = function(userId, isHelpful = true) {
  // Remove any existing vote from this user
  this.helpfulVotes.helpful = this.helpfulVotes.helpful.filter(
    vote => vote.user.toString() !== userId.toString()
  );
  this.helpfulVotes.notHelpful = this.helpfulVotes.notHelpful.filter(
    vote => vote.user.toString() !== userId.toString()
  );
  
  // Add new vote
  if (isHelpful) {
    this.helpfulVotes.helpful.push({ user: userId });
  } else {
    this.helpfulVotes.notHelpful.push({ user: userId });
  }
  
  return this.save();
};

// Method to add artist response
reviewSchema.methods.addArtistResponse = function(message, isPublic = true) {
  this.artistResponse = {
    message: message,
    respondedAt: new Date(),
    isPublic: isPublic
  };
  
  return this.save();
};

// Method to flag review
reviewSchema.methods.flag = function(reportedBy, flagType, reason) {
  this.moderation.flags.push({
    type: flagType,
    reportedBy: reportedBy,
    reason: reason,
    reportedAt: new Date()
  });
  
  if (this.status === 'published') {
    this.status = 'flagged';
  }
  
  return this.save();
};

// Method to moderate review
reviewSchema.methods.moderate = function(moderatorId, action, notes = '') {
  this.moderation.isModerated = true;
  this.moderation.moderatedBy = moderatorId;
  this.moderation.moderatedAt = new Date();
  this.moderation.moderationNotes = notes;
  
  switch (action) {
    case 'approve':
      this.status = 'published';
      break;
    case 'reject':
      this.status = 'removed';
      break;
    case 'hide':
      this.status = 'hidden';
      break;
  }
  
  return this.save();
};

module.exports = mongoose.model('Review', reviewSchema); 