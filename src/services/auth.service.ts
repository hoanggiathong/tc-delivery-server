import jwt from 'jsonwebtoken';
import { User, IUser } from '@/models/user.model';
import { JWTPayload, IUserResponse } from '@/types';
import { LoginRequest, RegisterRequest } from '@/schemas/auth.schema';

export class AuthService {
  async register(data: RegisterRequest): Promise<{ user: IUserResponse }> {
    try {
      // Kiểm tra username đã tồn tại
      const existingUser = await User.findOne({ username: data.username });
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Tạo user mới
      const newUser = new User({
        username: data.username,
        password: data.password
      });

      await newUser.save();

      // Return user without password
      const userResponse: IUserResponse = {
        id: newUser._id.toString(),
        username: newUser.username,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt
      };

      return { user: userResponse };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Registration failed');
    }
  }

  async login(data: LoginRequest): Promise<{ user: IUserResponse, token: string }> {
    try {
      // Tìm user và include password để verify
      const user = await User.findOne({ username: data.username }).select('+password');
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Kiểm tra password
      const isPasswordValid = await user.comparePassword(data.password);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Tạo JWT token
      const payload: JWTPayload = {
        userId: user._id.toString(),
        username: user.username,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });

      // Return user without password
      const userResponse: IUserResponse = {
        id: user._id.toString(),
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      return { user: userResponse, token };
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

      const userResponse: IUserResponse = {
        id: user._id.toString(),
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      return userResponse;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  async getAllUsers(): Promise<IUserResponse[]> {
    try {
      const users = await User.find({}).sort({ createdAt: -1 });

      return users.map(user => ({
        id: user._id.toString(),
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));
    } catch (error) {
      console.error('Error getting all users:', error);
      throw new Error('Failed to fetch users');
    }
  }
}