import express, { Router } from 'express';
import { SlackController } from '@/controllers/slack.controller';
import { SentryService } from '@/services/sentry.service';
import { SlackService } from '@/services/slack.service';

const router: Router = express.Router();

const slackService = new SlackService();
const sentryService = new SentryService();
const slackController = new SlackController(slackService, sentryService);

/**
 * @swagger
 * /slack/check-permissions:
 *   get:
 *     summary: Slack 권한 확인
 *     description: Slack Bot의 권한 상태를 확인합니다.
 *     tags: [Slack]
 *     responses:
 *       200:
 *         description: 권한 확인 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionCheckResponseDto'
 *       400:
 *         description: Bot Token 미설정
 *       500:
 *         description: 서버 오류
 */
router.get('/slack/check-permissions', slackController.checkPermissions);

/**
 * @swagger
 * /slack/test-bot:
 *   post:
 *     summary: 봇 테스트
 *     description: Slack Bot 테스트 메시지를 전송합니다.
 *     tags: [Slack]
 *     responses:
 *       200:
 *         description: 테스트 메시지 전송 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SlackSuccessResponseDto'
 *       400:
 *         description: Slack 연동 미설정
 *       500:
 *         description: 서버 오류
 */
router.post('/slack/test-bot', slackController.testBot);

/**
 * @swagger
 * /slack/interactive:
 *   post:
 *     summary: Slack Interactive Components 처리
 *     description: Slack에서 전송되는 버튼 클릭 등의 상호작용을 처리합니다.
 *     tags: [Slack]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               payload:
 *                 type: string
 *                 description: JSON 형태의 Slack payload (URL encoded)
 *     responses:
 *       200:
 *         description: 상호작용 처리 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 text:
 *                   type: string
 *                   example: "버튼 클릭 처리 완료"
 *                 response_type:
 *                   type: string
 *                   enum: [in_channel, ephemeral]
 *       400:
 *         description: 잘못된 요청
 */
router.post('/slack/interactive', slackController.handleInteractive);

export default router; 