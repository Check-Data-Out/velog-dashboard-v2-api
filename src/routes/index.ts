import express, { Router } from 'express';
import UserRouter from './user.router';
import TrackingRouter from './tracking.router';

const router: Router = express.Router();

router.use('/', UserRouter);
router.use('/', TrackingRouter);

export default router;
