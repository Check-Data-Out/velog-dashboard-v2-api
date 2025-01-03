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

router.post('/event', authMiddleware.verify, validateRequestDto(EventRequestDto, 'body'), trackingController.event);
router.post('/stay', authMiddleware.verify, validateRequestDto(StayTimeRequestDto, 'body'), trackingController.stay);

export default router;
