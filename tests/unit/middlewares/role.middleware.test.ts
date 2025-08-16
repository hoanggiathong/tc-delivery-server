import { Response, NextFunction } from 'express';
import { requireRole, canViewUsers, canCreateUser } from '@/middlewares/role.middleware';
import { AuthRequest, UserRole } from '@/types';

describe('Role Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('requireRole', () => {
    it('should allow access when user has required role', () => {
      // Setup
      mockRequest.user = {
        userId: 'user1',
        username: 'admin',
        role: UserRole.ADMIN,
      };

      const middleware = requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]);

      // Execute
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      // Verify
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access when user lacks required role', () => {
      // Setup
      mockRequest.user = {
        userId: 'user1',
        username: 'user',
        role: UserRole.USER,
      };

      const middleware = requireRole([UserRole.ADMIN]);

      // Execute
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', () => {
      // Setup - no user in request
      const middleware = requireRole([UserRole.ADMIN]);

      // Execute
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow access when user has one of multiple required roles', () => {
      // Setup
      mockRequest.user = {
        userId: 'user1',
        username: 'manager',
        role: UserRole.MANAGER,
      };

      const middleware = requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPERADMIN]);

      // Execute
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      // Verify
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow SUPERADMIN access to SUPERADMIN role', () => {
      // Setup
      mockRequest.user = {
        userId: 'user1',
        username: 'superadmin',
        role: UserRole.SUPERADMIN,
      };

      const middleware = requireRole([UserRole.SUPERADMIN]);

      // Execute
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      // Verify
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('canViewUsers', () => {
    it('should allow SUPERADMIN to view all users', () => {
      // Setup
      mockRequest.user = {
        userId: 'user1',
        username: 'superadmin',
        role: UserRole.SUPERADMIN,
      };

      // Execute
      canViewUsers(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      // Verify
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', () => {
      // Setup - no user in request

      // Execute
      canViewUsers(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should set viewable roles for ADMIN user', () => {
      // Setup
      mockRequest.user = {
        userId: 'user1',
        username: 'admin',
        role: UserRole.ADMIN,
      };

      // Execute
      canViewUsers(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      // Verify
      expect(mockNext).toHaveBeenCalled();
      expect((mockRequest as any).viewableRoles).toBeDefined();
      expect((mockRequest as any).viewableRoles).toContain(UserRole.USER);
      expect((mockRequest as any).viewableRoles).toContain(UserRole.MANAGER);
    });

    it('should set viewable roles for MANAGER user', () => {
      // Setup
      mockRequest.user = {
        userId: 'user1',
        username: 'manager',
        role: UserRole.MANAGER,
      };

      // Execute
      canViewUsers(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      // Verify
      expect(mockNext).toHaveBeenCalled();
      expect((mockRequest as any).viewableRoles).toBeDefined();
      expect((mockRequest as any).viewableRoles).toContain(UserRole.USER);
      expect((mockRequest as any).viewableRoles).not.toContain(UserRole.ADMIN);
    });

    it('should deny access when user has no viewable roles', () => {
      // Setup
      mockRequest.user = {
        userId: 'user1',
        username: 'user',
        role: UserRole.USER,
      };

      // Execute
      canViewUsers(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'No permission to view users',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('canCreateUser', () => {
    it('should allow SUPERADMIN to create any user role', () => {
      // Setup
      mockRequest.user = {
        userId: 'user1',
        username: 'superadmin',
        role: UserRole.SUPERADMIN,
      };
      mockRequest.body = { role: UserRole.ADMIN };

      // Execute
      canCreateUser(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      // Verify
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to create MANAGER and USER roles', () => {
      // Setup
      mockRequest.user = {
        userId: 'user1',
        username: 'admin',
        role: UserRole.ADMIN,
      };
      mockRequest.body = { role: UserRole.MANAGER };

      // Execute
      canCreateUser(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      // Verify
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny ADMIN from creating SUPERADMIN role', () => {
      // Setup
      mockRequest.user = {
        userId: 'user1',
        username: 'admin',
        role: UserRole.ADMIN,
      };
      mockRequest.body = { role: UserRole.SUPERADMIN };

      // Execute
      canCreateUser(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: `No permission to create user with role: ${UserRole.SUPERADMIN}`,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny MANAGER from creating USER role', () => {
      // Setup
      mockRequest.user = {
        userId: 'user1',
        username: 'manager',
        role: UserRole.MANAGER,
      };
      mockRequest.body = { role: UserRole.USER };

      // Execute
      canCreateUser(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: `No permission to create user with role: ${UserRole.USER}`,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny MANAGER from creating ADMIN role', () => {
      // Setup
      mockRequest.user = {
        userId: 'user1',
        username: 'manager',
        role: UserRole.MANAGER,
      };
      mockRequest.body = { role: UserRole.ADMIN };

      // Execute
      canCreateUser(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: `No permission to create user with role: ${UserRole.ADMIN}`,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', () => {
      // Setup - no user in request
      mockRequest.body = { role: UserRole.USER };

      // Execute
      canCreateUser(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should default to USER role when no role specified in body and deny MANAGER', () => {
      // Setup
      mockRequest.user = {
        userId: 'user1',
        username: 'manager',
        role: UserRole.MANAGER,
      };
      mockRequest.body = {}; // No role specified

      // Execute
      canCreateUser(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      // Verify - MANAGER cannot create USER (default role)
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: `No permission to create user with role: ${UserRole.USER}`,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny USER from creating any user role', () => {
      // Setup
      mockRequest.user = {
        userId: 'user1',
        username: 'user',
        role: UserRole.USER,
      };
      mockRequest.body = { role: UserRole.USER };

      // Execute
      canCreateUser(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      // Verify
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: `No permission to create user with role: ${UserRole.USER}`,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
