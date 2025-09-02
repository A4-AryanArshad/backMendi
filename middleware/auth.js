const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token and protect routes
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies (for web app)
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account has been deactivated'
        });
      }

      // Check if account is locked
      if (user.isLocked) {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked due to multiple failed login attempts'
        });
      }

      // Check if email is verified for sensitive operations
      if (!user.isEmailVerified && req.path.includes('sensitive')) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your email to access this feature'
        });
      }

      // Add user to request object
      req.user = user;
      next();

    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Grant access to specific user types
const authorize = (...userTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    if (!userTypes.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: `User type '${req.user.userType}' is not authorized to access this route`
      });
    }

    next();
  };
};

// Verify artist profile completion for artist-only routes
const requireCompleteArtistProfile = async (req, res, next) => {
  try {
    if (!req.user || req.user.userType !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Artist access required'
      });
    }

    const user = req.user;
    const profile = user.artistProfile;

    // Check required fields for artist profile
    const requiredFields = [
      'businessName',
      'specialties',
      'experience',
      'pricing.basePrice'
    ];

    const missingFields = [];

    if (!profile.businessName) missingFields.push('businessName');
    if (!profile.specialties || profile.specialties.length === 0) missingFields.push('specialties');
    if (profile.experience === undefined || profile.experience === null) missingFields.push('experience');
    if (!profile.pricing || !profile.pricing.basePrice) missingFields.push('pricing.basePrice');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Please complete your artist profile',
        missingFields: missingFields
      });
    }

    next();

  } catch (error) {
    console.error('Artist profile verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in profile verification'
    });
  }
};

// Verify artist verification status for premium features
const requireVerifiedArtist = async (req, res, next) => {
  try {
    if (!req.user || req.user.userType !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Verified artist access required'
      });
    }

    if (!req.user.artistProfile.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please complete artist verification to access this feature',
        verificationRequired: true
      });
    }

    next();

  } catch (error) {
    console.error('Artist verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in verification check'
    });
  }
};

// Check resource ownership
const checkOwnership = (resourceModel, userField = 'user') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const userId = req.user._id;

      const Model = require(`../models/${resourceModel}`);
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: `${resourceModel} not found`
        });
      }

      // Check ownership
      const resourceOwnerId = resource[userField];
      if (resourceOwnerId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this resource'
        });
      }

      // Add resource to request for use in controller
      req.resource = resource;
      next();

    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error in ownership verification'
      });
    }
  };
};

// Check if user can access specific job (owner or assigned artist)
const checkJobAccess = async (req, res, next) => {
  try {
    const jobId = req.params.jobId || req.params.id;
    const userId = req.user._id;

    const Job = require('../models/Job');
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if user is the client who posted the job
    const isOwner = job.client.toString() === userId.toString();
    
    // Check if user is the assigned artist
    const isAssignedArtist = job.assignedArtist && 
                            job.assignedArtist.toString() === userId.toString();

    if (!isOwner && !isAssignedArtist) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this job'
      });
    }

    req.job = job;
    req.isJobOwner = isOwner;
    req.isAssignedArtist = isAssignedArtist;
    next();

  } catch (error) {
    console.error('Job access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in job access verification'
    });
  }
};

// Rate limiting for authentication endpoints
const authRateLimit = (req, res, next) => {
  // This would typically use a rate limiting library like express-rate-limit
  // For now, we'll implement basic rate limiting
  
  const clientIp = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  // Initialize rate limit storage if not exists
  if (!req.app.locals.rateLimitStore) {
    req.app.locals.rateLimitStore = new Map();
  }
  
  const store = req.app.locals.rateLimitStore;
  const key = `auth_${clientIp}`;
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;
  
  // Clean up old entries
  for (const [k, v] of store.entries()) {
    if (now - v.firstAttempt > windowMs) {
      store.delete(k);
    }
  }
  
  // Check current IP
  const current = store.get(key);
  
  if (!current) {
    store.set(key, { count: 1, firstAttempt: now });
    next();
  } else if (now - current.firstAttempt > windowMs) {
    store.set(key, { count: 1, firstAttempt: now });
    next();
  } else if (current.count < maxAttempts) {
    current.count++;
    next();
  } else {
    return res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again later.',
      retryAfter: Math.ceil((windowMs - (now - current.firstAttempt)) / 1000)
    });
  }
};

// Optional authentication (for public routes that benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (user && user.isActive && !user.isLocked) {
          req.user = user;
        }
      } catch (error) {
        // Silently ignore invalid tokens for optional auth
        console.log('Optional auth token invalid:', error.message);
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue without authentication
  }
};

// Admin access middleware (for future admin features)
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.userType !== 'admin' && !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

module.exports = {
  protect,
  authorize,
  requireCompleteArtistProfile,
  requireVerifiedArtist,
  checkOwnership,
  checkJobAccess,
  authRateLimit,
  optionalAuth,
  requireAdmin
}; 