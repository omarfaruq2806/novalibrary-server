import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './config/db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: true, // Reflects the request origin, or configure specific list
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root API greeting route
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'Welcome to Nova Library API Server!' });
});

// Health Check Route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'Nova Library backend service is healthy.' });
});

import bookRoutes from './routes/bookRoutes';
import aiRoutes from './routes/aiRoutes';

// Placeholder for route registrations (will be added in future prompts)
// app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/ai', aiRoutes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Connection to Database & Server Startup
async function bootstrap() {
  try {
    // Check if URI is provided before attempting connection
    if (process.env.MONGODB_URI) {
      await connectDB();
    } else {
      console.warn('WARNING: MONGODB_URI not found. MongoDB client remains uninitialized.');
    }

    app.listen(PORT, () => {
      console.log(`[server]: Express server is running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start backend bootstrap:', error);
    // Keep server alive or exit
    process.exit(1);
  }
}

bootstrap();

export default app;
