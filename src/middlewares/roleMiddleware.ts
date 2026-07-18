import { Request, Response, NextFunction } from 'express';

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized. Authentication required.' });
      return;
    }

    const hasRole = allowedRoles.includes(req.user.role);
    if (!hasRole) {
      res.status(403).json({
        message: `Forbidden. Access denied. Required role: one of [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
}
