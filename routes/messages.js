const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Get user conversations
// @route   GET /api/messages/conversations
// @access  Private
router.get('/conversations', protect, async (req, res) => {
  try {
    const Message = require('../models/Message');
    
    const conversations = await Message.findUserConversations(req.user._id);
    
    res.status(200).json({
      success: true,
      count: conversations.length,
      data: conversations
    });
    
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get conversation with specific user
// @route   GET /api/messages/conversation/:userId
// @access  Private
router.get('/conversation/:userId', protect, async (req, res) => {
  try {
    const Message = require('../models/Message');
    
    const messages = await Message.findConversation(req.user._id, req.params.userId);
    
    // Mark messages as read
    await Message.markAsRead([req.user._id, req.params.userId], req.user._id);
    
    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
    
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Send message
// @route   POST /api/messages
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const Message = require('../models/Message');
    
    const { recipient, content } = req.body;
    
    const message = await Message.create({
      sender: req.user._id,
      recipient,
      content: {
        type: 'text',
        text: content
      }
    });
    
    await message.populate('sender', 'firstName lastName profileImage userType');
    await message.populate('recipient', 'firstName lastName profileImage userType');
    
    res.status(201).json({
      success: true,
      data: message
    });
    
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error sending message'
    });
  }
});

// @desc    Get unread count
// @route   GET /api/messages/unread-count
// @access  Private
router.get('/unread-count', protect, async (req, res) => {
  try {
    const Message = require('../models/Message');
    
    const count = await Message.getUnreadCount(req.user._id);
    
    res.status(200).json({
      success: true,
      data: { unreadCount: count }
    });
    
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 