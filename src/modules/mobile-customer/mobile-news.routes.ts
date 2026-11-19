import { Router } from 'express';

import { MobileNewsController } from '@/controllers/mobile-news.controller';

const router = Router();

const controller = new MobileNewsController();

/**
 * Public news endpoints.
 *
 * Tin tức được hiển thị ngay tại màn hình đăng nhập nên hai API đọc
 * không yêu cầu access token. Các API tài khoản, đơn hàng, quét mã và
 * đơn tiền vẫn sử dụng authenticateCustomerToken trong router riêng.
 */
router.get('/', controller.list);

router.get('/:slug', controller.detail);

export default router;
