import React from 'react';
import '../src/index.css';

/** @type {import('@storybook/react').Preview} */
export default {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: { disable: true },
    layout: 'centered',
    // The a11y addon panel mirrors what CI enforces in
    // src/components/ui/systemA11y.test.jsx — a violation here is a failure
    // there too.
  },
  decorators: [
    (Story) => (
      <div style={{ width: 760, maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
};
