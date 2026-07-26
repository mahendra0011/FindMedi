const currentIndexes = db.appointments.getIndexes().filter(i => i.name !== '_id_');
print('=== Current indexes ===');
currentIndexes.forEach(i => printjson({ name: i.name, key: i.key, partialFilterExpression: i.partialFilterExpression }));

const oldIndexNames = ['doctorId_1_date_1_time_1', 'patientId_1_doctorId_1_date_1_time_1'];
for (const name of oldIndexNames) {
  if (currentIndexes.some(i => i.name === name)) {
    print('\nDropping old index: ' + name);
    db.appointments.dropIndex(name);
    print('Dropped.');
  }
}

const hasNew = currentIndexes.some(i => i.name === 'doctorId_1_patientId_1_date_1_time_1');
if (!hasNew) {
  print('\nCreating new index doctorId_1_patientId_1_date_1_time_1...');
  db.appointments.createIndex(
    { doctorId: 1, patientId: 1, date: 1, time: 1 },
    { unique: true, partialFilterExpression: { status: { $in: ['Pending', 'Confirmed', 'In Queue', 'Serving'] }, doctorId: { $type: 'objectId' } } }
  );
  print('Created.');
} else {
  print('\nNew index already exists.');
}

print('\n=== Final indexes ===');
db.appointments.getIndexes().filter(i => i.name !== '_id_').forEach(i => printjson({ name: i.name, key: i.key }));
