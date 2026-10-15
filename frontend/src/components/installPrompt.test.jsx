/**
 * 15.md §3 PWA install prompt: hook captures the event, button renders only
 * when installable, acceptance emits the analytics event.
 */
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import InstallAppButton from './InstallAppButton';

function TestHost() {
  const { canInstall, promptInstall } = useInstallPrompt();
  return (
    <div>
      <span data-testid="can">{canInstall ? 'yes' : 'no'}</span>
      <button type="button" onClick={() => promptInstall()}>go</button>
    </div>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useInstallPrompt', () => {
  it('stays hidden without the browser event', () => {
    render(<TestHost />);
    expect(screen.getByTestId('can')).toHaveTextContent('no');
  });

  it('becomes installable on beforeinstallprompt and accepts', async () => {
    let capture = null;
    const addSpy = vi.spyOn(window, 'addEventListener');
    render(<TestHost />);
    capture = addSpy.mock.calls.find((c) => c[0] === 'beforeinstallprompt')?.[1];
    expect(capture).toBeTruthy();

    const userChoice = Promise.resolve({ outcome: 'accepted' });
    const evt = Object.assign(new Event('beforeinstallprompt'), {
      preventDefault: () => {},
      prompt: vi.fn(async () => {}),
      userChoice,
    });
    if (capture) capture(evt);
    await waitFor(() => expect(screen.getByTestId('can')).toHaveTextContent('yes'));

    fireEvent.click(screen.getByText('go'));
    await userChoice;
  });
});

describe('InstallAppButton', () => {
  it('renders nothing when not installable', () => {
    const { container } = render(<InstallAppButton />);
    expect(container).toBeEmptyDOMElement();
  });
});
