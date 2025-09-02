const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  // Associated Job and Artist
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: [true, 'Job reference is required']
  },
  artist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Artist reference is required']
  },
  
  // Proposal Details
  message: {
    type: String,
    required: [true, 'Proposal message is required'],
    minlength: [50, 'Proposal message must be at least 50 characters'],
    maxlength: [1000, 'Proposal message must not exceed 1000 characters']
  },
  
  // Pricing Information
  pricing: {
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [10, 'Total price must be at least £10']
    },
    currency: {
      type: String,
      default: 'GBP',
      enum: ['GBP', 'EUR', 'USD']
    },
    breakdown: {
      basePrice: Number,
      additionalCharges: [{
        description: String,
        amount: Number
      }]
    }
  },
  
  // Timeline and Availability
  timeline: {
    estimatedDuration: {
      value: {
        type: Number,
        required: [true, 'Estimated duration is required'],
        min: [1, 'Duration must be at least 1 hour']
      },
      unit: {
        type: String,
        default: 'hours',
        enum: ['hours', 'days']
      }
    },
    availability: {
      canStartDate: Date,
      flexibleTiming: {
        type: Boolean,
        default: true
      }
    }
  },
  
  // Artist Experience and Qualifications
  experience: {
    yearsOfExperience: {
      type: Number,
      min: 0
    },
    relevantExperience: String,
    specializations: [String],
    previousWork: [{
      description: String,
      imageUrl: String
    }]
  },
  
  // Proposal Status and Management
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
    default: 'pending'
  },
  
  // Client Response
  clientResponse: {
    message: String,
    respondedAt: Date,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Proposal Metadata
  submittedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Additional Information
  coverLetter: String,
  portfolio: [{
    title: String,
    description: String,
    imageUrl: String,
    completedDate: Date
  }],
  
  // Terms and Conditions
  terms: {
    paymentTerms: String,
    cancellationPolicy: String,
    additionalNotes: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
proposalSchema.index({ job: 1, artist: 1 }, { unique: true }); // One proposal per artist per job
proposalSchema.index({ artist: 1, status: 1 });
proposalSchema.index({ job: 1, status: 1 });
proposalSchema.index({ submittedAt: -1 });

// Virtual for formatted pricing
proposalSchema.virtual('formattedPrice').get(function() {
  return `${this.pricing.currency} ${this.pricing.totalPrice}`;
});

// Virtual for time since submission
proposalSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const submitted = new Date(this.submittedAt);
  const diffInHours = Math.floor((now - submitted) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
});

// Pre-save middleware
proposalSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get proposal stats for an artist
proposalSchema.statics.getArtistStats = async function(artistId) {
  const stats = await this.aggregate([
    { $match: { artist: mongoose.Types.ObjectId(artistId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result = {
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    withdrawn: 0
  };
  
  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });
  
  return result;
};

// Static method to get proposals for a job
proposalSchema.statics.getJobProposals = async function(jobId, options = {}) {
  const query = this.find({ job: jobId })
    .populate('artist', 'firstName lastName profileImage location.city')
    .sort({ submittedAt: -1 });
  
  if (options.status) {
    query.where('status', options.status);
  }
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  return query.exec();
};

// Instance method to accept proposal
proposalSchema.methods.accept = async function(clientId) {
  // Reject all other proposals for this job
  await this.constructor.updateMany(
    { job: this.job, _id: { $ne: this._id } },
    { 
      status: 'rejected',
      'clientResponse.message': 'Another proposal was selected',
      'clientResponse.respondedAt': new Date(),
      'clientResponse.respondedBy': clientId
    }
  );
  
  // Accept this proposal
  this.status = 'accepted';
  this.clientResponse.respondedAt = new Date();
  this.clientResponse.respondedBy = clientId;
  
  return this.save();
};

// Instance method to reject proposal
proposalSchema.methods.reject = async function(clientId, message = '') {
  this.status = 'rejected';
  this.clientResponse.message = message;
  this.clientResponse.respondedAt = new Date();
  this.clientResponse.respondedBy = clientId;
  
  return this.save();
};

const Proposal = mongoose.model('Proposal', proposalSchema);

module.exports = Proposal; 