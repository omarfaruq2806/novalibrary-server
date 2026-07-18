import { ObjectId, Collection } from 'mongodb';
import { getDb } from '../../config/db';
import { User } from '../../types/db';

export class UserRepository {
  private get collection(): Collection<User> {
    return getDb().collection<User>('user'); // Singular collection name for Better Auth compatibility
  }

  async findById(id: string): Promise<User | null> {
    try {
      if (ObjectId.isValid(id)) {
        const user = await this.collection.findOne({ _id: new ObjectId(id) });
        if (user) return user;
      }
      // Check as string just in case
      return this.collection.findOne({
        $or: [{ _id: id }, { id: id }] as any
      });
    } catch {
      return null;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.collection.findOne({ email });
  }

  async create(user: Omit<User, '_id'>): Promise<User> {
    const result = await this.collection.insertOne(user as User);
    return { ...user, _id: result.insertedId };
  }

  async update(id: string, updates: Partial<User>): Promise<boolean> {
    try {
      let filter: any = { _id: id };
      if (ObjectId.isValid(id)) {
        filter = { _id: new ObjectId(id) };
      }
      const result = await this.collection.updateOne(filter, { $set: updates });
      return result.modifiedCount > 0;
    } catch {
      return false;
    }
  }
}
export const userRepository = new UserRepository();
