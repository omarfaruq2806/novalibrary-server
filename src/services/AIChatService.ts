import { aiChatRepository } from '../db/repositories/AIChatRepository';
import { ChatMessage } from '../types/db';

export class AIChatService {
  async getChatHistory(userId: string, bookId: string) {
    return aiChatRepository.findChat(userId, bookId);
  }

  async appendMessage(userId: string, bookId: string, role: 'user' | 'assistant', content: string) {
    const message: ChatMessage = {
      role,
      content,
      timestamp: new Date(),
    };
    return aiChatRepository.appendMessage(userId, bookId, message);
  }

  async clearHistory(userId: string, bookId: string) {
    return aiChatRepository.clearHistory(userId, bookId);
  }
}
export const aiChatService = new AIChatService();
