import express, { Router } from 'express';
import pool from '@/configs/db.config';
import { UserController } from '@/controllers/user.controller';
import { UserRepository } from '@/repositories/user.repository';
import { UserService } from '@/services/user.service';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { validateRequestDto } from '@/middlewares/validation.middleware';
import { LoginRequestDto } from '@/types';

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
 *     security: []
 *     requestBody:
 *       required: true
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
router.post('/login', validateRequestDto(LoginRequestDto, 'body'), userController.login);

/**
 * @swagger
 * /login-sample:
 *   post:
 *     tags:
 *       - User
 *     summary: 샘플 사용자 로그인
 *     security: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: 비어있는 request body
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
 *       '500':
 *         description: 서버 오류 / 데이터 베이스 조회 오류
 */
router.post('/login-sample', userController.sampleLogin);

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
router.post('/logout', authMiddleware.verify, userController.logout);

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
router.get('/me', authMiddleware.verify, userController.fetchCurrentUser);

/**
 * @swagger
 * /qr-login:
 *   post:
 *     summary: QR 로그인 토큰 생성
 *     tags: [QRLogin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: QR 로그인 토큰 생성 성공
 */
router.post('/qr-login', authMiddleware.verify, userController.createToken);

/**
 * @swagger
 * /qr-login:
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
router.get('/qr-login', userController.getToken);

export default router;
