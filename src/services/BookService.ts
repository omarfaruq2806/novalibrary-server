import { bookRepository, BookQueryOptions } from '../db/repositories/BookRepository';
import { Book } from '../types/db';
import { bookValidationSchema } from '../validations/dbSchemas';

export class BookService {
  async getBookById(id: string): Promise<Book | null> {
    return bookRepository.findById(id);
  }

  async createBook(bookData: Omit<Book, '_id' | 'createdAt' | 'updatedAt'>): Promise<Book> {
    // Validate inputs
    const validatedData = bookValidationSchema.parse(bookData);

    const newBook: Omit<Book, '_id'> = {
      title: validatedData.title,
      author: validatedData.author,
      genre: validatedData.genre,
      description: validatedData.description,
      aiSummary: validatedData.aiSummary,
      fileUrl: validatedData.fileUrl,
      filePath: validatedData.filePath,
      coverUrl: validatedData.coverUrl,
      coverPath: validatedData.coverPath,
      language: validatedData.language,
      readingLevel: validatedData.readingLevel,
      tags: validatedData.tags,
      keyPoints: validatedData.keyPoints || [],
      uploadedBy: validatedData.uploadedBy,
      uploadedByName: validatedData.uploadedByName,
      status: validatedData.status || 'active', // default status
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return bookRepository.create(newBook);
  }

  async deleteBook(id: string): Promise<boolean> {
    return bookRepository.delete(id);
  }

  async getPaginatedBooks(options: BookQueryOptions & { adminView?: boolean }) {
    const { page, limit, search, genre, language, readingLevel, sort, adminView } = options;

    // Filter Query building
    const filterQuery: any = {};
    
    // Non-admin view: only show accepted books
    if (!adminView) {
      filterQuery.status = 'accepted';
    }

    if (genre && genre !== 'All') {
      filterQuery.genre = genre;
    }
    if (language && language !== 'All') {
      filterQuery.language = language;
    }
    if (readingLevel && readingLevel !== 'All') {
      filterQuery.readingLevel = readingLevel;
    }
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filterQuery.$or = [
        { title: searchRegex },
        { author: searchRegex },
        { description: searchRegex }
      ];
    }

    // Sort options
    let sortOptions: any = { createdAt: -1 };
    if (sort === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sort === 'title_asc') {
      sortOptions = { title: 1 };
    } else if (sort === 'title_desc') {
      sortOptions = { title: -1 };
    } else if (sort === 'author_asc') {
      sortOptions = { author: 1 };
    } else if (sort === 'author_desc') {
      sortOptions = { author: -1 };
    }

    // Directly query database inside repository paginator or implement here
    const dbBooks = await bookRepository.findPaginated({
      page,
      limit,
      search,
      genre,
      language,
      readingLevel,
      sort,
      status: adminView ? undefined : 'accepted'
    });

    // If query has specific status overrides
    return dbBooks;
  }

  // Admin approves/rejects book status update
  async updateBookStatus(id: string, status: 'accepted' | 'pending' | 'rejected'): Promise<boolean> {
    const db = require('../config/db').getDb();
    const { ObjectId } = require('mongodb');
    
    if (!ObjectId.isValid(id)) return false;
    const result = await db.collection('books').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );
    return result.modifiedCount > 0;
  }

  // Get user's own uploaded books (manage page helper)
  async getBooksByUploader(userId: string): Promise<Book[]> {
    const db = require('../config/db').getDb();
    return db.collection('books')
      .find({ uploadedBy: userId }, { projection: { pdfText: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
  }
}
export const bookService = new BookService();
