import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole, canViewRole, canCreateRole } from '@/types';

/**
 * Middleware to check if user has required role
 */
export const requireRole = (requiredRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!requiredRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user can view users with specific roles
 */
export const canViewUsers = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  // Superadmin can view all
  if (req.user.role === UserRole.SUPERADMIN) {
    return next();
  }

  // Store user's viewable roles in request for later use
  const viewableRoles: UserRole[] = [];

  Object.values(UserRole).forEach(role => {
    if (canViewRole(req.user!.role, role)) {
      viewableRoles.push(role);
    }
  });

  if (viewableRoles.length === 0) {
    res.status(403).json({
      success: false,
      message: 'No permission to view users'
    });
    return;
  }

  // Add viewable roles to request
  (req as any).viewableRoles = viewableRoles;
  next();
};

/**
 * Middleware to check if user can create users with specific role
 */
export const canCreateUser = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  const targetRole = req.body.role || UserRole.USER;

  if (!canCreateRole(req.user.role, targetRole)) {
    res.status(403).json({
      success: false,
      message: `No permission to create user with role: ${targetRole}`
    });
    return;
  }

  next();
};