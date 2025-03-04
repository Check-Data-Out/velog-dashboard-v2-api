import express, { Router } from 'express';
import UserRouter from './user.router';
import TrackingRouter from './tracking.router';
import PostRouter from './post.router';
import NotiRouter from './noti.router';

const router: Router = express.Router();

router.use('/ping', (req, res) => {
  res.send('pong');
});

router.use('/', UserRouter);
router.use('/', TrackingRouter);
router.use('/', PostRouter);
router.use('/', NotiRouter);
export default router;
