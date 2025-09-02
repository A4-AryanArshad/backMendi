const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Recipient
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  
  // Notification Details
  type: {
    type: String,
    required: [true, 'Notification type is required'],
    enum: [
      'new_job_posted',
      'proposal_accepted',
      'proposal_declined',
      'job_assigned',
      'job_completed',
      'message_received',
      'payment_received',
      'review_received',
      'profile_viewed',
      'system_announcement'
    ]
  },
  
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  
  // Related Data
  relatedJob: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  
  relatedProposal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal'
  },
  
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Notification State
  read: {
    type: Boolean,
    default: false
  },
  
  readAt: {
    type: Date
  },
  
  // Action URL for frontend navigation
  actionUrl: {
    type: String
  },
  
  // Delivery Settings
  deliveryMethods: {
    inApp: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: false
    },
    sms: {
      type: Boolean,
      default: false
    }
  },
  
  // Email delivery status
  emailSent: {
    type: Boolean,
    default: false
  },
  
  emailSentAt: {
    type: Date
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Expiry
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for time since created
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to create new job notification for all artists
notificationSchema.statics.notifyArtistsOfNewJob = async function(job) {
  try {
    const User = require('./User');
    
    // Get all active artists
    const artists = await User.find({
      userType: 'artist',
      isActive: true,
      'notificationPreferences.newJobs': true
    }).select('_id notificationPreferences');
    
    if (artists.length === 0) {
      console.log('No artists found to notify');
      return [];
    }
    
    // Create notifications for each artist
    const notifications = artists.map(artist => ({
      recipient: artist._id,
      type: 'new_job_posted',
      title: `New ${job.category} job available`,
      message: `A new ${job.category} job for ${job.eventDetails.eventType} has been posted in ${job.location.city}. Budget: ${job.budget.currency} ${job.budget.min}-${job.budget.max}`,
      relatedJob: job._id,
      actionUrl: `/jobs/${job._id}`,
      deliveryMethods: {
        inApp: true,
        email: artist.notificationPreferences?.email?.newJobs || false
      },
      priority: job.priority === 'urgent' ? 'urgent' : 'medium'
    }));
    
    // Bulk insert notifications
    const createdNotifications = await this.insertMany(notifications);
    
    console.log(`Created ${createdNotifications.length} notifications for new job: ${job.title}`);
    return createdNotifications;
    
  } catch (error) {
    console.error('Error creating job notifications:', error);
    throw error;
  }
};

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    recipient: userId,
    read: false,
    expiresAt: { $gt: new Date() }
  });
};

// Static method to mark all as read for user
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { recipient: userId, read: false },
    { read: true, readAt: new Date() }
  );
};

module.exports = mongoose.model('Notification', notificationSchema); 