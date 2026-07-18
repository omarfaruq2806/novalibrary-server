import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId | string;
  name: string;
  email: string;
  password?: string; // Hashed password
  photoURL?: string; // Avatar URL
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface Book {
  _id?: ObjectId | string;
  title: string;
  author: string;
  description?: string;
  aiSummary?: string;
  coverImage?: string; // Alias for coverUrl
  coverUrl?: string;
  coverPath?: string;
  pdfUrl?: string; // Alias for fileUrl
  fileUrl: string;
  filePath: string;
  extractedText?: string; // Alias for pdfText
  pdfText?: string;
  category?: string; // Alias for genre
  genre: string;
  language: string;
  readingLevel: string;
  tags: string[];
  keyPoints?: string[];
  uploadedBy: string;
  uploadedByName?: string;
  status?: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface Favorite {
  _id?: ObjectId | string;
  userId: string;
  bookId: string;
  createdAt: Date;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AIChat {
  _id?: ObjectId | string;
  userId: string;
  bookId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}
