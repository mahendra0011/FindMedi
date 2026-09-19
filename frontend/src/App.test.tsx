import { test, expect } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import App from './App';

test('renders App component', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<App />);
  });

  expect(document.body).toBeDefined();

  act(() => {
    root.unmount();
  });
  container.remove();
});
