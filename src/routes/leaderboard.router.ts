import pool from '@/configs/db.config';
import express, { Router } from 'express';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { LeaderboardRepository } from '@/repositories/leaderboard.repository';
import { LeaderboardService } from '@/services/leaderboard.service';
import { LeaderboardController } from '@/controllers/leaderboard.controller';
import { validateRequestDto } from '@/middlewares/validation.middleware';
import { GetUserLeaderboardQueryDto, GetPostLeaderboardQueryDto } from '@/types/dto/requests/getLeaderboardQuery.type';

const router: Router = express.Router();

const leaderboardRepository = new LeaderboardRepository(pool);
const leaderboardService = new LeaderboardService(leaderboardRepository);
const leaderboardController = new LeaderboardController(leaderboardService);

/**
 * @swagger
 * /leaderboard/user:
 *   get:
 *     summary: 사용자 리더보드 조회
 *     tags:
 *       - Leaderboard
 *     parameters:
 *       - in: query
 *         name: sort
 *         schema:
 *           $ref: '#/components/schemas/UserLeaderboardSortType'
 *       - in: query
 *         name: dateRange
 *         schema:
 *           $ref: '#/components/schemas/GetLeaderboardQueryDto/properties/dateRange'
 *       - in: query
 *         name: limit
 *         schema:
 *           $ref: '#/components/schemas/GetLeaderboardQueryDto/properties/limit'
 *     responses:
 *       '200':
 *         description: 사용자 리더보드 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserLeaderboardResponseDto'
 *       '500':
 *         description: 서버 오류 / 데이터 베이스 조회 오류
 */
router.get(
  '/leaderboard/user',
  authMiddleware.verify,
  validateRequestDto(GetUserLeaderboardQueryDto, 'query'),
  leaderboardController.getUserLeaderboard,
);

/**
 * @swagger
 * /leaderboard/post:
 *   get:
 *     summary: 게시물 리더보드 조회
 *     tags:
 *       - Leaderboard
 *     parameters:
 *       - in: query
 *         name: sort
 *         schema:
 *           $ref: '#/components/schemas/PostLeaderboardSortType'
 *       - in: query
 *         name: dateRange
 *         schema:
 *           $ref: '#/components/schemas/GetLeaderboardQueryDto/properties/dateRange'
 *       - in: query
 *         name: limit
 *         schema:
 *           $ref: '#/components/schemas/GetLeaderboardQueryDto/properties/limit'
 *     responses:
 *       '200':
 *         description: 게시물 리더보드 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostLeaderboardResponseDto'
 *       '500':
 *         description: 서버 오류 / 데이터 베이스 조회 오류
 */
router.get(
  '/leaderboard/post',
  authMiddleware.verify,
  validateRequestDto(GetPostLeaderboardQueryDto, 'query'),
  leaderboardController.getPostLeaderboard,
);

export default router;
