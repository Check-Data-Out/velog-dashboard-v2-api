import pool from '@/configs/db.config';
import express, { Router } from 'express';
import { LeaderboardRepository } from '@/repositories/leaderboard.repository';
import { SvgService } from '@/services/svg.service';
import { SvgController } from '@/controllers/svg.controller';
import { validateRequestDto } from '@/middlewares/validation.middleware';
import { GetSvgBadgeQueryDto } from '@/types';

const router: Router = express.Router();

const leaderboardRepository = new LeaderboardRepository(pool);
const svgService = new SvgService(leaderboardRepository);
const svgController = new SvgController(svgService);

/**
 * @swagger
 * /api/{username}/badge:
 *   get:
 *     summary: 사용자 배지 데이터 조회
 *     tags:
 *       - SVG
 *     security: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: 조회할 사용자명
 *         example: ljh3478
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [default, simple]
 *           default: default
 *     responses:
 *       '200':
 *         description: 배지 데이터 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     username:
 *                       type: string
 *                     totalViews:
 *                       type: number
 *                     totalLikes:
 *                       type: number
 *                     totalPosts:
 *                       type: number
 *                     viewDiff:
 *                       type: number
 *                     likeDiff:
 *                       type: number
 *                     postDiff:
 *                       type: number
 *                 recentPosts:
 *                   type: array
 *                   items:
 *                     type: object
 *       '404':
 *         description: 사용자를 찾을 수 없음
 *       '500':
 *         description: 서버 오류
 */
router.get('/:username/badge', validateRequestDto(GetSvgBadgeQueryDto, 'query'), svgController.getSvgBadge);

export default router;
