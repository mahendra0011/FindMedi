import { render } from '@testing-library/react';
import App from './App';

/* global test, expect */
test('renders App component', () => {
  render(<App />);
  // Very basic check, this expects something to render. We don't have to be exhaustive.
  expect(document.body).toBeInTheDocument();
});
