import { userRepository } from '../db/repositories/UserRepository';
import { User } from '../types/db';
import { userValidationSchema } from '../validations/dbSchemas';

export class UserService {
  async getUserById(id: string): Promise<User | null> {
    return userRepository.findById(id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return userRepository.findByEmail(email);
  }

  async createUser(userData: Omit<User, '_id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    // Validate inputs
    const validatedData = userValidationSchema.parse(userData);

    const newUser: Omit<User, '_id'> = {
      name: validatedData.name,
      email: validatedData.email,
      password: validatedData.password,
      photoURL: validatedData.photoURL,
      role: validatedData.role as 'user' | 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return userRepository.create(newUser);
  }

  async updateUser(id: string, updates: Partial<Omit<User, '_id' | 'createdAt' | 'updatedAt'>>): Promise<boolean> {
    // Check partial validation schemas if necessary
    const partialUpdates: Partial<User> = {
      ...updates,
      updatedAt: new Date(),
    };

    return userRepository.update(id, partialUpdates);
  }
}
export const userService = new UserService();
