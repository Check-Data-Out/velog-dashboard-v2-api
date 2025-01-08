import express, { Router } from 'express';
import pool from '@/configs/db.config';
import { UserController } from '@/controllers/user.controller';
import { UserRepository } from '@/repositories/user.repository';
import { UserService } from '@/services/user.service';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { validateRequestDto } from '@/middlewares/validation.middleware';
import { VelogUserLoginDto } from '@/types';

const router: Router = express.Router();

const userRepository = new UserRepository(pool);
const userService = new UserService(userRepository);
const userController = new UserController(userService);

/**
 * @swagger
 * /login:
 *   post:
 *     tags:
 *       - User
 *     summary: 사용자 로그인
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequestDto'
 *     responses:
 *       '200':
 *         description: 성공
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: 인증 쿠키
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponseDto'
 *       '400':
 *         description: DTO 검증 실패
 *       '401':
 *         description: 로그인 실패 / 그룹 id 조회 실패 / 유효하지 않은 토큰
 *       '500':
 *         description: 서버 오류 / 데이터 베이스 조회 오류
 */
router.post('/login', authMiddleware.login, validateRequestDto(VelogUserLoginDto, 'user'), userController.login);

/**
 * @swagger
 * /logout:
 *   post:
 *     tags:
 *       - User
 *     summary: 사용자 로그아웃
 *     responses:
 *       '200':
 *         description: 쿠키가 삭제되며 성공적으로 로그아웃함
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmptyResponseDto'
 */
router.post('/logout', userController.logout);

/**
 * @swagger
 * /me:
 *   get:
 *     tags:
 *       - User
 *     summary: 사용자 정보 조회
 *     responses:
 *       '200':
 *         description: 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponseDto'
 */
router.get('/me', authMiddleware.login, userController.fetchCurrentUser);

export default router;
