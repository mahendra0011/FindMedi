export default {
  enabled: process.env.AUDIT_ENABLED !== 'false',
  retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '365', 10),
  excludePaths: ['/api/health', '/api/auth/login', '/api/auth/register'],
};