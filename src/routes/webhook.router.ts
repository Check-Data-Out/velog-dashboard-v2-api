import express, { Router } from 'express';
import { WebhookController } from '@/controllers/webhook.controller';
import { SentryService } from '@/services/sentry.service';
import { SlackService } from '@/services/slack.service';

const router: Router = express.Router();

// 서비스 인스턴스 생성
const sentryService = new SentryService();
const slackService = new SlackService();

// 컨트롤러 인스턴스 생성
const webhookController = new WebhookController(slackService, sentryService);

/**
 * @swagger
 * /webhook/sentry:
 *   post:
 *     summary: Sentry webhook 처리
 *     description: Sentry에서 전송되는 webhook 이벤트를 처리합니다.
 *     tags: [Webhook]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 description: Sentry 액션 타입
 *                 enum: [created, resolved, unresolved, ignored]
 *               data:
 *                 type: object
 *                 properties:
 *                   issue:
 *                     type: object
 *                     description: Sentry 이슈 정보
 *               actor:
 *                 type: object
 *                 description: 액션을 수행한 사용자 정보
 *     responses:
 *       200:
 *         description: Webhook 처리 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Webhook 처리 완료"
 *       500:
 *         description: 서버 오류
 */
router.post('/webhook/sentry', webhookController.handleSentryWebhook);

/**
 * @swagger
 * /webhook/slack/interactive:
 *   post:
 *     summary: Slack Interactive Components 처리
 *     description: Slack에서 전송되는 버튼 클릭 등의 상호작용을 처리합니다.
 *     tags: [Webhook]
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
router.post('/webhook/slack/interactive', webhookController.handleSlackInteractive);

export default router; 