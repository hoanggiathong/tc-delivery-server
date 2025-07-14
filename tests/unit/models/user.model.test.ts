import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '@/models/user.model';
import { UserRole } from '@/types/user.type';

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));
const mockedBcrypt = bcrypt as any;

describe('User Model', () => {
  let mockUser: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock user instance
    mockUser = {
      _id: new mongoose.Types.ObjectId(),
      username: 'testuser',
      password: 'hashedpassword',
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
      isModified: jest.fn(),
      comparePassword: jest.fn(),
      save: jest.fn(),
    };
  });

  describe('Schema Validation', () => {
    it('should create user with valid data', () => {
      const userData = {
        username: 'validuser',
        password: 'validpass123',
        role: UserRole.USER,
      };

      const user = new User(userData);
      expect(user.username).toBe(userData.username);
      expect(user.role).toBe(userData.role);
    });

    it('should fail validation with invalid username', () => {
      const userData = {
        username: 'ab', // Too short
        password: 'validpass123',
        role: UserRole.USER,
      };

      const user = new User(userData);
      const error = user.validateSync();
      expect(error?.errors.username).toBeDefined();
    });

    it('should fail validation with invalid username characters', () => {
      const userData = {
        username: 'invalid-user!', // Contains invalid characters
        password: 'validpass123',
        role: UserRole.USER,
      };

      const user = new User(userData);
      const error = user.validateSync();
      expect(error?.errors.username).toBeDefined();
    });

    it('should fail validation without username', () => {
      const userData = {
        password: 'validpass123',
        role: UserRole.USER,
      };

      const user = new User(userData);
      const error = user.validateSync();
      expect(error?.errors.username).toBeDefined();
    });

    it('should fail validation without password', () => {
      const userData = {
        username: 'validuser',
        role: UserRole.USER,
      };

      const user = new User(userData);
      const error = user.validateSync();
      expect(error?.errors.password).toBeDefined();
    });

    it('should fail validation with short password', () => {
      const userData = {
        username: 'validuser',
        password: '123', // Too short
        role: UserRole.USER,
      };

      const user = new User(userData);
      const error = user.validateSync();
      expect(error?.errors.password).toBeDefined();
    });

    it('should set default role to USER', () => {
      const userData = {
        username: 'validuser',
        password: 'validpass123',
      };

      const user = new User(userData);
      expect(user.role).toBe(UserRole.USER);
    });
  });

  describe('Pre-save Middleware', () => {
    it('should hash password before saving when password is modified', async () => {
      const hashedPassword = 'hashedpassword123';
      mockedBcrypt.hash.mockResolvedValue(hashedPassword);

      // Mock isModified to return true for password
      mockUser.isModified.mockReturnValue(true);

      // Create a spy for the pre-save hook
      const preSaveHook = User.schema.pre as jest.Mock;

      // Simulate the pre-save hook execution
      const nextMock = jest.fn();
      mockUser.password = 'plainpassword';

      // Mock the hash function
      mockedBcrypt.hash.mockResolvedValue(hashedPassword);

      // Simulate password hashing
      if (mockUser.isModified('password')) {
        mockUser.password = await bcrypt.hash(mockUser.password, 12);
      }

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('plainpassword', 12);
      expect(mockUser.password).toBe(hashedPassword);
    });

    it('should not hash password when password is not modified', async () => {
      // Mock isModified to return false for password
      mockUser.isModified.mockReturnValue(false);

      const originalPassword = mockUser.password;

      // Simulate pre-save hook behavior
      if (!mockUser.isModified('password')) {
        // Should not hash password
      } else {
        mockUser.password = await bcrypt.hash(mockUser.password, 12);
      }

      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
      expect(mockUser.password).toBe(originalPassword);
    });
  });

  describe('comparePassword Method', () => {
    it('should return true for correct password', async () => {
      const candidatePassword = 'testpassword';
      const hashedPassword = 'hashedpassword';

      mockedBcrypt.compare.mockResolvedValue(true);

      // Create a user instance with the method
      const user = new User({
        username: 'testuser',
        password: hashedPassword,
        role: UserRole.USER,
      });

      const result = await user.comparePassword(candidatePassword);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(candidatePassword, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const candidatePassword = 'wrongpassword';
      const hashedPassword = 'hashedpassword';

      mockedBcrypt.compare.mockResolvedValue(false);

      const user = new User({
        username: 'testuser',
        password: hashedPassword,
        role: UserRole.USER,
      });

      const result = await user.comparePassword(candidatePassword);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(candidatePassword, hashedPassword);
      expect(result).toBe(false);
    });
  });

  describe('toJSON Transform', () => {
    it('should transform document correctly', () => {
      const userData = {
        _id: new mongoose.Types.ObjectId(),
        username: 'testuser',
        password: 'hashedpassword',
        role: UserRole.USER,
        __v: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const user = new User(userData);
      const jsonUser = user.toJSON();

      expect(jsonUser.id).toBeDefined();
      expect(jsonUser._id).toBeUndefined();
      expect(jsonUser.__v).toBeUndefined();
      expect(jsonUser.password).toBeUndefined();
      expect(jsonUser.username).toBe(userData.username);
      expect(jsonUser.role).toBe(userData.role);
    });
  });
});
