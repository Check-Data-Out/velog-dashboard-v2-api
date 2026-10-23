import express, { Router } from 'express';
import pool from '@/configs/db.config';
import { UserController } from '@/controllers/user.controller';
import { UserRepository } from '@/repositories/user.repository';
import { UserService } from '@/services/user.service';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { validateRequestDto } from '@/middlewares/validation.middleware';
import { LoginRequestDto, QRLoginConfirmRequestDto } from '@/types';

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
 *         description: 쿠키가 삭제되고 이 사용자의 모든 기기 세션이 무효가 되며 성공적으로 로그아웃함
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
 *     summary: 사용자 정보 조회, auth 미들웨어 객체 그대로 사용
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
 *       - SessionCookieAuth: []
 *     responses:
 *       200:
 *         description: QR 로그인 토큰 생성 성공
 */
router.post('/qr-login', authMiddleware.verify, userController.createToken);

/**
 * @swagger
 * /qr-login:
 *   get:
 *     summary: QR 코드 URL 진입점. 토큰을 소비하지 않고 FE 확인 화면으로 리디렉션
 *     tags: [QRLogin]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: false
 *         schema:
 *           type: string
 *         description: QR 코드에 담긴 토큰. 검증하지 않고 그대로 전달한다
 *     responses:
 *       302:
 *         description: '/qr-login?token=<토큰> 으로 리디렉션. 토큰이 없거나 문자열이 아니면 /qr-login'
 */
router.get('/qr-login', userController.getToken);

/**
 * @swagger
 * /qr-login/confirm:
 *   post:
 *     summary: 휴대폰에서 QR 로그인 확인 (토큰 1회 소비 후 세션 발급)
 *     tags: [QRLogin]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QRLoginConfirmRequestDto'
 *     responses:
 *       '200':
 *         description: 토큰을 소비하고 세션 쿠키를 발급함
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: 세션 쿠키
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmptyResponseDto'
 *       '400':
 *         description: DTO 검증 실패 / 만료됐거나 이미 사용된 토큰
 *       '401':
 *         description: 로그인할 수 없는 사용자 (없거나 비활성)
 */
router.post('/qr-login/confirm', validateRequestDto(QRLoginConfirmRequestDto, 'body'), userController.confirmToken);

/**
 * @swagger
 * /user/newsletter-unsubscribe:
 *   get:
 *     tags:
 *       - User
 *     summary: 뉴스레터 구독 해제 (메일에서 바로 접근)
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: 구독을 해제할 이메일
 *     responses:
 *       302:
 *         description: 뉴스레터 구독 해제 성공 후 메인 페이지로 리디렉션
 */
router.get('/user/newsletter-unsubscribe', userController.unsubscribeNewsletter);

export default router;
