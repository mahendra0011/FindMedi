export const siteConfig = {
  name: 'FindMedi',
  shortName: 'FindMedi',
  description:
    'FindMedi — A comprehensive healthcare platform connecting patients, doctors, hospitals, pharmacies, and diagnostic centers.',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001',
  contactEmail: 'support@findmedi.online',
  contactPhone: '+91-1800-FIND-MEDI',
  social: {
    facebook: 'https://facebook.com/findmedi',
    instagram: 'https://instagram.com/findmedi',
    youtube: 'https://youtube.com/findmedi',
    twitter: 'https://twitter.com/findmedi',
  },
  footer: {
    columns: [
      {
        title: 'Company',
        links: [
          { label: 'About', href: '/about' },
          { label: 'Careers', href: '/careers' },
          { label: 'Blog', href: '/blog' },
          { label: 'Contact', href: '/contact' },
        ],
      },
      {
        title: 'Services',
        links: [
          { label: 'Find Doctors', href: '/doctors' },
          { label: 'Hospitals', href: '/hospitals' },
          { label: 'Diagnostic Centers', href: '/diagnostic-centers' },
          { label: 'Pharmacies', href: '/buy-medicine' },
        ],
      },
      {
        title: 'Legal',
        links: [
          { label: 'Privacy Policy', href: '/privacy' },
          { label: 'Terms of Service', href: '/terms' },
          { label: 'Disclaimer', href: '/disclaimer' },
        ],
      },
    ],
  },
  featureFlags: {
    enableAIChat: true,
    enableVideoConsultation: true,
    enableRealtimeNotifications: true,
    enableTwoFactorAuth: process.env.NEXT_PUBLIC_ENABLE_2FA !== 'false',
  },
} as const;

export type SiteConfig = typeof siteConfig;
