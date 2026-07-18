import { connectDB } from './config/db';

async function testConnection() {
  console.log('Connecting to MongoDB...');
  try {
    const db = await connectDB();
    console.log(`Connected to database: "${db.databaseName}"`);

    const count = await db.collection('books').countDocuments();
    console.log(`Collection "books" has ${count} documents.`);
    if (count > 0) {
      const sample = await db.collection('books').find().toArray();
      console.log('Saved books documents:', JSON.stringify(sample, null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error('Failed to query database:', error);
    process.exit(1);
  }
}

testConnection();
