const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGO_URI = 'mongodb://localhost:27017/jackpotx';
const BACKUP_DIR = path.join(__dirname, 'backup', 'jackpotx');

async function backupDatabase() {
    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('jackpotx');
        const collections = await db.listCollections().toArray();

        console.log(`Found ${collections.length} collections to backup`);

        // Ensure backup directory exists
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }

        // Backup each collection
        for (const collInfo of collections) {
            const collName = collInfo.name;
            console.log(`Backing up collection: ${collName}`);

            const collection = db.collection(collName);
            const documents = await collection.find({}).toArray();

            const backupFile = path.join(BACKUP_DIR, `${collName}.json`);
            fs.writeFileSync(backupFile, JSON.stringify(documents, null, 2));

            console.log(`  - Exported ${documents.length} documents to ${collName}.json`);
        }

        // Save metadata
        const metadata = {
            backupDate: new Date().toISOString(),
            database: 'jackpotx',
            collections: collections.map(c => c.name),
            totalCollections: collections.length
        };

        fs.writeFileSync(
            path.join(BACKUP_DIR, '_metadata.json'),
            JSON.stringify(metadata, null, 2)
        );

        console.log('\nBackup completed successfully!');
        console.log(`Backup location: ${BACKUP_DIR}`);

    } catch (error) {
        console.error('Backup failed:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

backupDatabase();
