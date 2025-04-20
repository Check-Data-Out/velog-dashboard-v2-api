import express, { Router } from 'express';
import UserRouter from './user.router';
import PostRouter from './post.router';
import NotiRouter from './noti.router';
import QrRouter from './qr.router';

const router: Router = express.Router();

router.use('/ping', (req, res) => {
  res.send('pong');
});

router.use('/', UserRouter);
router.use('/', PostRouter);
router.use('/', NotiRouter);
router.use('/', QrRouter);

export default router;
