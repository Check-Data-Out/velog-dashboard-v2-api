import express, { Router } from 'express';
import pool from '@/configs/db.config';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { validateRequestDto } from '@/middlewares/validation.middleware';
import { TotalStatsRepository } from '@/repositories/totalStats.repository';
import { TotalStatsService } from '@/services/totalStats.service';
import { TotalStatsController } from '@/controllers/totalStats.controller';
import { GetTotalStatsQueryDto } from '@/types';

const router: Router = express.Router();

const totalStatsRepository = new TotalStatsRepository(pool);
const totalStatsService = new TotalStatsService(totalStatsRepository);
const totalStatsController = new TotalStatsController(totalStatsService);

/**
 * @swagger
 * /total-stats:
 *   get:
 *     summary: 전체 통계 조회
 *     description: 사용자의 전체 조회수/좋아요/게시글 수 변동 통계를 기간별로 조회합니다.
 *     tags:
 *       - TotalStats
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: number
 *           enum: [7, 30]
 *           default: 7
 *         description: 조회 기간 (일수)
 *         example: 7
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: ['view', 'like', 'post']
 *         description: 통계 타입 (view=조회수, like=좋아요, post=게시글수)
 *         example: "view"
 *     responses:
 *       '200':
 *         description: 전체 통계 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TotalStatsResponseDto'
 *             example:
 *               success: true
 *               message: "전체 조회수 변동 조회에 성공하였습니다."
 *               data:
 *                 - date: "2025-05-23T15:00:00.000Z"
 *                   value: 619
 *                 - date: "2025-05-24T15:00:00.000Z"
 *                   value: 919
 *                 - date: "2025-05-30T15:00:00.000Z"
 *                   value: 1919
 *               error: null
 *       '400':
 *         description: 잘못된 요청 (필수 파라미터 누락 또는 잘못된 값)
 *       '401':
 *         description: 인증되지 않은 사용자
 *       '500':
 *         description: 서버 오류 / 데이터베이스 조회 오류
 */
router.get(
  '/total-stats',
  authMiddleware.verify,
  validateRequestDto(GetTotalStatsQueryDto, 'query'),
  totalStatsController.getTotalStats,
);

export default router;