import express from 'express';
import SupportTicket from '../models/SupportTicket.js';
import { protect, superadminOnly } from '../middleware/auth.js';

const router = express.Router();

const generateTicketId = async () => {
  const count = await SupportTicket.countDocuments();
  return `TKT-${String(count + 1).padStart(4, '0')}`;
};

router.post('/', protect, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ message: 'Subject and message are required' });
    const ticketId = await generateTicketId();
    const ticket = await SupportTicket.create({
      ticketId,
      raisedBy: req.user._id,
      raisedByName: req.user.name,
      subject,
      description: message,
      status: 'Open',
    });
    res.status(201).json(ticket);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/my-tickets', protect, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ raisedBy: req.user._id }).sort({ createdAt: -1 });
    res.json({ tickets });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/', protect, superadminOnly, async (req, res) => {
  try {
    const { status, priority, category, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (search) filter.$or = [
      { ticketId: new RegExp(search, 'i') },
      { subject: new RegExp(search, 'i') },
      { raisedByName: new RegExp(search, 'i') },
    ];
    const tickets = await SupportTicket.find(filter).populate('raisedBy', 'name email').sort({ createdAt: -1 });
    res.json({ tickets });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/status', protect, superadminOnly, async (req, res) => {
  try {
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    res.json(ticket);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/assign', protect, superadminOnly, async (req, res) => {
  try {
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id,
      { assignedTo: req.body.assignedTo, assignedToName: req.body.assignedToName, status: 'In Progress' }, { new: true });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    res.json(ticket);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/:id/messages', protect, superadminOnly, async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    ticket.messages.push({ sender: req.user._id, senderName: req.body.senderName || req.user.name, message: req.body.message });
    ticket.status = 'In Progress';
    await ticket.save();
    res.json(ticket);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/stats', protect, superadminOnly, async (req, res) => {
  try {
    const total = await SupportTicket.countDocuments();
    const open = await SupportTicket.countDocuments({ status: 'Open' });
    const inProgress = await SupportTicket.countDocuments({ status: 'In Progress' });
    const urgent = await SupportTicket.countDocuments({ priority: 'Urgent', status: { $nin: ['Resolved', 'Closed'] } });
    res.json({ total, open, inProgress, resolved: await SupportTicket.countDocuments({ status: 'Resolved' }), closed: await SupportTicket.countDocuments({ status: 'Closed' }), urgent });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;