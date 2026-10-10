/**
 * Stories for the shared UI system (P2-38).
 *
 * Each story is the canonical usage of a component from System.tsx so a
 * reviewer can see every state (loading, empty, error) without booting the
 * app or being authenticated. The @storybook/addon-a11y panel runs the same
 * WCAG checks CI enforces in systemA11y.test.jsx.
 */
import React from 'react';
import { AlertBanner } from './System';

export default {
  title: 'System/AlertBanner',
  component: AlertBanner,
  tags: ['autodocs'],
};

const ALERTS = [
  { _id: 'a1', severity: 'critical', message: 'Critical lab: Potassium 6.9 mmol/L — Bed 12', status: 'open' },
  { _id: 'a2', severity: 'warning', message: 'Bed 4 cleaning overdue by 40 minutes', status: 'open' },
  { _id: 'a3', severity: 'info', message: 'Monthly ECG calibration due in 3 days', status: 'open' },
];

export const WithOpenAlerts = {
  args: {
    alerts: ALERTS,
    onAck: (id) => console.log('ack', id),
    onSnooze: (id) => console.log('snooze', id),
  },
};

export const CriticalOnly = {
  args: { alerts: [ALERTS[0]], onAck: () => {} },
};

export const Empty = {
  args: { alerts: [], onAck: () => {} },
};

export const AcknowledgedHidden = {
  name: 'Acknowledged are hidden',
  args: {
    alerts: [{ ...ALERTS[0], status: 'ack' }],
    onAck: () => {},
  },
};
