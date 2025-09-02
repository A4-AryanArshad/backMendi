const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Conversation participants
  conversation: {
    participants: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      userType: {
        type: String,
        enum: ['client', 'artist'],
        required: true
      },
      joinedAt: {
        type: Date,
        default: Date.now
      },
      lastReadAt: Date,
      isActive: {
        type: Boolean,
        default: true
      }
    }],
    type: {
      type: String,
      enum: ['direct', 'proposal', 'job', 'support'],
      default: 'direct'
    },
    relatedJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    relatedProposal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proposal'
    }
  },
  
  // Message content
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required']
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  
  content: {
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'audio', 'video', 'system'],
      default: 'text'
    },
    text: {
      type: String,
      maxlength: [2000, 'Message cannot exceed 2000 characters']
    },
    attachments: [{
      type: {
        type: String,
        enum: ['image', 'document', 'audio', 'video']
      },
      url: String,
      filename: String,
      fileSize: Number,
      mimeType: String,
      thumbnail: String // for videos/images
    }],
    systemMessage: {
      type: String,
      enum: ['proposal_sent', 'proposal_accepted', 'proposal_declined', 'job_assigned', 'job_completed', 'payment_made']
    }
  },
  
  // Message status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  
  // Read receipts
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Message metadata
  metadata: {
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: Date,
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    tags: [String],
    language: {
      type: String,
      default: 'en'
    }
  },
  
  // Thread and replies
  parentMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }],
  isThreadStarter: {
    type: Boolean,
    default: false
  },
  
  // Reactions and interactions
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    reactedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Message encryption (for future use)
  encryption: {
    isEncrypted: {
      type: Boolean,
      default: false
    },
    algorithm: String,
    keyId: String
  },
  
  // Scheduled messages
  scheduledFor: Date,
  isScheduled: {
    type: Boolean,
    default: false
  },
  
  // Message analytics
  analytics: {
    deliveredAt: Date,
    readAt: Date,
    responseTime: Number, // milliseconds
    deviceInfo: {
      type: String,
      enum: ['web', 'mobile', 'tablet', 'desktop']
    },
    location: {
      country: String,
      city: String
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ 'conversation.participants.user': 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ status: 1 });
messageSchema.index({ 'conversation.relatedJob': 1 });
messageSchema.index({ 'conversation.relatedProposal': 1 });

// Compound indexes
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, status: 1 });

// Virtual for message age
messageSchema.virtual('ageInMinutes').get(function() {
  const now = new Date();
  const created = this.createdAt;
  return Math.floor((now - created) / (1000 * 60));
});

// Virtual for unread status by user
messageSchema.virtual('isUnreadBy').get(function() {
  return function(userId) {
    return !this.readBy.some(read => read.user.toString() === userId.toString());
  };
});

// Virtual for conversation key (sorted participant IDs)
messageSchema.virtual('conversationKey').get(function() {
  const participants = this.conversation.participants.map(p => p.user.toString()).sort();
  return participants.join('_');
});

// Pre-save middleware
messageSchema.pre('save', function(next) {
  // Set delivery time for sent messages
  if (this.status === 'sent' && !this.analytics.deliveredAt) {
    this.analytics.deliveredAt = new Date();
    this.status = 'delivered';
  }
  
  // Auto-mark system messages as read
  if (this.content.type === 'system') {
    this.status = 'read';
    this.analytics.readAt = new Date();
  }
  
  next();
});

// Post-save middleware for notifications
messageSchema.post('save', async function(doc) {
  try {
    // Update conversation last activity
    await mongoose.model('Conversation').updateLastActivity(doc.conversationKey);
    
    // Send push notification to recipient (implement later)
    // await notificationService.sendPushNotification(doc.recipient, doc);
  } catch (error) {
    console.error('Error in message post-save:', error);
  }
});

// Static method to find conversation between two users
messageSchema.statics.findConversation = function(userId1, userId2, populate = true) {
  const query = {
    $or: [
      { sender: userId1, recipient: userId2 },
      { sender: userId2, recipient: userId1 }
    ],
    'metadata.isDeleted': { $ne: true }
  };
  
  let result = this.find(query).sort({ createdAt: 1 });
  
  if (populate) {
    result = result.populate('sender', 'firstName lastName profileImage userType')
                   .populate('recipient', 'firstName lastName profileImage userType');
  }
  
  return result;
};

// Static method to find conversations for a user
messageSchema.statics.findUserConversations = function(userId) {
  return this.aggregate([
    {
      $match: {
        $or: [{ sender: mongoose.Types.ObjectId(userId) }, { recipient: mongoose.Types.ObjectId(userId) }],
        'metadata.isDeleted': { $ne: true }
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ['$sender', mongoose.Types.ObjectId(userId)] },
            '$recipient',
            '$sender'
          ]
        },
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$sender', mongoose.Types.ObjectId(userId)] },
                  { $ne: ['$status', 'read'] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'otherUser'
      }
    },
    {
      $unwind: '$otherUser'
    },
    {
      $sort: { 'lastMessage.createdAt': -1 }
    }
  ]);
};

// Static method to mark messages as read
messageSchema.statics.markAsRead = function(conversationParticipants, readerId) {
  return this.updateMany(
    {
      $or: [
        { sender: conversationParticipants[0], recipient: conversationParticipants[1] },
        { sender: conversationParticipants[1], recipient: conversationParticipants[0] }
      ],
      recipient: readerId,
      status: { $ne: 'read' }
    },
    {
      $set: {
        status: 'read',
        'analytics.readAt': new Date()
      },
      $push: {
        readBy: {
          user: readerId,
          readAt: new Date()
        }
      }
    }
  );
};

// Static method to get unread count for user
messageSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    recipient: userId,
    status: { $ne: 'read' },
    'metadata.isDeleted': { $ne: true }
  });
};

// Method to mark as read by user
messageSchema.methods.markAsReadBy = function(userId) {
  // Check if already read by this user
  const alreadyRead = this.readBy.some(read => read.user.toString() === userId.toString());
  
  if (!alreadyRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
    
    // If recipient reads it, mark as read
    if (this.recipient.toString() === userId.toString()) {
      this.status = 'read';
      this.analytics.readAt = new Date();
    }
  }
  
  return this.save();
};

// Method to add reaction
messageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    emoji: emoji,
    reactedAt: new Date()
  });
  
  return this.save();
};

// Method to remove reaction
messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
  return this.save();
};

// Method to soft delete
messageSchema.methods.softDelete = function(deletedBy) {
  this.metadata.isDeleted = true;
  this.metadata.deletedAt = new Date();
  this.metadata.deletedBy = deletedBy;
  
  return this.save();
};

// Method to edit message
messageSchema.methods.editMessage = function(newText) {
  if (this.content.type !== 'text') {
    throw new Error('Only text messages can be edited');
  }
  
  this.content.text = newText;
  this.metadata.isEdited = true;
  this.metadata.editedAt = new Date();
  
  return this.save();
};

module.exports = mongoose.model('Message', messageSchema); 