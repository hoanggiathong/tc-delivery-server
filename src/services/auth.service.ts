import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, JWTPayload } from '@/types';
import { LoginRequest, RegisterRequest } from '@/schemas/auth.schema';

// Mock database - trong thực tế bạn sẽ sử dụng database thật
const users: User[] = [
  {
    id: '1',
    username: 'admin',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

export class AuthService {
  async register(data: RegisterRequest): Promise<{ user: Omit<User, 'password'> }> {
    // Kiểm tra username đã tồn tại
    const existingUser = users.find(u => u.username === data.username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Tạo user mới
    const newUser: User = {
      id: (users.length + 1).toString(),
      username: data.username,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    users.push(newUser);

    // Return user without password
    const { password, ...userWithoutPassword } = newUser;
    return { user: userWithoutPassword };
  }

  async login(data: LoginRequest): Promise<{ user: Omit<User, 'password'>, token: string }> {
    // Tìm user
    const user = users.find(u => u.username === data.username);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Kiểm tra password
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Tạo JWT token
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async getUserById(id: string): Promise<Omit<User, 'password'> | null> {
    const user = users.find(u => u.id === id);
    if (!user) return null;

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}