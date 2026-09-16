import mongoose from 'mongoose';
import ChatConversation from './models/ChatConversation.js';
import User from './models/User.js';
import ChatMessage from './models/ChatMessage.js';
import dotenv from 'dotenv';
dotenv.config();
import { configureMongoDns } from './config/mongoDns.js';

async function run() {
  configureMongoDns();
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/findmedi');
    console.log("Connected to MongoDB");
    
    // Find any user
    const user = await User.findOne();
    if (!user) {
      console.log("No users found");
      return;
    }
    const userId = user._id;
    console.log("Testing with userId:", userId);

    const conversations = await ChatConversation.find({ participants: userId })
      .populate('participants', 'name avatar role isOnline lastActive')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 });
      
    console.log("Success! Found", conversations.length, "conversations");
  } catch (err) {
    console.error("Error occurred:");
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
run();
