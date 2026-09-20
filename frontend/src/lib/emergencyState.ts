// Doc 01 §9.2 — suppress normal toasts/sounds while full-screen SOS overlay is up
export const emergencyOverlayActive: { current: boolean } = { current: false };

export type SOSRequestMode = 'manual_select' | 'auto_select_vehicle' | 'auto_select_ambulance';

export interface SOSVehicleState {
  requestMode: SOSRequestMode;
  selectedVehicleTypes: string[];
  autoBookEnabled: boolean;
  autoFindEnabled: boolean;
  startingRadiusKm: number;
}

export const sosVehicleState: { current: SOSVehicleState } = {
  current: {
    requestMode: 'auto_select_ambulance',
    selectedVehicleTypes: ['ambulance'],
    autoBookEnabled: true,
    autoFindEnabled: false,
    startingRadiusKm: 5,
  },
};
