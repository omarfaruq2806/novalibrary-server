import { ObjectId, Collection } from 'mongodb';
import { getDb } from '../../config/db';
import { AIChat, ChatMessage } from '../../types/db';

export class AIChatRepository {
  private get collection(): Collection<AIChat> {
    return getDb().collection<AIChat>('aiChats');
  }

  async findChat(userId: string, bookId: string): Promise<AIChat | null> {
    return this.collection.findOne({ userId, bookId });
  }

  async create(userId: string, bookId: string): Promise<AIChat> {
    const chat: AIChat = {
      userId,
      bookId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await this.collection.insertOne(chat);
    return { ...chat, _id: result.insertedId };
  }

  async appendMessage(userId: string, bookId: string, message: ChatMessage): Promise<boolean> {
    const result = await this.collection.updateOne(
      { userId, bookId },
      {
        $push: { messages: message },
        $set: { updatedAt: new Date() }
      },
      { upsert: true }
    );
    return result.modifiedCount > 0 || result.upsertedCount > 0;
  }

  async clearHistory(userId: string, bookId: string): Promise<boolean> {
    const result = await this.collection.updateOne(
      { userId, bookId },
      {
        $set: { messages: [], updatedAt: new Date() }
      }
    );
    return result.modifiedCount > 0;
  }
}
export const aiChatRepository = new AIChatRepository();
