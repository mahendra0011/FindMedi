/**
 * BarcodeScanner story (P2-38) — manual-entry path (the camera path needs a
 * real device, so the story exercises what CI and reviewers can actually use).
 */
import React, { useState } from 'react';
import { BarcodeScanner } from './System';

export default {
  title: 'System/BarcodeScanner',
  component: BarcodeScanner,
  tags: ['autodocs'],
};

/* Real component so `useState` is legal under rules-of-hooks (a Storybook
 * `render` factory is not a component). */
function BarcodeScannerDemo() {
  const [last, setLast] = useState(null);
  return (
    <div style={{ width: 480 }}>
      <BarcodeScanner onScan={setLast} />
      <p style={{ marginTop: 8, fontSize: 13 }}>{last ? `Scanned: ${last}` : 'Press Enter after typing a code.'}</p>
    </div>
  );
}

export const Default = {
  render: () => <BarcodeScannerDemo />,
};

export const CustomLabel = {
  name: 'Custom label (sample tube)',
  args: { label: 'Scan sample tube', onScan: () => {} },
};
