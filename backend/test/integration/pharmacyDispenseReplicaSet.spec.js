import mongoose from 'mongoose';
import Medicine from '../../src/models/Medicine.js';
import Prescription from '../../src/models/Prescription.js';
import OutboxEvent from '../../src/models/OutboxEvent.js';
import PharmacyOrder from '../../src/models/PharmacyOrder.js';
import { dispensePrescriptionMedicine } from '../../src/services/pharmacyDispenseService.js';
import { reservePharmacyOrderItems } from '../../src/services/pharmacyInventoryService.js';

const uri = process.env.MONGO_REPLICA_TEST_URI;
const suite = uri ? describe : describe.skip;

suite('pharmacy dispensing against a Mongo replica set', () => {
  beforeAll(async () => {
    if (!uri) return;
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    if (!mongoose.connection.db.databaseName.includes('pharmacy')) {
      throw new Error('MONGO_REPLICA_TEST_URI database name must include "pharmacy" for isolation');
    }
    await Promise.all([Medicine.init(), Prescription.init(), PharmacyOrder.init(), OutboxEvent.init()]);
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    if (!hello.setName) throw new Error('MONGO_REPLICA_TEST_URI must point to a replica set');
  });

  afterAll(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });

  it('allows only one concurrent dispense of a prescription line and commits exactly one outbox event', async () => {
    const medicineId = new mongoose.Types.ObjectId();
    const lineId = new mongoose.Types.ObjectId();
    const prescriptionId = new mongoose.Types.ObjectId();
    await Medicine.create({
      _id: medicineId, name: 'Replica Test Medicine', genericName: 'RTM', category: 'Other', form: 'Tablet',
      manufacturer: 'Test', batchNumber: `same-line-${Date.now()}`, expiryDate: new Date(Date.now() + 86400000),
      purchasePrice: 1, sellingPrice: 2, currentStock: 10, reorderLevel: 1, isActive: true,
    });
    await Prescription.create({
      _id: prescriptionId, prescriptionId: `RX-SAME-${Date.now()}`, patientId: new mongoose.Types.ObjectId(),
      patientName: 'Test Patient', doctorId: new mongoose.Types.ObjectId(), doctorName: 'Test Doctor',
      verificationStatus: 'verified', status: 'Active', medicines: [{
        _id: lineId, medicineId, medicineName: 'Replica Test Medicine', dosage: '1', frequency: 'once', duration: '1 day', quantity: 2,
      }],
    });

    const args = { prescriptionId, medicineLineId: lineId, medicineId, quantity: 2, dispensedBy: 'integration-test', pharmacyId: 'test-pharmacy' };
    const results = await Promise.allSettled([dispensePrescriptionMedicine(args), dispensePrescriptionMedicine(args)]);
    const fulfilled = results.filter((result) => result.status === 'fulfilled');

    expect(fulfilled).toHaveLength(1);
    expect(await Medicine.findById(medicineId).lean()).toMatchObject({ currentStock: 8 });
    expect((await Prescription.findById(prescriptionId).lean()).medicines[0].isDispensed).toBe(true);
    expect(await OutboxEvent.countDocuments({ aggregateType: 'Prescription', aggregateId: String(prescriptionId), eventType: 'medicine.dispensed' })).toBe(1);
  });

  it('prevents concurrent prescriptions from overdrawing the same limited stock', async () => {
    const medicineId = new mongoose.Types.ObjectId();
    const prescriptionIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
    const lineIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
    await Medicine.create({
      _id: medicineId, name: 'Low Stock Replica Test', genericName: 'LSRT', category: 'Other', form: 'Tablet',
      manufacturer: 'Test', batchNumber: `low-stock-${Date.now()}`, expiryDate: new Date(Date.now() + 86400000),
      purchasePrice: 1, sellingPrice: 2, currentStock: 3, reorderLevel: 1, isActive: true,
    });
    await Prescription.insertMany(prescriptionIds.map((id, index) => ({
      _id: id, prescriptionId: `RX-STOCK-${Date.now()}-${index}`, patientId: new mongoose.Types.ObjectId(),
      patientName: 'Test Patient', doctorId: new mongoose.Types.ObjectId(), doctorName: 'Test Doctor',
      verificationStatus: 'verified', status: 'Active', medicines: [{
        _id: lineIds[index], medicineId, medicineName: 'Low Stock Replica Test', dosage: '1', frequency: 'once', duration: '1 day', quantity: 2,
      }],
    })));

    const results = await Promise.allSettled(prescriptionIds.map((prescriptionId, index) => dispensePrescriptionMedicine({
      prescriptionId, medicineLineId: lineIds[index], medicineId, quantity: 2, dispensedBy: 'integration-test', pharmacyId: 'test-pharmacy',
    })));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await Medicine.findById(medicineId).lean()).toMatchObject({ currentStock: 1 });
    expect(await OutboxEvent.countDocuments({ aggregateType: 'Prescription', aggregateId: { $in: prescriptionIds.map(String) }, eventType: 'medicine.dispensed' })).toBe(1);
  });

  it('allows only one competing checkout to reserve the last sellable units', async () => {
    const medicineId = new mongoose.Types.ObjectId();
    await Medicine.create({
      _id: medicineId, name: 'Checkout Reservation Race', genericName: 'CRR', category: 'Other', form: 'Tablet',
      manufacturer: 'Test', batchNumber: `reservation-${Date.now()}`, expiryDate: new Date(Date.now() + 86400000),
      purchasePrice: 1, sellingPrice: 2, currentStock: 3, reorderLevel: 1, isActive: true,
    });

    const reserveInTransaction = async (createOrder = false) => {
      const session = await mongoose.startSession();
      try {
        session.startTransaction();
        await reservePharmacyOrderItems([{ medicineId, quantity: 2 }], { session });
        if (createOrder) {
          const [created] = await PharmacyOrder.create([{
            orderId: `ORD-RES-${Date.now()}-${Math.random()}`,
            patientName: 'Reservation test',
            items: [{ medicineId, medicineName: 'Checkout Reservation Race', qty: 2, price: 2 }],
            total: 4,
            status: 'Pending',
            paymentStatus: 'Unpaid',
            inventoryReservationStatus: 'reserved',
            inventoryReservationExpiresAt: new Date(Date.now() + 60_000),
          }], { session });
          expect(created.inventoryReservationStatus).toBe('reserved');
        }
        await session.commitTransaction();
        return true;
      } catch (err) {
        await session.abortTransaction().catch(() => {});
        throw err;
      } finally {
        await session.endSession();
      }
    };

    const results = await Promise.allSettled([reserveInTransaction(true), reserveInTransaction(true)]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await Medicine.findById(medicineId).lean()).toMatchObject({ currentStock: 1 });

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      await reservePharmacyOrderItems([{ medicineId, quantity: 1 }], { session });
      await Medicine.findByIdAndUpdate(medicineId, { $set: { sellingPrice: 2.25 } }, { session });
      await session.abortTransaction();
    } finally {
      await session.endSession();
    }
    expect(await Medicine.findById(medicineId).lean()).toMatchObject({ currentStock: 1, sellingPrice: 2 });
  });
});
