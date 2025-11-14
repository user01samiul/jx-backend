const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const { deserialize } = require('bson');

const MONGODB_URI = 'mongodb://localhost:27017';
const DATABASE_NAME = 'jackpotx';

async function restoreDatabase() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected successfully to MongoDB');

    const db = client.db(DATABASE_NAME);

    // Get all .bson files in the current directory
    const files = fs.readdirSync(__dirname).filter(file => file.endsWith('.bson'));

    console.log(`Found ${files.length} BSON files to restore`);

    for (const file of files) {
      const collectionName = path.basename(file, '.bson');
      console.log(`\nRestoring collection: ${collectionName}`);

      try {
        // Read the BSON file
        const bsonData = fs.readFileSync(path.join(__dirname, file));

        // Parse BSON documents
        const documents = [];
        let offset = 0;

        while (offset < bsonData.length) {
          // Read document size (first 4 bytes)
          const size = bsonData.readInt32LE(offset);

          if (size <= 0 || offset + size > bsonData.length) {
            break;
          }

          // Extract document bytes
          const docBuffer = bsonData.slice(offset, offset + size);

          try {
            // Deserialize BSON document
            const document = deserialize(docBuffer);
            documents.push(document);
          } catch (err) {
            console.error(`Error deserializing document at offset ${offset}:`, err.message);
          }

          offset += size;
        }

        if (documents.length > 0) {
          // Get or create collection
          const collection = db.collection(collectionName);

          // Insert documents
          const result = await collection.insertMany(documents, { ordered: false });
          console.log(`✓ Inserted ${result.insertedCount} documents into ${collectionName}`);
        } else {
          console.log(`✗ No documents found in ${file}`);
        }

      } catch (err) {
        console.error(`Error restoring ${collectionName}:`, err.message);
      }
    }

    console.log('\n=================================');
    console.log('Database restoration completed!');
    console.log('=================================');

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\nCollections in database:');
    for (const coll of collections) {
      const count = await db.collection(coll.name).countDocuments();
      console.log(`  - ${coll.name}: ${count} documents`);
    }

  } catch (err) {
    console.error('Error during restoration:', err);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

// Run the restoration
restoreDatabase();
