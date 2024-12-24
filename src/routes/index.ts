import express, { Router } from 'express';
import UserRouter from './user.router';
import TrackingRouter from './tracking.router';
import PostRouter from './post.router';

const router: Router = express.Router();

router.use('/', UserRouter);
router.use('/', TrackingRouter);
router.use('/', PostRouter);
export default router;
