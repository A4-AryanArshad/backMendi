const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  // Basic Job Information
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [100, 'Job title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    maxlength: [1000, 'Job description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Job category is required'],
    enum: ['bridal', 'party', 'festival', 'corporate', 'traditional', 'modern', 'arabic', 'indian', 'other']
  },
  
  // Client Information
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Client is required']
  },
  
  // Event Details
  eventDetails: {
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      enum: ['wedding', 'engagement', 'birthday', 'festival', 'corporate', 'baby_shower', 'other']
    },
    eventDate: {
      type: Date,
      required: [true, 'Event date is required'],
      validate: {
        validator: function(date) {
          return date > new Date();
        },
        message: 'Event date must be in the future'
      }
    },
    eventTime: {
      type: String,
      required: [true, 'Event time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:MM format']
    },
    duration: {
      estimated: {
        type: Number,
        required: [true, 'Estimated duration is required'],
        min: [1, 'Duration must be at least 1 hour'],
        max: [12, 'Duration cannot exceed 12 hours']
      },
      unit: {
        type: String,
        default: 'hours',
        enum: ['hours', 'days']
      }
    },
    guestCount: {
      type: Number,
      required: [true, 'Number of people requiring henna is required'],
      min: [1, 'At least 1 person is required'],
      max: [50, 'Maximum 50 people allowed']
    }
  },
  
  // Location
  location: {
    address: {
      type: String,
      required: [true, 'Address is required']
    },
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: String,
    postalCode: {
      type: String,
      required: [true, 'Postal code is required']
    },
    country: {
      type: String,
      default: 'UK'
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    isVenue: {
      type: Boolean,
      default: false
    },
    venueDetails: {
      name: String,
      facilities: [String],
      parkingAvailable: Boolean
    }
  },
  
  // Budget and Pricing
  budget: {
    min: {
      type: Number,
      required: [true, 'Minimum budget is required'],
      min: [50, 'Minimum budget must be at least £50']
    },
    max: {
      type: Number,
      required: [true, 'Maximum budget is required'],
      validate: {
        validator: function(max) {
          return max > this.budget.min;
        },
        message: 'Maximum budget must be greater than minimum budget'
      }
    },
    currency: {
      type: String,
      default: 'GBP',
      enum: ['GBP', 'EUR', 'USD']
    },
    negotiable: {
      type: Boolean,
      default: true
    }
  },
  
  // Requirements and Preferences
  requirements: {
    designStyle: [{
      type: String,
      enum: ['traditional', 'modern', 'arabic', 'indian', 'bridal', 'simple', 'intricate', 'floral', 'geometric']
    }],
    designComplexity: {
      type: String,
      enum: ['simple', 'medium', 'complex'],
      default: 'medium'
    },
    preferredColors: [String],
    specialInstructions: String,
    supplyRequirements: {
      hennaSupplied: {
        type: Boolean,
        default: false
      },
      designReference: [String], // URLs to reference images
      allergies: String,
      skinSensitivity: Boolean
    }
  },
  
  // Professional Requirements
  professionalRequirements: {
    experience: {
      minimum: {
        type: Number,
        default: 0
      },
      preferred: {
        type: Number,
        default: 2
      }
    },
    certification: {
      required: {
        type: Boolean,
        default: false
      },
      types: [String]
    },
    insurance: {
      required: {
        type: Boolean,
        default: true
      },
      minimumCoverage: Number
    },
    portfolio: {
      required: {
        type: Boolean,
        default: true
      },
      minimumSamples: {
        type: Number,
        default: 5
      }
    }
  },
  
  // Job Status and Management
  status: {
    type: String,
    enum: ['draft', 'open', 'in_review', 'assigned', 'in_progress', 'completed', 'cancelled', 'expired'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  
  // Application Management
  applications: {
    received: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proposal'
    }],
    maxApplications: {
      type: Number,
      default: 10,
      max: 20
    },
    acceptingApplications: {
      type: Boolean,
      default: true
    }
  },
  
  // Selected Artist
  assignedArtist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  selectedProposal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal',
    default: null
  },
  
  // Deadlines
  applicationDeadline: {
    type: Date,
    default: function() {
      return new Date(this.eventDetails.eventDate.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days before event
    }
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(this.eventDetails.eventDate.getTime() + (24 * 60 * 60 * 1000)); // 1 day after event
    }
  },
  
  // Additional Information
  images: [{
    url: String,
    description: String,
    type: {
      type: String,
      enum: ['reference', 'venue', 'inspiration']
    }
  }],
  documents: [{
    url: String,
    name: String,
    type: {
      type: String,
      enum: ['contract', 'requirements', 'inspiration']
    }
  }],
  
  // Visibility and Promotion
  visibility: {
    type: String,
    enum: ['public', 'private', 'invited_only'],
    default: 'public'
  },
  featured: {
    type: Boolean,
    default: false
  },
  
  // Tracking and Analytics
  views: {
    type: Number,
    default: 0
  },
  viewedBy: [{
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Communication
  allowMessages: {
    type: Boolean,
    default: true
  },
  responseTimeExpected: {
    type: String,
    enum: ['immediate', 'within_24h', 'within_48h', 'within_week'],
    default: 'within_48h'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
jobSchema.index({ status: 1 });
jobSchema.index({ category: 1 });
jobSchema.index({ 'eventDetails.eventDate': 1 });
jobSchema.index({ 'location.city': 1 });
jobSchema.index({ client: 1 });
jobSchema.index({ assignedArtist: 1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ 'budget.min': 1, 'budget.max': 1 });

// Compound indexes
jobSchema.index({ status: 1, 'eventDetails.eventDate': 1 });
jobSchema.index({ category: 1, 'location.city': 1 });

// Virtual for applications count
jobSchema.virtual('applicationsCount').get(function() {
  return this.applications.received ? this.applications.received.length : 0;
});

// Virtual for time until event
jobSchema.virtual('timeUntilEvent').get(function() {
  const now = new Date();
  const eventDate = this.eventDetails.eventDate;
  return Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24)); // days
});

// Virtual for budget range string
jobSchema.virtual('budgetRange').get(function() {
  return `${this.budget.currency} ${this.budget.min} - ${this.budget.max}`;
});

// Virtual for deadline status
jobSchema.virtual('deadlineStatus').get(function() {
  const now = new Date();
  const deadline = this.applicationDeadline;
  const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 1) return 'urgent';
  if (daysLeft <= 3) return 'soon';
  return 'open';
});

