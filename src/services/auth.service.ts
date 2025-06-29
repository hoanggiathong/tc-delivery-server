import jwt from 'jsonwebtoken';
import { User, IUser } from '@/models/user.model';
import {
  JWTPayload,
  IUserResponse,
  IUserLean,
  transformUserToResponse,
  transformUserLeanToResponse,
  transformUsersLeanToResponse,
  UserRole
} from '@/types';
import { LoginRequest, RegisterRequest, CreateUserRequest } from '@/schemas/auth.schema';

export class AuthService {
  async register(data: RegisterRequest): Promise<{ user: IUserResponse }> {
    try {
      // Check if username already exists
      const existingUser = await User.findOne({ username: data.username });
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Create new user
      const newUser = new User({
        username: data.username,
        password: data.password,
        role: data.role || UserRole.USER
      });

      await newUser.save();

      return { user: transformUserToResponse(newUser) };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Registration failed');
    }
  }

  async createUser(data: CreateUserRequest): Promise<{ user: IUserResponse }> {
    try {
      // Check if username already exists
      const existingUser = await User.findOne({ username: data.username });
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Create new user with specified role
      const newUser = new User({
        username: data.username,
        password: data.password,
        role: data.role
      });

      await newUser.save();

      return { user: transformUserToResponse(newUser) };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('User creation failed');
    }
  }

  async login(data: LoginRequest): Promise<{ user: IUserResponse, token: string }> {
    try {
      // Find user and include password to verify
      const user = await User.findOne({ username: data.username }).select('+password');
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check password
      const isPasswordValid = await user.comparePassword(data.password);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Alternative JWT signing approach
      const payload: JWTPayload = {
        userId: user._id.toString(),
        username: user.username,
        role: user.role,
      };

      const secretKey = process.env.JWT_SECRET;
      if (!secretKey) {
        throw new Error('JWT_SECRET is not defined');
      }

      // Use explicit typing
      const expiresIn: number = parseInt(process.env.JWT_EXPIRES_IN || '604800'); // 7 days in seconds
      const signOptions: jwt.SignOptions = {
        expiresIn,
      };

      const token = jwt.sign(payload, secretKey, signOptions);

      return { user: transformUserToResponse(user), token };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Login failed');
    }
  }

  async getUserById(id: string): Promise<IUserResponse | null> {
    try {
      const user = await User.findById(id).lean();
      if (!user) return null;

      return transformUserLeanToResponse(user as IUserLean);
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  async getAllUsers(): Promise<IUserResponse[]> {
    try {
      const users = await User.find({}).sort({ createdAt: -1 }).lean();
      return transformUsersLeanToResponse(users as IUserLean[]);
    } catch (error) {
      console.error('Error getting all users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  async getUsersByRoles(roles: UserRole[]): Promise<IUserResponse[]> {
    try {
      const users = await User.find({ role: { $in: roles } }).sort({ createdAt: -1 }).lean();
      return transformUsersLeanToResponse(users as IUserLean[]);
    } catch (error) {
      console.error('Error getting users by roles:', error);
      throw new Error('Failed to fetch users');
    }
  }
}