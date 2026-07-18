import { z } from 'zod';

export const userValidationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  photoURL: z.string().url('Invalid photo URL').optional(),
  role: z.enum(['user', 'admin']).default('user'),
});

export const bookValidationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  genre: z.string().min(1, 'Genre is required'),
  description: z.string().optional(),
  aiSummary: z.string().optional(),
  fileUrl: z.string().url('Invalid PDF URL'),
  filePath: z.string().min(1, 'PDF storage path is required'),
  coverUrl: z.string().url('Invalid cover URL').optional(),
  coverPath: z.string().optional(),
  language: z.string().default('English'),
  readingLevel: z.string().default('Intermediate'),
  tags: z.array(z.string()).default([]),
  keyPoints: z.array(z.string()).optional(),
  uploadedBy: z.string().min(1, 'Uploader ID is required'),
  uploadedByName: z.string().optional(),
  status: z.enum(['pending', 'accepted', 'rejected']).default('pending'),
});

export const favoriteValidationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  bookId: z.string().min(1, 'Book ID is required'),
});

export const chatMessageValidationSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1, 'Message content cannot be empty'),
  timestamp: z.date().default(() => new Date()),
});

export const aiChatValidationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  bookId: z.string().min(1, 'Book ID is required'),
  messages: z.array(chatMessageValidationSchema).default([]),
});