// Pre-save middleware
jobSchema.pre('save', function(next) {
  // Set expiry if not set
  if (!this.expiresAt && this.eventDetails.eventDate) {
    this.expiresAt = new Date(this.eventDetails.eventDate.getTime() + (24 * 60 * 60 * 1000));
  }
  
  // Set application deadline if not set
  if (!this.applicationDeadline && this.eventDetails.eventDate) {
    this.applicationDeadline = new Date(this.eventDetails.eventDate.getTime() - (7 * 24 * 60 * 60 * 1000));
  }
  
  // Auto-expire if past event date
  if (this.eventDetails.eventDate < new Date() && this.status === 'open') {
    this.status = 'expired';
  }
  
  next();
});

// Static method to find available jobs
jobSchema.statics.findAvailable = function(filters = {}) {
  const query = {
    status: 'open',
    'applications.acceptingApplications': true,
    applicationDeadline: { $gt: new Date() },
    ...filters
  };
  
  return this.find(query)
    .populate('client', 'firstName lastName location.city')
    .sort({ priority: -1, createdAt: -1 });
};

// Static method to find jobs by location
jobSchema.statics.findByLocation = function(city, radius = 50) {
  return this.find({
    status: 'open',
    'location.city': new RegExp(city, 'i'),
    'applications.acceptingApplications': true
  });
};

// Method to add view
jobSchema.methods.addView = function(artistId = null) {
  const update = { $inc: { views: 1 } };
  if (artistId) {
    update.$addToSet = { viewedBy: { artist: artistId, viewedAt: new Date() } };
  }
  // Use atomic update to avoid validation on legacy docs
  return this.model('Job').updateOne({ _id: this._id }, update);
};


// Method to check if artist can apply
jobSchema.methods.canArtistApply = function(artistId) {
  if (this.status !== 'open') return false;
  if (!this.applications.acceptingApplications) return false;
  if (this.applicationDeadline < new Date()) return false;
  if ((this.applications.received || []).length >= this.applications.maxApplications) return false;
  
  // Check if artist already applied
  return !(this.applications.received || []).includes(artistId);
};

module.exports = mongoose.model('Job', jobSchema); 