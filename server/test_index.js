import mongoose from 'mongoose';
mongoose.connect('mongodb+srv://mahendrapra0077:3Bkvlwlj1aZqi8VP@cluster0.5l9k4vd.mongodb.net/medicore?retryWrites=true&w=majority').then(async () => {
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  for (let c of collections) {
    if (c.name.toLowerCase().includes('appoint')) {
      const indexes = await db.collection(c.name).indexes();
      console.log('Indexes for', c.name, ':', JSON.stringify(indexes, null, 2));
    }
  }
  process.exit(0);
}).catch(console.error);
