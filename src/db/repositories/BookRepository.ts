import { ObjectId, Collection } from 'mongodb';
import { getDb } from '../../config/db';
import { Book } from '../../types/db';

export interface BookQueryOptions {
  page: number;
  limit: number;
  search?: string;
  genre?: string;
  language?: string;
  readingLevel?: string;
  sort?: string;
  status?: string;
}

export class BookRepository {
  private get collection(): Collection<Book> {
    return getDb().collection<Book>('books');
  }

  async findById(id: string): Promise<Book | null> {
    if (!ObjectId.isValid(id)) return null;
    return this.collection.findOne({ _id: new ObjectId(id) });
  }

  async create(book: Omit<Book, '_id'>): Promise<Book> {
    const result = await this.collection.insertOne(book as Book);
    return { ...book, _id: result.insertedId };
  }

  async delete(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async count(filterQuery: any): Promise<number> {
    return this.collection.countDocuments(filterQuery);
  }

  async findPaginated(options: BookQueryOptions): Promise<{ books: Book[]; total: number }> {
    const { page, limit, search, genre, language, readingLevel, sort, status } = options;

    // Filter Query
    const filterQuery: any = {};
    if (status) {
      filterQuery.status = status;
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

    const skip = (page - 1) * limit;

    const total = await this.count(filterQuery);
    const books = await this.collection
      .find(filterQuery, { projection: { pdfText: 0 } })
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .toArray();

    return { books, total };
  }

  // Fetch top 4 related books
  async findRelated(genre: string, excludeId: string): Promise<Book[]> {
    if (!ObjectId.isValid(excludeId)) return [];
    return this.collection
      .find(
        {
          _id: { $ne: new ObjectId(excludeId) },
          genre,
        },
        { projection: { pdfText: 0 }, limit: 4 }
      )
      .toArray();
  }
}
export const bookRepository = new BookRepository();
