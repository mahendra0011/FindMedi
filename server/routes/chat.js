import express from 'express';
import { protect } from '../middleware/auth.js';
import ChatConversation from '../models/ChatConversation.js';
import ChatMessage from '../models/ChatMessage.js';
import User from '../models/User.js';

const router = express.Router();

// Search users to start a chat
router.get('/search-users', protect, async (req, res) => {
  try {
    const { q = '' } = req.query;
    const userId = req.user.id;
    
    // Simplistic search: don't return self
    const users = await User.find({
      _id: { $ne: userId },
      name: { $regex: q, $options: 'i' }
    }).select('name avatar role').limit(20);
    
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all conversations for a user
router.get('/conversations', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await ChatConversation.find({ participants: userId })
      .populate('participants', 'name avatar role isOnline lastActive')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 });
    
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get or create conversation with a specific user
router.post('/conversations', protect, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const userId = req.user.id;
    
    if (userId === targetUserId) {
      return res.status(400).json({ message: 'Cannot chat with yourself' });
    }

    let conversation = await ChatConversation.findOne({
      participants: { $all: [userId, targetUserId] }
    }).populate('participants', 'name avatar role isOnline lastActive');

    if (!conversation) {
      conversation = new ChatConversation({
        participants: [userId, targetUserId]
      });
      await conversation.save();
      await conversation.populate('participants', 'name avatar role isOnline lastActive');
    }

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get messages for a conversation
router.get('/messages/:conversationId', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const messages = await ChatMessage.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    
    // Reverse to send oldest first for correct rendering in UI
    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send a message
router.post('/messages', protect, async (req, res) => {
  try {
    const { conversationId, content, attachments } = req.body;
    const senderId = req.user.id;

    const conversation = await ChatConversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    
    if (conversation.blockedBy.length > 0) {
      return res.status(403).json({ message: 'Conversation is blocked' });
    }

    const message = new ChatMessage({
      conversationId,
      sender: senderId,
      content,
      attachments
    });

    await message.save();

    // Update conversation last message
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;
    await conversation.save();

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark messages as read
router.put('/messages/read/:conversationId', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    
    await ChatMessage.updateMany(
      { conversationId, sender: { $ne: userId }, status: { $ne: 'read' } },
      { status: 'read' }
    );
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update conversation settings (mute/block)
router.put('/settings/:conversationId', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { action, value } = req.body; // action: 'mute', 'block', value: boolean
    const userId = req.user.id;

    const conversation = await ChatConversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    if (action === 'mute') {
      if (value && !conversation.mutedBy.includes(userId)) {
        conversation.mutedBy.push(userId);
      } else if (!value) {
        conversation.mutedBy = conversation.mutedBy.filter(id => id.toString() !== userId);
      }
    } else if (action === 'block') {
      if (value && !conversation.blockedBy.includes(userId)) {
        conversation.blockedBy.push(userId);
      } else if (!value) {
        conversation.blockedBy = conversation.blockedBy.filter(id => id.toString() !== userId);
      }
    }

    await conversation.save();
    res.json(conversation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
