import jwt from 'jsonwebtoken';
import { User } from '@/models/user.model';
import { UserRoute } from '@/models/user-route.model';
import {
  JWTPayload,
  IUserResponse,
  IUserLean,
  transformUserToResponse,
  transformUserLeanToResponse,
  transformUsersLeanToResponse,
  UserRole,
} from '@/types';
import {
  LoginRequest,
  RegisterRequest,
  CreateUserRequest,
  UpdateSelectedRouteRequest,
} from '@/schemas/auth.schema';
import { UserDeviceService } from '@/services/user-device.service';

export class AuthService {
  private userDeviceService: UserDeviceService;

  constructor() {
    this.userDeviceService = new UserDeviceService();
  }

  async register(data: RegisterRequest): Promise<{ user: IUserResponse }> {
    try {
      // Check if username already exists
      const existingUser = await User.findOne({ username: data.username });
      if (existingUser) {
        throw new Error('Tên đăng nhập đã tồn tại');
      }

      // Create new user
      const newUser = new User({
        username: data.username,
        password: data.password,
        name: data.name,
        role: data.role || UserRole.USER,
      });

      await newUser.save();

      return { user: transformUserToResponse(newUser) };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Đăng ký tài khoản thất bại');
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
        name: data.name,
        role: data.role,
      });

      await newUser.save();

      return { user: transformUserToResponse(newUser) };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Tạo tài khoản thất bại');
    }
  }

  async login(
    data: LoginRequest,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<{ user: IUserResponse; token: string }> {
    try {
      // Find user and include password to verify
      const user = await User.findOne({ username: data.username }, '+password');
      if (!user) {
        throw new Error('Tên đăng nhập hoặc mật khẩu không đúng');
      }

      // Check password
      const isPasswordValid = await user.comparePassword(data.password);
      if (!isPasswordValid) {
        throw new Error('Tên đăng nhập hoặc mật khẩu không đúng');
      }

      // If user has no selectedRouteId, try to auto-assign from USER_ROUTES
      if (!user.selectedRouteId) {
        const userRoute = await UserRoute.findOne({ userId: user._id }).select('routeId').lean();

        if (userRoute) {
          // Update user with the first found route
          await User.findByIdAndUpdate(user._id, {
            selectedRouteId: userRoute.routeId,
          });
          // Update the user object for response
          user.selectedRouteId = userRoute.routeId;
        }
      }

      // Alternative JWT signing approach
      const payload: JWTPayload = {
        userId: user._id.toString(),
        username: user.username,
        role: user.role,
      };

      const secretKey = process.env.JWT_SECRET;
      if (!secretKey) {
        throw new Error('Hệ thống chưa cấu hình JWT_SECRET');
      }

      // Use explicit typing
      const expiresIn: number = parseInt(process.env.JWT_EXPIRES_IN || '604800'); // 7 days in seconds
      const signOptions: jwt.SignOptions = {
        expiresIn,
      };

      const token = jwt.sign(payload, secretKey, signOptions);

      try {
        await this.userDeviceService.trackLogin({
          userId: user._id.toString(),
          deviceId: data.deviceId,
          deviceName: data.deviceName,
          browser: data.browser,
          os: data.os,
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
          currentRouteId: user.selectedRouteId?.toString() || null,
        });
      } catch (deviceError) {
        if (
          deviceError instanceof Error &&
          deviceError.message === 'Thiết bị này đã bị khóa bởi quản trị viên.'
        ) {
          throw deviceError;
        }

        console.warn('Track login device failed:', deviceError);
      }

      return { user: transformUserToResponse(user), token };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Đăng nhập thất bại');
    }
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<IUserResponse[]> {
    try {
      const users = await User.find({}).select('-password').sort({ createdAt: -1 }).lean();
      return transformUsersLeanToResponse(users as IUserLean[]);
    } catch (error) {
      throw new Error('Không thể lấy danh sách tài khoản');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<IUserResponse | null> {
    try {
      const user = await User.findById(userId).select('-password').lean();
      return user ? transformUserLeanToResponse(user as IUserLean) : null;
    } catch (error) {
      throw new Error('Không thể lấy thông tin tài khoản');
    }
  }

  /**
   * Get users by roles
   */
  async getUsersByRoles(roles: UserRole[]): Promise<IUserResponse[]> {
    try {
      const users = await User.find({ role: { $in: roles } })
        .select('-password')
        .sort({ createdAt: -1 })
        .lean();
      return transformUsersLeanToResponse(users as IUserLean[]);
    } catch (error) {
      throw new Error('Không thể lấy danh sách tài khoản theo quyền');
    }
  }

  /**
   * Update selected route for user
   */
  async updateSelectedRoute(
    userId: string,
    data: UpdateSelectedRouteRequest,
    userRole: UserRole
  ): Promise<{ user: IUserResponse }> {
    try {
      if (data.selectedRouteId) {
        if (userRole === UserRole.USER) {
          const userRoute = await UserRoute.findOne({
            userId,
            routeId: data.selectedRouteId,
          }).lean();

          if (!userRoute) {
            throw new Error('Tuyến đường chưa được cấp cho tài khoản này');
          }
        }
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { selectedRouteId: data.selectedRouteId },
        { new: true }
      ).select('-password');

      if (!user) {
        throw new Error('Không tìm thấy tài khoản');
      }

      return { user: transformUserToResponse(user) };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Cập nhật tuyến đường thất bại');
    }
  }
}
