import express, { Router } from 'express';
import UserRouter from './user.router';
import PostRouter from './post.router';
import NotiRouter from './noti.router';
import LeaderboardRouter from './leaderboard.router';
import TotalStatsRouter from './totalStats.router';
import SvgRouter from './svg.router';
import WebhookRouter from './webhook.router';

const router: Router = express.Router();

router.use('/ping', (req, res) => {
  res.send('pong');
});

router.use('/', UserRouter);
router.use('/', PostRouter);
router.use('/', NotiRouter);
router.use('/', LeaderboardRouter);
router.use('/', TotalStatsRouter);
router.use('/', SvgRouter);
router.use('/', WebhookRouter);

export default router;
