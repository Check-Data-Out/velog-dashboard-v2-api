import express, { Router } from 'express';
import UserRouter from './user.router';
import TrackingRoutet from './tracking.router';

const router: Router = express.Router();

router.use('/', UserRouter);
router.use('/', TrackingRoutet);

export default router;
