import { connectDB } from '../config/db';

async function buildIndexes() {
  console.log('Starting MongoDB Index Builder...');
  try {
    const db = await connectDB();
    console.log(`Connected to: "${db.databaseName}"`);

    // 1. User collection indexes
    const userCol = db.collection('user');
    await userCol.createIndex({ email: 1 }, { unique: true });
    console.log(' - User collection unique email index built successfully.');

    // 2. Books collection indexes
    const booksCol = db.collection('books');
    // Text search index
    await booksCol.createIndex(
      { title: 'text', author: 'text', description: 'text' },
      { weights: { title: 10, author: 5, description: 2 }, name: 'BookTextIndex' }
    );
    // Standard indexes for quick filters
    await booksCol.createIndex({ genre: 1 });
    await booksCol.createIndex({ language: 1 });
    await booksCol.createIndex({ readingLevel: 1 });
    await booksCol.createIndex({ status: 1 });
    await booksCol.createIndex({ uploadedBy: 1 });
    console.log(' - Books collection search and filter indexes built successfully.');

    // 3. Favorites collection indexes
    const favCol = db.collection('favorites');
    await favCol.createIndex({ userId: 1, bookId: 1 }, { unique: true });
    console.log(' - Favorites collection unique compound index built successfully.');

    // 4. AIChats collection indexes
    const chatCol = db.collection('aiChats');
    await chatCol.createIndex({ userId: 1, bookId: 1 });
    console.log(' - AIChats collection compound index built successfully.');

    console.log('All database indexes built successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to build database indexes:', error);
    process.exit(1);
  }
}

buildIndexes();
