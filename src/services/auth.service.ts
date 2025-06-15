import jwt from 'jsonwebtoken';
import { User, IUser } from '@/models/user.model';
import { JWTPayload, IUserResponse, transformUserToResponse, transformUsersToResponse } from '@/types';
import { LoginRequest, RegisterRequest } from '@/schemas/auth.schema';

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
        password: data.password
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

      // Create JWT token
      const payload: JWTPayload = {
        userId: user._id.toString(),
        username: user.username,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });

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
      const user = await User.findById(id);
      if (!user) return null;

      return transformUserToResponse(user);
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  async getAllUsers(): Promise<IUserResponse[]> {
    try {
      const users = await User.find({}).sort({ createdAt: -1 });
      return transformUsersToResponse(users);
    } catch (error) {
      console.error('Error getting all users:', error);
      throw new Error('Failed to fetch users');
    }
  }
}