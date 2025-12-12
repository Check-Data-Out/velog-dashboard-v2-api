import pool from '@/configs/db.config';
import express, { Router } from 'express';
import { SvgRepository } from '@/repositories/svg.repository';
import { SvgService } from '@/services/svg.service';
import { SvgController } from '@/controllers/svg.controller';
import { validateRequestDto } from '@/middlewares/validation.middleware';
import { GetSvgBadgeQueryDto } from '@/types';

const router: Router = express.Router();

const svgRepository = new SvgRepository(pool);
const svgService = new SvgService(svgRepository);
const svgController = new SvgController(svgService);

/**
 * @swagger
 * /api/{username}/badge:
 *   get:
 *     summary: 사용자 배지 SVG 조회
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
 *         example: six-standard
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [default, simple]
 *           default: default
 *       - in: query
 *         name: assets
 *         schema:
 *           type: string
 *           default: views,likes,posts
 *           example: views,likes,posts
 *       - in: query
 *         name: withrank
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: false
 *     responses:
 *       '200':
 *         description: SVG 배지 생성 성공
 *         content:
 *           image/svg+xml:
 *             schema:
 *               type: string
 *               example: <svg>...</svg>
 *       '404':
 *         description: 사용자를 찾을 수 없음
 *       '500':
 *         description: 서버 오류 / 데이터 베이스 조회 오류
 */
router.get(
  '/:username/badge',
  validateRequestDto(GetSvgBadgeQueryDto, 'query'),
  svgController.getSvgBadge as any,
);

export default router;
