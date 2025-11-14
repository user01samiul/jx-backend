const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const DATABASE_NAME = 'jackpotx';

async function verifyDatabase() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db(DATABASE_NAME);

    // Get all collections
    const collections = await db.listCollections().toArray();

    console.log('='.repeat(60));
    console.log(`Database: ${DATABASE_NAME}`);
    console.log('='.repeat(60));

    for (const collInfo of collections) {
      const collection = db.collection(collInfo.name);
      const count = await collection.countDocuments();
      const sampleDoc = await collection.findOne();

      console.log(`\n📊 Collection: ${collInfo.name}`);
      console.log(`   Documents: ${count}`);

      if (sampleDoc) {
        console.log(`   Sample document fields: ${Object.keys(sampleDoc).join(', ')}`);
      }

      // Get indexes
      const indexes = await collection.indexes();
      if (indexes.length > 1) {
        console.log(`   Indexes: ${indexes.length}`);
        indexes.forEach(idx => {
          if (idx.name !== '_id_') {
            console.log(`     - ${idx.name}`);
          }
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✓ Database verification complete!');
    console.log('='.repeat(60));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

verifyDatabase();
