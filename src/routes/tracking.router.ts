import express, { Router } from 'express';
import pool from '../configs/db.config';
import dotenv from 'dotenv';
import { TrackingRepository } from 'src/repositories/tracking.repository';
import { TrackingService } from 'src/services/tracking.service';
import { TrackingController } from 'src/controllers/tracking.controller';

const router: Router = express.Router();
dotenv.config();

const trackingRepository = new TrackingRepository(pool);
const trackingService = new TrackingService(trackingRepository);
const trackingController = new TrackingController(trackingService);

router.post('/track', trackingController.track);

export default router;
