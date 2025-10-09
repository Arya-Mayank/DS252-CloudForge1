import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.config';
import userModel from '../models/user.model';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'instructor' | 'student';
  };
}

/**
 * Verify JWT token and attach user to request
 */
export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.error('❌ No token provided in authorization header');
      res.status(401).json({ error: 'Authentication token required' });
      return;
    }

    const decoded = jwt.verify(token, jwtConfig.secret) as any;
    
    // Verify user still exists
    const user = await userModel.findById(decoded.id);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Check if user has instructor role
 */
export const requireInstructor = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'instructor') {
    res.status(403).json({ error: 'Instructor access required' });
    return;
  }

  next();
};

/**
 * Check if user has student role
 */
export const requireStudent = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'student') {
    res.status(403).json({ error: 'Student access required' });
    return;
  }

  next();
};

/**
 * Check if user is either instructor or student (any authenticated user)
 */
export const requireAuth = authenticateToken;

