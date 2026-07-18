import { ObjectId, Collection } from 'mongodb';
import { getDb } from '../../config/db';
import { Favorite } from '../../types/db';

export class FavoriteRepository {
  private get collection(): Collection<Favorite> {
    return getDb().collection<Favorite>('favorites');
  }

  async add(userId: string, bookId: string): Promise<Favorite> {
    const favorite: Favorite = {
      userId,
      bookId,
      createdAt: new Date(),
    };
    const result = await this.collection.insertOne(favorite);
    return { ...favorite, _id: result.insertedId };
  }

  async remove(userId: string, bookId: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ userId, bookId });
    return result.deletedCount > 0;
  }

  async findByUser(userId: string): Promise<Favorite[]> {
    return this.collection.find({ userId }).sort({ createdAt: -1 }).toArray();
  }

  async isFavorite(userId: string, bookId: string): Promise<boolean> {
    const count = await this.collection.countDocuments({ userId, bookId });
    return count > 0;
  }
}
export const favoriteRepository = new FavoriteRepository();
