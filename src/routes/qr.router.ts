import express, { Router } from 'express';
import pool from '@/configs/db.config';

import { authMiddleware } from '@/middlewares/auth.middleware';
import { QRLoginTokenRepository } from '@/repositories/qr.repository';
import { QRLoginTokenService } from '@/services/qr.service';
import { QRLoginController } from '@/controllers/qr.controller';
import { UserRepository } from '@/repositories/user.repository';
import { UserService } from '@/services/user.service';

const router: Router = express.Router();

const qrRepository = new QRLoginTokenRepository(pool);
const userRepository = new UserRepository(pool);
const userService = new UserService(userRepository);
const qrService = new QRLoginTokenService(qrRepository);
const qrController = new QRLoginController(qrService, userService);

/**
 * @swagger
 * /api/qr-login:
 *   post:
 *     summary: QR 로그인 토큰 생성
 *     tags: [QRLogin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: QR 로그인 토큰 생성 성공
 */
router.post('/qr-login', authMiddleware.login, qrController.createToken);

/**
 * @swagger
 * /api/qr-login:
 *   get:
 *     summary: QR 로그인 토큰 조회 및 자동 로그인 처리
 *     tags: [QRLogin]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: 조회할 QR 토큰
 *     responses:
 *       302:
 *         description: 자동 로그인 완료 후 메인 페이지로 리디렉션
 *       400:
 *         description: 잘못된 토큰
 *       404:
 *         description: 만료 또는 존재하지 않는 토큰
 */
router.get('/qr-login', qrController.getToken);

export default router;
