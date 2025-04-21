import express, { Router } from 'express';
import { LeaderboardRepository } from '@/repositories/leaderboard.repository';
import pool from '@/configs/db.config';
import { LeaderboardService } from '@/services/leaderboard.service';
import { LeaderboardController } from '@/controllers/leaderboard.controller';
import { validateRequestDto } from '@/middlewares/validation.middleware';
import { GetLeaderboardQueryDto } from '@/types/dto/requests/getLeaderboardQuery.type';

const router: Router = express.Router();

const leaderboardRepository = new LeaderboardRepository(pool);
const leaderboardService = new LeaderboardService(leaderboardRepository);
const leaderboardController = new LeaderboardController(leaderboardService);

/**
 * @swagger
 * /leaderboard:
 *   get:
 *     summary: 리더보드 조회
 *     tags:
 *       - Leaderboard
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           $ref: '#/components/schemas/GetLeaderboardQueryDto/properties/type'
 *       - in: query
 *         name: sort
 *         schema:
 *           $ref: '#/components/schemas/GetLeaderboardQueryDto/properties/sort'
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
 *         description: 리더보드 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LeaderboardResponseDto'
 *       '500':
 *         description: 서버 오류 / 데이터 베이스 조회 오류
 */
router.get('/leaderboard', validateRequestDto(GetLeaderboardQueryDto, 'query'), leaderboardController.getLeaderboard);

export default router;
