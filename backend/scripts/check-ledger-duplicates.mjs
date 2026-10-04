/**
 * Read-only preflight for the TransactionLedger { source, sourceId } unique index.
 * Does not modify or delete financial records. Review every emitted group and
 * reconcile against the booking/payment/payout source of truth before indexing.
 */
import mongoose from 'mongoose';

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('MONGO_URI is required; refusing to use a local/default database.');
  process.exit(2);
}

try {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  const collection = mongoose.connection.collection('transactionledgers');
  const duplicates = await collection.aggregate([
    { $match: { sourceId: { $type: 'string', $gt: '' } } },
    {
      $group: {
        _id: { source: '$source', sourceId: '$sourceId' },
        count: { $sum: 1 },
        ids: { $push: '$_id' },
        statuses: { $push: '$status' },
        amounts: { $push: '$amount' },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1, '_id.source': 1, '_id.sourceId': 1 } },
  ], { allowDiskUse: true }).toArray();

  if (duplicates.length) {
    console.error(`Found ${duplicates.length} duplicate settlement key(s); unique index is NOT safe to build.`);
    for (const duplicate of duplicates) console.error(JSON.stringify(duplicate));
    process.exitCode = 1;
  } else {
    console.log('No duplicate non-empty { source, sourceId } keys found. Index preflight passed.');
  }
} catch (error) {
  console.error(`Ledger duplicate preflight failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
