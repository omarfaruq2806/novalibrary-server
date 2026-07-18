import { favoriteRepository } from '../db/repositories/FavoriteRepository';

export class FavoriteService {
  async addFavorite(userId: string, bookId: string) {
    return favoriteRepository.add(userId, bookId);
  }

  async removeFavorite(userId: string, bookId: string) {
    return favoriteRepository.remove(userId, bookId);
  }

  async getFavorites(userId: string) {
    return favoriteRepository.findByUser(userId);
  }

  async isFavorite(userId: string, bookId: string) {
    return favoriteRepository.isFavorite(userId, bookId);
  }
}
export const favoriteService = new FavoriteService();
