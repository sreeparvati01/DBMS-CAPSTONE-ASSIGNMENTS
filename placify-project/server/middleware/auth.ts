import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'placify-dev-jwt-secret-change-in-production';

export interface AuthUser {
  id: number;
  email: string;
  role: 'admin' | 'student';
  full_name: string;
  student_id?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function signToken(user: AuthUser, rememberMe = false): string {
  return jwt.sign(user, JWT_SECRET, {
    expiresIn: rememberMe ? '30d' : '24h',
  });
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, JWT_SECRET) as AuthUser;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const cookieHeader = req.headers.cookie || '';
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)placify_token=([^;]+)/);
  const cookieToken = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;

  const token = bearerToken || cookieToken;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid token. Please sign in again.' });
  }
}

export function requireRole(role: 'admin' | 'student') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({
        error: `Access denied. This resource requires ${role === 'admin' ? 'Administrator' : 'Student'} privileges.`,
      });
    }
    next();
  };
}
