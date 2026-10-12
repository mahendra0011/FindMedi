import { describe, it, expect } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const menuItems = [
  { _id: '507f191e810c19729de860i1', name: 'High Protein Diabetic Thali', price: 120, active: true },
];

const parkingTransactions = [
  {
    _id: '507f191e810c19729de860p1',
    ticketNumber: 'PRK-2026-0001',
    vehicleNumber: 'MH12AB1234',
    vehicleType: 'FOUR_WHEELER',
    paymentStatus: 'ACTIVE_PARKED',
    calculatedFee: 50,
    entryTime: new Date(Date.now() - 3600000), // 1 hour ago
    save: async function () { return this; },
  },
];

const { as: asCanteen } = await mountApp('canteen', {
  '../../src/models/CanteenItem.js': () => ({
    default: {
      find: () => ({ sort: () => ({ limit: () => ({ lean: async () => menuItems }) }) }),
      create: async (data) => ({ _id: '507f191e810c19729de860i2', ...data }),
    },
  }),
  '../../src/models/CanteenOrder.js': () => ({
    default: {
      create: async (data) => ({ _id: '507f191e810c19729de860o1', orderNumber: 'CAN-101', ...data }),
    },
  }),
  '../../src/middleware/audit.js': () => ({ auditLog: async () => ({}) }),
});

const { as: asParking } = await mountApp('parking', {
  '../../src/models/ParkingTransaction.js': () => ({
    default: {
      find: () => ({ sort: () => ({ limit: () => ({ lean: async () => parkingTransactions }) }) }),
      findOne: (filter) => query(parkingTransactions[0]),
      create: async (data) => {
        const item = { _id: '507f191e810c19729de860p2', ...data, save: async function () { return this; } };
        parkingTransactions.push(item);
        return item;
      },
    },
    VEHICLE_TYPES: ['TWO_WHEELER', 'FOUR_WHEELER', 'AMBULANCE', 'VIP_DOCTOR'],
  }),
  '../../src/middleware/audit.js': () => ({ auditLog: async () => ({}) }),
});

describe('Canteen & Parking Management Integration', () => {
  const staff = {
    _id: '507f191e810c19729de860ea',
    id: '507f191e810c19729de860ea',
    role: 'hospital_admin',
    hospitalId: '507f191e810c19729de860ed',
    permissions: ['billing:read', 'admin:read', 'operations:read', 'operations:write', 'security:manage', 'admin:manage', 'records:read', 'security:read'],
  };

  it('lists active dietary menu items in canteen', async () => {
    const res = await asCanteen(staff).get('/items').expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].name).toContain('Diabetic Thali');
  });

  it('records parking entry for visitor vehicle', async () => {
    const res = await asParking(staff)
      .post('/entry')
      .send({
        vehicleNumber: 'MH 14 DE 5678',
        vehicleType: 'FOUR_WHEELER',
        slotCode: 'B1-SLOT-04',
      })
      .expect(201);

    expect(res.body.ticketNumber).toMatch(/^PRK/);
    expect(res.body.vehicleNumber).toBe('MH14DE5678');
    expect(res.body.paymentStatus).toBe('ACTIVE_PARKED');
  });

  it('exempts ambulance emergency vehicles from parking charges', async () => {
    const res = await asParking(staff)
      .post('/entry')
      .send({
        vehicleNumber: 'MH 12 AM 9999',
        vehicleType: 'AMBULANCE',
      })
      .expect(201);

    expect(res.body.isAmbulanceExempt).toBe(true);
  });
});
