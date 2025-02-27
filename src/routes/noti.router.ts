import express, { Router } from 'express';
import pool from '@/configs/db.config';

import { authMiddleware } from '@/middlewares/auth.middleware';
import { NotiRepository } from '@/repositories/noti.repository';
import { NotiService } from '@/services/noti.service';
import { NotiController } from '@/controllers/noti.controller';

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: 알림 관련 API
 */
const router: Router = express.Router();

const notiRepository = new NotiRepository(pool);
const notiService = new NotiService(notiRepository);
const notiController = new NotiController(notiService);

/**
 * @swagger
 * /notis:
 *   get:
 *     summary: 공지 게시글 목록 전체 조회
 *     description: 사용자의 알림 게시글 목록을 조회합니다
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 알림 게시글 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotiPostsResponseDto'
 *       401:
 *         description: 인증되지 않은 사용자
 *       500:
 *         description: 서버 에러
 */
router.get('/notis', authMiddleware.login, notiController.getAllNotiPosts);

export default router;
