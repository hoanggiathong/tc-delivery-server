//npx ts-node -r tsconfig-paths/register \ src/scripts/create-mobile-test-account.ts
import 'dotenv/config';

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { MobileCustomerAccount } from '@/modules/mobile-customer/mobile-customer-account.model';

const DEFAULT_TEST_NAME = 'Tài khoản Test';
const DEFAULT_TEST_PHONE = '0901622659';
const DEFAULT_TEST_PASSWORD = '123456';

const getMongoUri = (): string => {
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.MONGO_URL ||
    process.env.DATABASE_URL ||
    process.env.DB_URI ||
    process.env.DB_URL;

  if (!uri) {
    throw new Error(
      [
        'Không tìm thấy biến kết nối MongoDB.',
        'Đã kiểm tra các biến:',
        'MONGODB_URI, MONGO_URI, MONGO_URL, DATABASE_URL, DB_URI, DB_URL.',
        `Thư mục hiện tại: ${process.cwd()}`,
      ].join(' ')
    );
  }

  return uri;
};

const normalizeVietnamPhone = (input: string): string => {
  const digits = String(input || '').replace(/\D/g, '');

  if (digits.startsWith('0084') && digits.length === 13) {
    return `+84${digits.slice(4)}`;
  }

  if (digits.startsWith('84') && digits.length === 11) {
    return `+${digits}`;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `+84${digits.slice(1)}`;
  }

  if (digits.length === 9 && !digits.startsWith('0')) {
    return `+84${digits}`;
  }

  return String(input || '').trim();
};

const assertValidPhone = (phone: string): void => {
  if (!/^\+84\d{9}$/.test(phone)) {
    throw new Error(`Số điện thoại test không hợp lệ: ${phone}`);
  }
};

const maskMongoUri = (uri: string): string => {
  return uri.replace(/\/\/([^:@/]+):([^@/]+)@/, '//***:***@');
};

const main = async (): Promise<void> => {
  const mongoUri = getMongoUri();

  const name = String(process.env.MOBILE_TEST_ACCOUNT_NAME || DEFAULT_TEST_NAME).trim();

  const phone = normalizeVietnamPhone(process.env.MOBILE_TEST_ACCOUNT_PHONE || DEFAULT_TEST_PHONE);

  const password = String(process.env.MOBILE_TEST_ACCOUNT_PASSWORD || DEFAULT_TEST_PASSWORD);

  if (!name) {
    throw new Error('Tên tài khoản test không được để trống');
  }

  assertValidPhone(phone);

  if (password.length < 6) {
    throw new Error('Mật khẩu test phải có ít nhất 6 ký tự');
  }

  console.log(`Đang kết nối MongoDB: ${maskMongoUri(mongoUri)}`);

  await mongoose.connect(mongoUri);

  const passwordHash = await bcrypt.hash(password, 12);

  const now = new Date();

  const account = await MobileCustomerAccount.findOneAndUpdate(
    {
      phone,
    },
    {
      $set: {
        name,
        passwordHash,
        isActive: true,
        phoneVerifiedAt: now,
        acceptedTermsAt: now,
        lastLoginAt: null,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  ).select('_id name phone isActive phoneVerifiedAt');

  if (!account) {
    throw new Error('Không thể tạo tài khoản test');
  }

  console.log('');
  console.log('Tạo tài khoản test thành công');
  console.log('--------------------------------');
  console.log(`ID            : ${String(account._id)}`);
  console.log(`Họ tên        : ${account.name}`);
  console.log(`Số điện thoại : ${account.phone}`);
  console.log(`Mật khẩu      : ${password}`);
  console.log(`Hoạt động     : ${account.isActive}`);
  console.log('--------------------------------');
  console.log('');
};

main()
  .catch((error: unknown) => {
    console.error('Tạo tài khoản test thất bại:', error instanceof Error ? error.message : error);

    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
