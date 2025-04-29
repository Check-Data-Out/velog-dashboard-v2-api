import express, { Router } from 'express';
import UserRouter from './user.router';
import PostRouter from './post.router';
import NotiRouter from './noti.router';
import QrRouter from './qr.router';
import LeaderboardRouter from './leaderboard.router';

const router: Router = express.Router();

router.use('/ping', (req, res) => {
  res.send('pong');
});

router.use('/', UserRouter);
router.use('/', PostRouter);
router.use('/', NotiRouter);
router.use('/', QrRouter);
router.use('/', LeaderboardRouter);

export default router;
