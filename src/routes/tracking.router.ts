import express, { Router } from 'express';
import pool from '../configs/db.config';
import dotenv from 'dotenv';
import { TrackingRepository } from '../repositories/tracking.repository';
import { TrackingService } from '../services/tracking.service';
import { TrackingController } from '../controllers/tracking.controller';
import { validateDto } from '../middlewares/validation.middleware';
import { EventRequestDto } from '../types/dto/event.dto';
import { authMiddleware } from 'src/middlewares/auth.middleware';

const router: Router = express.Router();
dotenv.config();

const trackingRepository = new TrackingRepository(pool);
const trackingService = new TrackingService(trackingRepository);
const trackingController = new TrackingController(trackingService);

router.post('/track', authMiddleware.verify, validateDto(EventRequestDto, 'body'), trackingController.track);

export default router;