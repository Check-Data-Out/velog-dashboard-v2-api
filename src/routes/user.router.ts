import express, { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { verifyBearerTokens } from '../middlewares/auth.middleware';
import { UserRepository } from '../reposities/user.repository';
import { UserService } from '../services/user.service';
import pool from '../configs/db.config';
const router: Router = express.Router();

const userRepository = new UserRepository(pool);
const userService = new UserService(userRepository);
const userController = new UserController(userService);

router.post('/velogApi', verifyBearerTokens, userController.velogApi);

export default router;
