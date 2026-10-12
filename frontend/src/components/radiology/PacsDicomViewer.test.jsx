import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import PacsDicomViewer from './PacsDicomViewer';

vi.mock('@/components/ui/sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PacsDicomViewer component (B3)', () => {
  it('renders patient name, modality, and order metadata', () => {
    render(
      <PacsDicomViewer
        orderId="RAD-CT-101"
        patientName="Ananya Verma"
        modality="CT Chest"
        bodyPart="Thorax"
      />
    );

    expect(screen.getByText('Ananya Verma')).toBeInTheDocument();
    expect(screen.getByText('CT Chest')).toBeInTheDocument();
    expect(screen.getByText('[RAD-CT-101]')).toBeInTheDocument();
    expect(screen.getByText('• Thorax')).toBeInTheDocument();
    expect(screen.getByText(/Slice: 24 \/ 64/)).toBeInTheDocument();
  });

  it('updates window preset and WL/WW overlay', () => {
    render(<PacsDicomViewer />);

    // Default window is lung (-600, 1500)
    expect(screen.getByText(/WL: -600 WW: 1500/)).toBeInTheDocument();

    // Click bone window button
    const boneBtn = screen.getByRole('button', { name: /bone window/i });
    fireEvent.click(boneBtn);

    // Overlay updates to bone/mediastinum standard values
    expect(screen.getByText(/WL: 40 WW: 400/)).toBeInTheDocument();
  });

  it('updates zoom and rotation levels upon button clicks', () => {
    render(<PacsDicomViewer />);

    expect(screen.getByText('Zoom: 100%')).toBeInTheDocument();
    expect(screen.getByText('Rot: 0°')).toBeInTheDocument();

    const zoomInBtn = screen.getByRole('button', { name: /zoom \+/i });
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('Zoom: 120%')).toBeInTheDocument();

    const zoomOutBtn = screen.getByRole('button', { name: /zoom -/i });
    fireEvent.click(zoomOutBtn);
    expect(screen.getByText('Zoom: 100%')).toBeInTheDocument();

    const rotateBtn = screen.getByRole('button', { name: /90°/i });
    fireEvent.click(rotateBtn);
    expect(screen.getByText('Rot: 90°')).toBeInTheDocument();
  });

  it('toggles voice dictation and updates recording state', () => {
    render(<PacsDicomViewer />);

    const dictationBtn = screen.getByRole('button', { name: /voice mic/i });
    fireEvent.click(dictationBtn);

    expect(screen.getByText('Dictating...')).toBeInTheDocument();

    // Clicking again toggles off
    fireEvent.click(screen.getByRole('button', { name: /dictating\.\.\./i }));
    expect(screen.getByText('Voice Mic')).toBeInTheDocument();
  });
});
