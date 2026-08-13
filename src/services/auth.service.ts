import jwt from 'jsonwebtoken';
import { User } from '@/models/user.model';
import { Route } from '@/models/route.model';
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
import { UserService } from '@/services/user.service';
import { Types } from 'mongoose';

export class AuthService {
  private userDeviceService: UserDeviceService;
  private userService: UserService;

  constructor() {
    this.userDeviceService = new UserDeviceService();
    this.userService = new UserService();
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

      /**
       * Production-safe selected-route behavior:
       *
       * 1. If selectedRouteId already exists, NEVER auto-switch it when the Route
       *    was soft-deleted. User.selectedRouteId stays unchanged so a future
       *    restore can reactivate the same station.
       * 2. If selectedRouteId is genuinely missing, preserve the legacy login
       *    initialization behavior to avoid changing existing account onboarding.
       */
      if (!user.selectedRouteId) {
        let initialRouteId: Types.ObjectId | null = null;

        if (user.role === UserRole.USER) {
          const assignments = await UserRoute.find({ userId: user._id })
            .select('routeId')
            .sort({ createdAt: -1 })
            .lean();

          const orderedRouteIds = assignments.map(item => item.routeId).filter(Boolean);

          if (orderedRouteIds.length > 0) {
            const activeRoutes = await Route.find({
              _id: { $in: orderedRouteIds },
              isDeleted: { $ne: true },
            })
              .select('_id')
              .lean();

            const activeRouteIds = new Set(activeRoutes.map(route => route._id.toString()));
            const firstActiveAssignedRouteId = orderedRouteIds.find(routeId =>
              activeRouteIds.has(routeId.toString())
            );

            initialRouteId = firstActiveAssignedRouteId
              ? new Types.ObjectId(String(firstActiveAssignedRouteId))
              : null;
          }
        } else {
          const activeRoute = await Route.findOne({
            isDeleted: { $ne: true },
          })
            .select('_id')
            .sort({ createdAt: -1 })
            .lean();

          initialRouteId = activeRoute?._id ? new Types.ObjectId(String(activeRoute._id)) : null;
        }

        if (initialRouteId) {
          user.selectedRouteId = initialRouteId;
          await User.updateOne(
            { _id: user._id },
            {
              $set: {
                selectedRouteId: initialRouteId,
              },
            }
          );
        }
      }

      // Strict validation only. A deleted selectedRouteId resolves to null without mutation.
      const resolvedRoute = await this.userService.resolveActiveSelectedRoute(user._id.toString());
      const currentRouteId = resolvedRoute?.selectedRouteId ?? null;

      if (!data.deviceId) {
        throw new Error('Thiếu mã thiết bị đăng nhập. Vui lòng tải lại trang và đăng nhập lại.');
      }

      // Check and track login device before issuing JWT
      await this.userDeviceService.trackLogin({
        userId: user._id.toString(),
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        browser: data.browser,
        os: data.os,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        currentRouteId,
      });

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

      // Refresh so FE receives the persisted selection after optional initial-route setup.
      const refreshedUser = await User.findById(user._id);
      if (!refreshedUser) {
        throw new Error('Không tìm thấy tài khoản');
      }

      return { user: transformUserToResponse(refreshedUser), token };
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
        const activeRoute = await Route.exists({
          _id: data.selectedRouteId,
          isDeleted: { $ne: true },
        });

        if (!activeRoute) {
          throw new Error('Trạm không tồn tại hoặc đã ngừng hoạt động');
        }

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
