import { Request, Response, NextFunction } from 'express';
import { getDb } from '../config/db';

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let token = '';

    console.log('--- Auth Middleware Debug ---');
    console.log('Request Headers:', req.headers);
    console.log('Cookies received:', req.cookies);

    // 1. Read token from cookie
    if (req.cookies && req.cookies['better-auth.session_token']) {
      token = req.cookies['better-auth.session_token'];
      console.log('Token found in cookie:', token);
    }

    // 2. Fallback to Authorization Header (Bearer token)
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token found in Authorization Header:', token);
    }

    if (!token) {
      console.log('No token found in request.');
      res.status(401).json({ message: 'Authentication required. No session token provided.' });
      return;
    }

    // Better Auth cookie tokens are formatted as: "token_value.signature"
    // We only query the database using the "token_value" (the part before the first dot)
    const dbToken = token.split('.')[0];

    const db = getDb();
    
    // Log target collections and queries
    console.log('Querying DB for token:', dbToken);
    const session = await db.collection('session').findOne({ token: dbToken });
    console.log('Session search result:', session);

    if (!session) {
      res.status(401).json({ message: 'Invalid or expired session.' });
      return;
    }

    // Check expiration
    const expiresAt = new Date(session.expiresAt);
    if (expiresAt.getTime() < Date.now()) {
      res.status(401).json({ message: 'Session has expired. Please sign in again.' });
      return;
    }

    // Retrieve user details with robust $or matching for string vs ObjectId types
    const userIdStr = session.userId.toString();
    const user = await db.collection('user').findOne({
      $or: [
        { _id: session.userId },
        { _id: userIdStr },
        { id: session.userId },
        { id: userIdStr }
      ]
    });

    console.log('User search result:', user);

    if (!user) {
      res.status(401).json({ message: 'Associated user account not found.' });
      return;
    }

    // Map properties to req.user
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role || 'user',
      image: user.image || undefined,
    };

    next();
  } catch (err) {
    console.error('Error in authMiddleware:', err);
    res.status(500).json({ message: 'Internal server error during authentication.' });
  }
}
