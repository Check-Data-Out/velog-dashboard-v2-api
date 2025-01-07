import express, { Router } from 'express';
import pool from '@/configs/db.config';
import dotenv from 'dotenv';
import { TrackingRepository } from '@/repositories/tracking.repository';
import { TrackingService } from '@/services/tracking.service';
import { TrackingController } from '@/controllers/tracking.controller';
import { validateRequestDto } from '@/middlewares/validation.middleware';
import { EventRequestDto } from '@/types';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { StayTimeRequestDto } from '@/types';

const router: Router = express.Router();
dotenv.config();

const trackingRepository = new TrackingRepository(pool);
const trackingService = new TrackingService(trackingRepository);
const trackingController = new TrackingController(trackingService);

/**
 * @swagger
 * /event:
 *   post:
 *     tags:
 *       - Tracking
 *     summary: 사용자 이벤트 등록
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventRequestDto'
 *     responses:
 *       200:
 *         description: 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmptyResponseDto'
 */
router.post('/event', authMiddleware.verify, validateRequestDto(EventRequestDto, 'body'), trackingController.event);

/**
 * @swagger
 * /stay:
 *   post:
 *     tags:
 *       - Tracking
 *     summary: 사용자 이벤트 등록
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StayTimeRequestDto'
 *     responses:
 *       200:
 *         description: 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmptyResponseDto'
 */
router.post('/stay', authMiddleware.verify, validateRequestDto(StayTimeRequestDto, 'body'), trackingController.stay);

export default router;
