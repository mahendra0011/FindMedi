import { escapeRegex, capSearch } from '../utils/escapeRegex.js';
import express from 'express';
import SupportTicket from '../models/SupportTicket.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, createSupportTicketSchema, ticketCsatSchema } from '../utils/validate.js';
import { generateTimestampedId } from '../utils/idGenerator.js';

const router = express.Router();

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id))
    ? next()
    : res.status(404).json({ message: 'Not found' })
);

const VALID_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

const generateTicketId = async () => generateTimestampedId('TKT');

router.post('/', protect, authorize('support:write', 'support:write:own'), validate(createSupportTicketSchema), async (req, res) => {
  try {
    const { subject, message, category, priority } = req.body;
    const ticketId = await generateTicketId();
    const ticket = await SupportTicket.create({
      ticketId,
      raisedBy: req.user._id,
      raisedByName: req.user.name,
      subject,
      description: message,
      category,
      priority,
      status: 'Open',
    });
    res.status(201).json(ticket);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/my-tickets', protect, authorize('support:read', 'support:read:own'), async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ raisedBy: req.user._id }).sort({ createdAt: -1 });
    res.json({ tickets });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/', protect, authorize('support:read', 'support:read:own'), async (req, res) => {
  try {
    const { status, priority, category, search } = req.query;
    const filter = {};
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
      }
      filter.status = status;
    }
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (search) filter.$or = [
      { ticketId: new RegExp(escapeRegex(capSearch(search)), 'i') },
      { subject: new RegExp(escapeRegex(capSearch(search)), 'i') },
      { raisedByName: new RegExp(escapeRegex(capSearch(search)), 'i') },
    ];
    const tickets = await SupportTicket.find(filter).populate('raisedBy', 'name email').sort({ createdAt: -1 });
    res.json({ tickets });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/status', protect, authorize('support:manage'), requireObjectId, async (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    res.json(ticket);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/assign', protect, authorize('support:manage'), requireObjectId, async (req, res) => {
  try {
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id,
      { assignedTo: req.body.assignedTo, assignedToName: req.body.assignedToName, status: 'In Progress' }, { new: true });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    res.json(ticket);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/:id/messages', protect, authorize('support:write', 'support:write:own'), requireObjectId, async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    ticket.messages.push({ sender: req.user._id, senderName: req.body.senderName || req.user.name, message: req.body.message });
    ticket.status = 'In Progress';
    await ticket.save();
    res.json(ticket);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/stats', protect, authorize('support:manage'), async (req, res) => {
  try {
    const total = await SupportTicket.countDocuments();
    const open = await SupportTicket.countDocuments({ status: 'Open' });
    const inProgress = await SupportTicket.countDocuments({ status: 'In Progress' });
    const urgent = await SupportTicket.countDocuments({ priority: 'Urgent', status: { $nin: ['Resolved', 'Closed'] } });
    res.json({ total, open, inProgress, resolved: await SupportTicket.countDocuments({ status: 'Resolved' }), closed: await SupportTicket.countDocuments({ status: 'Closed' }), urgent });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// CSAT: rated once, by the raiser, on a resolved/closed ticket. Staff reply
// rates nothing; a second rating is a 409, not a silent overwrite.
// authz: self (raiser owns the row)
router.post('/:id/csat', protect, authorize('support:write', 'support:write:own'), requireObjectId, validate(ticketCsatSchema), async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({ _id: req.params.id, raisedBy: req.user._id });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (!['Resolved', 'Closed'].includes(ticket.status)) {
      return res.status(409).json({ message: 'Rate only after resolution', code: 'NOT_RESOLVED' });
    }
    if (ticket.csat?.rating) {
      return res.status(409).json({ message: 'Already rated', code: 'ALREADY_RATED' });
    }
    ticket.csat = { rating: req.body.rating, at: new Date() };
    await ticket.save();
    return res.json({ rating: ticket.csat.rating });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

export default router;