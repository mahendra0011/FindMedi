import { test, expect } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import VehicleTypeSelector, { VEHICLE_TYPES } from './components/vehicle/VehicleTypeSelector';
import FareEstimateCard from './components/vehicle/FareEstimateCard';

test('VehicleTypeSelector renders all 6 vehicle types', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  let selectedType = 'bike';
  const handleSelect = (code: string) => {
    selectedType = code;
  };

  await act(async () => {
    root.render(
      <VehicleTypeSelector
        selected={selectedType}
        onSelect={handleSelect}
        estimates={{
          bike: { fare: { total: 45 }, etaMin: 4 },
          auto: { fare: { total: 75 }, etaMin: 6 },
          ambulance: { fare: { total: 350 }, etaMin: 3 },
        }}
      />
    );
  });

  expect(VEHICLE_TYPES.length).toBe(6);
  expect(container.textContent).toContain('Bike');
  expect(container.textContent).toContain('Auto');
  expect(container.textContent).toContain('Ambulance');
  expect(container.textContent).toContain('45');
  expect(container.textContent).toContain('350');

  act(() => {
    root.unmount();
  });
  container.remove();
});

test('FareEstimateCard displays fare breakdown correctly', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  const mockEstimate = {
    vehicleType: 'car',
    distanceKm: 8.5,
    estimatedDurationMin: 22,
    fare: {
      base: 60,
      distanceCharge: 136,
      surge: 0,
      total: 196,
    },
    pickupAddress: 'Andheri West Metro Station, Mumbai',
    dropoffAddress: 'Lilavati Hospital & Research Centre, Bandra, Mumbai',
  };

  await act(async () => {
    root.render(
      <FareEstimateCard
        vehicleType="car"
        distanceKm={8.5}
        durationMin={22}
        etaMin={5}
        fare={{
          base: 60,
          distanceCharge: 136,
          surge: 0,
          total: 196,
        }}
      />
    );
  });

  expect(container.textContent).toContain('196');
  expect(container.textContent).toContain('8.5 km');
  expect(container.textContent).toContain('22 mins');
  expect(container.textContent).toContain('5 mins');

  act(() => {
    root.unmount();
  });
  container.remove();
});

test('RiderInfoCard displays rider and vehicle details', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  const mockRider = {
    name: 'Suresh Kumar',
    phone: '+91 98765 43210',
    rating: 4.85,
    vehicle: {
      brand: 'Maruti Suzuki',
      model: 'WagonR CNG',
      color: 'Silver',
      rcNumber: 'MH02EK4921',
      type: 'car',
    },
  };

  await act(async () => {
    const RiderInfoCard = (await import('./components/vehicle/RiderInfoCard')).default;
    root.render(
      <RiderInfoCard
        rider={mockRider}
        statusText="Driver Assigned"
      />
    );
  });

  expect(container.textContent).toContain('Suresh Kumar');
  expect(container.textContent).toContain('4.8');
  expect(container.textContent).toContain('MH02EK4921');
  expect(container.textContent).toContain('Maruti Suzuki WagonR CNG');
  expect(container.textContent).toContain('Driver Assigned');

  act(() => {
    root.unmount();
  });
  container.remove();
});

