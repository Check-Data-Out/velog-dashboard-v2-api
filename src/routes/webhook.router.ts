import express, { Router } from 'express';
import { WebhookController } from '@/controllers/webhook.controller';

const router: Router = express.Router();

// 컨트롤러 인스턴스 생성
const webhookController = new WebhookController();

/**
 * @swagger
 * /webhook/sentry:
 *   post:
 *     summary: Sentry webhook 처리
 *     description: Sentry에서 전송되는 webhook 이벤트를 처리하고 Slack으로 알림을 전송합니다.
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

export default router; 