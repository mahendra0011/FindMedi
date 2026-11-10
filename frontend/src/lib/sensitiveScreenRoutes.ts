const SENSITIVE_ROUTE_PREFIXES = [
  '/patient',
  '/doctor',
  '/clinic',
  '/hospital',
  '/psychiatrist',
  '/counsellor',
  '/superadmin',
  '/admin',
  '/login',
  '/signup',
  '/join',
  '/join-platform',
  '/register',
  '/clinic-admin',
  '/pending-approval',
  '/verify-otp',
];

export function isSensitiveNativeRoute(pathname: string): boolean {
  const normalized = `/${String(pathname || '').trim().replace(/^\/+|\/+$/g, '')}`;
  return SENSITIVE_ROUTE_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}
