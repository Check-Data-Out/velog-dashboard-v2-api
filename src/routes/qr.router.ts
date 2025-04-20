import express, { Router } from 'express';
import pool from '@/configs/db.config';

import { authMiddleware } from '@/middlewares/auth.middleware';
import { QRLoginTokenRepository } from '@/repositories/qr.repository';
import { QRLoginTokenService } from '@/services/qr.service';
import { QRLoginController } from '@/controllers/qr.controller';

const router: Router = express.Router();

const qrRepository = new QRLoginTokenRepository(pool);
const qrService = new QRLoginTokenService(qrRepository);
const qrController = new QRLoginController(qrService);

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
 *     summary: QR 로그인 토큰 조회
 *     tags: [QRLogin]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: 조회할 QR 토큰
 *     responses:
 *       200:
 *         description: 유효한 토큰
 *       404:
 *         description: 토큰 없음 or 만료
 */
router.get('/qr-login', qrController.getToken);

export default router;
