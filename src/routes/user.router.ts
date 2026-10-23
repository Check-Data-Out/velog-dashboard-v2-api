import express, { Router } from 'express';
import pool from '@/configs/db.config';
import { UserController } from '@/controllers/user.controller';
import { UserRepository } from '@/repositories/user.repository';
import { UserService } from '@/services/user.service';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { validateRequestDto } from '@/middlewares/validation.middleware';
import {
  LoginRequestDto,
  NewsletterUnsubscribeQueryDto,
  QRLoginConfirmRequestDto,
  QRLoginStatusQueryDto,
} from '@/types';

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
 * /qr-login/status:
 *   get:
 *     summary: 데스크톱에서 발급한 본인 QR 토큰의 상태 조회 (폴링용)
 *     tags: [QRLogin]
 *     security:
 *       - SessionCookieAuth: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 10
 *           maxLength: 10
 *         description: 조회할 QR 토큰
 *     responses:
 *       '200':
 *         description: 토큰 상태. 다른 사용자의 토큰이나 없는 토큰도 expired 로 응답한다
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QRLoginStatusResponseDto'
 *       '400':
 *         description: DTO 검증 실패
 *       '401':
 *         description: 인증 실패
 */
router.get(
  '/qr-login/status',
  authMiddleware.verify,
  validateRequestDto(QRLoginStatusQueryDto, 'query'),
  userController.getTokenStatus,
);

/**
 * @swagger
 * /user/newsletter-unsubscribe:
 *   get:
 *     tags:
 *       - User
 *     summary: 뉴스레터 수신거부 메일 링크 진입점
 *     description: |
 *       서명 링크(uid·sig)는 상태를 바꾸지 않고 FE 확인 페이지로 리디렉션한다. 서명 검증은 POST 에서 한다.
 *       기존 email 링크는 서명 링크로 옮기는 동안 바로 수신거부한 뒤 메인 페이지로 리디렉션한다.
 *     security: []
 *     parameters:
 *       - in: query
 *         name: uid
 *         required: false
 *         schema:
 *           type: string
 *         description: 사용자 id (서명 링크)
 *       - in: query
 *         name: sig
 *         required: false
 *         schema:
 *           type: string
 *         description: uid 서명 (서명 링크)
 *       - in: query
 *         name: email
 *         required: false
 *         deprecated: true
 *         schema:
 *           type: string
 *         description: 구독을 해제할 이메일 (기존 링크, 이전 기간 동안만 지원)
 *     responses:
 *       302:
 *         description: 'uid·sig 가 있으면 /newsletter/unsubscribe?uid=<uid>&sig=<sig>, 그 외에는 수신거부 시도 후 /main'
 *   post:
 *     tags:
 *       - User
 *     summary: 뉴스레터 수신거부 처리 (FE 확인 페이지 / RFC 8058 원클릭)
 *     description: |
 *       인증·쿠키 없이 URL 의 uid·sig 만으로 처리한다. body(List-Unsubscribe=One-Click 등)는 형식과 관계없이 읽지 않는다.
 *       리디렉션하지 않으며, 없는 사용자·이미 수신거부한 사용자도 200 으로 응답한다.
 *     security: []
 *     parameters:
 *       - in: query
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[1-9]\d{0,18}$'
 *         description: 사용자 id (앞자리 0 없는 십진수)
 *       - in: query
 *         name: sig
 *         required: true
 *         schema:
 *           type: string
 *         description: 메일 링크에 담긴 서명 (패딩 없는 base64url HMAC-SHA256)
 *     requestBody:
 *       required: false
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               List-Unsubscribe:
 *                 type: string
 *                 example: One-Click
 *     responses:
 *       '200':
 *         description: 수신거부 처리됨 (멱등)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmptyResponseDto'
 *       '400':
 *         description: uid 형식 오류 / 서명 없음·불일치
 */
router.get('/user/newsletter-unsubscribe', userController.unsubscribeNewsletter);
router.post(
  '/user/newsletter-unsubscribe',
  validateRequestDto(NewsletterUnsubscribeQueryDto, 'query'),
  userController.confirmUnsubscribeNewsletter,
);

export default router;
