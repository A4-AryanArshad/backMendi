const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  phone: {
    type: String,
    required: false,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please provide a valid phone number']
  },
  
  // User Type
  userType: {
    type: String,
    enum: ['client', 'artist'],
    required: [true, 'User type is required']
  },
  
  // Location
  location: {
    address: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, default: 'UK' },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  // Profile Information
  profileImage: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  
  // Artist-specific fields
  artistProfile: {
    businessName: String,
    specialties: [{
      type: String,
      enum: ['bridal', 'party', 'festival', 'corporate', 'traditional', 'modern', 'arabic', 'indian']
    }],
    experience: {
      type: Number, // years of experience
      min: 0
    },
    portfolio: [{
      imageUrl: String,
      description: String,
      category: String
    }],
    pricing: {
      basePrice: Number,
      hourlyRate: Number,
      currency: { type: String, default: 'GBP' }
    },
    availability: [{
      date: Date,
      timeSlots: [{
        startTime: String,
        endTime: String,
        isBooked: { type: Boolean, default: false }
      }]
    }],
    documents: {
      insurance: String,
      certification: String,
      businessLicense: String
    },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 }
    },
    isVerified: { type: Boolean, default: false }
  },
  
  // Client-specific fields
  clientProfile: {
    preferences: [{
      type: String,
      enum: ['traditional', 'modern', 'arabic', 'indian', 'simple', 'intricate']
    }],
    eventHistory: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    }],
    favoriteArtists: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  
  // Password Reset
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Login tracking
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  
  // Notifications preferences
  notificationPreferences: {
    newJobs: { type: Boolean, default: true },
    proposals: { type: Boolean, default: true },
    messages: { type: Boolean, default: true },
    email: {
      newJobs: { type: Boolean, default: false },
      proposals: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false }
    },
    sms: {
      enabled: { type: Boolean, default: false },
      urgent: { type: Boolean, default: false }
    }
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ userType: 1 });
userSchema.index({ 'location.city': 1 });
userSchema.index({ 'artistProfile.specialties': 1 });
userSchema.index({ 'artistProfile.rating.average': -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate JWT token
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      userType: this.userType,
      email: this.email 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Method to update last login
userSchema.methods.updateLastLogin = function() {
  return this.updateOne({ lastLogin: new Date() });
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find artists by specialty
userSchema.statics.findArtistsBySpecialty = function(specialty, location = null) {
  const query = {
    userType: 'artist',
    'artistProfile.specialties': specialty,
    isActive: true
  };
  
  if (location) {
    query['location.city'] = new RegExp(location, 'i');
  }
  
  return this.find(query).sort({ 'artistProfile.rating.average': -1 });
};

module.exports = mongoose.model('User', userSchema); 