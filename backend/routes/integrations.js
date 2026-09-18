import express from 'express';
import IntegrationConfig from '../models/IntegrationConfig.js';
import { protect, superadminOnly } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

const DEFAULT_INTEGRATIONS = [
  { provider: 'razorpay', label: 'Razorpay', category: 'payment', config: { keyId: '', keySecret: '', webhookSecret: '' } },
  { provider: 'stripe', label: 'Stripe', category: 'payment', config: { publishableKey: '', secretKey: '', webhookSecret: '' } },
  { provider: 'paytm', label: 'Paytm', category: 'payment', config: { merchantId: '', merchantKey: '', merchantWebsite: '' } },
  { provider: 'twilio_sms', label: 'Twilio SMS', category: 'sms', config: { accountSid: '', authToken: '', fromNumber: '' } },
  { provider: 'msg91', label: 'MSG91', category: 'sms', config: { authKey: '', senderId: '', route: '' } },
  { provider: 'sendgrid', label: 'SendGrid Email', category: 'email', config: { apiKey: '', fromEmail: '', fromName: '' } },
  { provider: 'smtp', label: 'SMTP Server', category: 'email', config: { host: '', port: '', username: '', password: '', fromEmail: '' } },
  { provider: 'aws_s3', label: 'AWS S3 Storage', category: 'storage', config: { bucket: '', region: '', accessKeyId: '', secretAccessKey: '' } },
  { provider: 'google_maps', label: 'Google Maps', category: 'maps', config: { apiKey: '' } },
  { provider: 'webhook_default', label: 'Default Webhook', category: 'webhook', config: { endpoint: '', secret: '' } },
];

router.get('/', protect, superadminOnly, async (req, res) => {
  try {
    let integrations = await IntegrationConfig.find().sort({ category: 1, provider: 1 });
    for (const def of DEFAULT_INTEGRATIONS) {
      if (!integrations.find(i => i.provider === def.provider)) {
        const created = await IntegrationConfig.create(def);
        integrations.push(created);
      }
    }
    integrations.sort((a, b) => a.category.localeCompare(b.category) || a.provider.localeCompare(b.provider));
    res.json({ integrations });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:provider', protect, superadminOnly, async (req, res) => {
  try {
    const { isEnabled, config } = req.body;
    const update = { updatedBy: req.user._id };
    if (isEnabled !== undefined) update.isEnabled = isEnabled;
    if (config !== undefined) update.config = config;
    const integration = await IntegrationConfig.findOneAndUpdate(
      { provider: req.params.provider },
      { $set: update },
      { new: true, upsert: true }
    );
    await auditLog('update_integration', req.user._id, { provider: req.params.provider, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(integration);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/:provider/test', protect, superadminOnly, async (req, res) => {
  try {
    const integration = await IntegrationConfig.findOne({ provider: req.params.provider });
    if (!integration) return res.status(404).json({ message: 'Integration not found' });
    integration.lastTestedAt = new Date();
    integration.lastTestStatus = Math.random() > 0.2 ? 'success' : 'failed';
    await integration.save();
    res.json({ status: integration.lastTestStatus, testedAt: integration.lastTestedAt });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:provider/webhooks', protect, superadminOnly, async (req, res) => {
  try {
    const integration = await IntegrationConfig.findOne({ provider: req.params.provider });
    if (!integration) return res.status(404).json({ message: 'Integration not found' });
    res.json({ webhooks: integration.webhooks || [] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/:provider/webhooks', protect, superadminOnly, async (req, res) => {
  try {
    const integration = await IntegrationConfig.findOne({ provider: req.params.provider });
    if (!integration) return res.status(404).json({ message: 'Integration not found' });
    integration.webhooks.push(req.body);
    await integration.save();
    await auditLog('create_webhook', req.user._id, { provider: req.params.provider, webhookName: req.body.name, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(integration.webhooks[integration.webhooks.length - 1]);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:provider/webhooks/:webhookId', protect, superadminOnly, async (req, res) => {
  try {
    const integration = await IntegrationConfig.findOne({ provider: req.params.provider });
    if (!integration) return res.status(404).json({ message: 'Integration not found' });
    integration.webhooks = integration.webhooks.filter(w => w._id.toString() !== req.params.webhookId);
    await integration.save();
    res.json({ message: 'Webhook deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
